import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';
import { calculateStreak } from './streakCommand.js'; // calculateStreak をインポート

export async function handleDoneCommand(event, userId, text) {
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

    // streak情報を取得
    const streakInfo = await calculateStreak(userId);
    
    const percent = Math.round((actual / goal) * 100);
    let message = `✅ ${actual}/${goal} 回を記録しました！\n📊 達成率：${percent}%`;
    
    // streakInfo が取得できていれば追加
    if (streakInfo) {
        message += `\n\n${streakInfo.emoji} 連続記録: ${streakInfo.currentStreak}日`;
        
        // 連続日数が特定のマイルストーンに到達した場合、特別なメッセージを追加
        if (streakInfo.currentStreak === 7) {
            message += `\n🎉 1週間継続達成！素晴らしい！`;
        } else if (streakInfo.currentStreak === 30) {
            message += `\n🏆 30日継続達成！習慣化成功です！`;
        } else if (streakInfo.currentStreak === 100) {
            message += `\n🌟 100日継続達成！信じられない記録です！`;
        }
    }
    
    await reply(event.replyToken, message);
}