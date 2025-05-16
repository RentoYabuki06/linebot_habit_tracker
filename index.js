// index.js
import axios from 'axios';
import crypto from 'crypto';
import { supabase } from './supabaseClient.js';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 8080;

console.log(`🔍 実行確認: このコードは最新？ PORT=${PORT}`);


app.use(express.json());

// LINE署名検証
function validateSignature(req) {
	const signature = req.headers['x-line-signature'];
	const body = JSON.stringify(req.body);
	const hash = crypto
		.createHmac('SHA256', process.env.LINE_CHANNEL_SECRET)
		.update(body)
		.digest('base64');
	return signature === hash;
}

process.on('unhandledRejection', (reason, promise) => {
	console.error('❌ Unhandled Rejection:', reason);
});


// Webhookエンドポイント
app.post('/webhook', async (req, res) => {
    console.log("🔐 CHANNEL_SECRET:", process.env.LINE_CHANNEL_SECRET);
    if (!validateSignature(req)) {
        console.warn("Invalid signature");
        return res.status(403).send('Invalid signature');
    }
    console.log("webhook received");
    res.status(200).send('OK');
    console.log('📩 Webhook received:', JSON.stringify(req.body, null, 2));
    console.log("👤 userId:", req.body.events[0]?.source?.userId);
    // avoid timeout

    (async () => {
        try {
            const events = req.body.events;
            for (const event of events) {
                if (event.type !== 'message' || !event.message.text) continue;

                const userId = event.source.userId;
                const text = event.message.text.trim();

                // コマンドの種類を判別
                if (text.startsWith('/done')) {
                    await handleDoneCommand(event, userId, text);
                } else if (text.startsWith('/help')) {
                    await handleHelpCommand(event);
                } else if (text.startsWith('/summary')) {
                    await handleSummaryCommand(event, userId);
                } else if (text.startsWith('/streak')) {
                    await handleStreakCommand(event, userId);
                } else if (text.startsWith('/goal')) {
                    await handleGoalCommand(event, userId, text);
                } else {
                    await reply(event.replyToken, '未知のコマンドです。\n`/help` で使い方を確認できます。');
                }
            }
        } catch (e) {
            console.error('Webhook Error:', e);
        }
    })();
});

// /done コマンドの処理
async function handleDoneCommand(event, userId, text) {
    // `/done 25/30` の形式にマッチ
    const match = text.match(/\/done\s+(\d+)\s*\/\s*(\d+)/);
    if (!match) {
        await reply(event.replyToken, '記録形式が正しくありません。\n例: `/done 25/30`');
        return;
    }

    const actual = parseInt(match[1], 10);
    const goal = parseInt(match[2], 10);
    const today = new Date().toISOString().split('T')[0];

    // 習慣のIDを取得（1人1習慣想定）
    const { data: habits, error: habitErr } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

    if (!habits || habits.length === 0) {
        await reply(event.replyToken, '習慣が登録されていません。\n`/goal` で目標を設定してください。');
        return;
    }

    const habitId = habits[0].id;

    // logs に記録
    const { error: logErr } = await supabase.from('logs').insert({
        habit_id: habitId,
        user_id: userId,
        logged_at: today,
        actual_count: actual,
        note: null,
    });

    if (logErr) {
        console.error(logErr);
        await reply(event.replyToken, '記録中にエラーが発生しました。');
        return;
    }

    const percent = Math.round((actual / goal) * 100);
    await reply(event.replyToken, `✅ ${actual}/${goal} 回を記録しました！\n📊 達成率：${percent}%`);
}

// /help コマンドの処理
async function handleHelpCommand(event) {
    const helpMessage = `📋 使用可能なコマンド：
  
/done [回数]/[目標] - 習慣を記録する
例: /done 25/30
  
/goal [目標回数] - 目標を設定する
例: /goal 30
  
/summary - 過去7日間の記録を表示
  
/streak - 現在の継続日数を表示
  
/help - このヘルプを表示`;

    await reply(event.replyToken, helpMessage);
}

// /summary コマンドの処理
async function handleSummaryCommand(event, userId) {
    // 過去7日間の記録を取得
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6); // 過去7日間（今日含む）
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const { data: logs, error } = await supabase
        .from('logs')
        .select('logged_at, actual_count')
        .eq('user_id', userId)
        .gte('logged_at', startDateStr)
        .lte('logged_at', endDateStr)
        .order('logged_at', { ascending: true });
        
    if (error) {
        console.error(error);
        await reply(event.replyToken, '記録の取得中にエラーが発生しました。');
        return;
    }
    
    if (!logs || logs.length === 0) {
        await reply(event.replyToken, '過去7日間の記録はありません。');
        return;
    }
    
    // 日付ごとの記録をまとめる
    const summary = logs.reduce((acc, log) => {
        const date = new Date(log.logged_at);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        acc[dateStr] = log.actual_count;
        return acc;
    }, {});
    
    // 7日間分の日付を生成
    const dateLabels = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        dateLabels.push(dateStr);
    }
    
    // レポート作成
    let summaryText = `📊 直近7日間のサマリー：\n\n`;
    const total = logs.reduce((sum, log) => sum + log.actual_count, 0);
    
    dateLabels.forEach(dateStr => {
        const count = summary[dateStr] || 0;
        summaryText += `${dateStr}: ${count}回\n`;
    });
    
    summaryText += `\n合計: ${total}回`;
    
    await reply(event.replyToken, summaryText);
}

// /streak コマンドの処理
async function handleStreakCommand(event, userId) {
    // 連続達成日数を取得
    const today = new Date().toISOString().split('T')[0];
    
    const { data: logs, error } = await supabase
        .from('logs')
        .select('logged_at')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false });
        
    if (error) {
        console.error(error);
        await reply(event.replyToken, '記録の取得中にエラーが発生しました。');
        return;
    }
    
    if (!logs || logs.length === 0) {
        await reply(event.replyToken, '記録がありません。\n`/done` コマンドで記録を始めましょう！');
        return;
    }
    
    // 日付の配列に変換してストリークを計算
    const dates = logs.map(log => log.logged_at);
    let streak = 0;
    let currentDate = new Date(today);
    
    // 今日の記録があるか確認
    const hasToday = dates.includes(today);
    if (hasToday) {
        streak = 1;
    } else {
        // 今日の記録がない場合、昨日までのストリークを計算
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    // 連続日数を計算
    while (streak < dates.length) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (dates.includes(dateStr)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    let streakEmoji = '';
    if (streak >= 30) streakEmoji = '🔥🔥🔥';
    else if (streak >= 14) streakEmoji = '🔥🔥';
    else if (streak >= 7) streakEmoji = '🔥';
    else if (streak >= 3) streakEmoji = '✨';
    
    await reply(event.replyToken, `${streakEmoji} 現在の連続記録日数: ${streak}日 ${streakEmoji}`);
}

// /goal コマンドの処理
async function handleGoalCommand(event, userId, text) {
    // `/goal 30` の形式にマッチ
    const match = text.match(/\/goal\s+(\d+)/);
    if (!match) {
        await reply(event.replyToken, '目標設定の形式が正しくありません。\n例: `/goal 30`');
        return;
    }
    
    const goalCount = parseInt(match[1], 10);
    
    // ユーザーの習慣を取得
    const { data: habits, error: selectErr } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId);
        
    if (selectErr) {
        console.error(selectErr);
        await reply(event.replyToken, '目標の設定中にエラーが発生しました。');
        return;
    }
    
    let habitId;
    
    if (!habits || habits.length === 0) {
        // 習慣が存在しない場合は新規作成
        const { data: newHabit, error: insertErr } = await supabase
            .from('habits')
            .insert({
                user_id: userId,
                name: 'マイ習慣',
                target_count: goalCount,
                frequency: 'daily'
            })
            .select();
            
        if (insertErr || !newHabit) {
            console.error(insertErr);
            await reply(event.replyToken, '習慣の作成中にエラーが発生しました。');
            return;
        }
        
        habitId = newHabit[0].id;
    } else {
        // 既存の習慣を更新
        habitId = habits[0].id;
        const { error: updateErr } = await supabase
            .from('habits')
            .update({ target_count: goalCount })
            .eq('id', habitId);
            
        if (updateErr) {
            console.error(updateErr);
            await reply(event.replyToken, '目標の更新中にエラーが発生しました。');
            return;
        }
    }
    
    await reply(event.replyToken, `🎯 目標を${goalCount}回に設定しました！\n\n記録は \`/done 実績/目標\` で行えます。\n例: \`/done 20/${goalCount}\``);
}

app.get('/ping', (req, res) => {
	console.log('🔁 Ping received at', new Date().toISOString());
	res.status(200).send('pong');
});

// 🚀 サーバー起動（Railway対応）
app.listen(PORT, () => {
	console.log(`✅ Server is running on port ${PORT}`);
	console.log('📡 Environment:', {
		LINE_CHANNEL_SECRET: !!process.env.LINE_CHANNEL_SECRET,
		SUPABASE_URL: process.env.SUPABASE_URL,
	});
});


