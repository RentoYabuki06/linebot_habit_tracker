import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';
import { calculateStreak } from './streakCommand.js';

export async function handleDoneCommand(event, userId, text) {
    // `/done <習慣名> <実績>/<目標>` の形式にマッチ
    const match = text.match(/\/done\s+([^\s]+)\s+(\d+)\s*\/\s*(\d+)/);
    if (!match) {
        await reply(event.replyToken, '記録形式が正しくありません。\n例: `/done 腕立て 25/30`');
        return;
    }

    const habitName = match[1];
    const actual = parseInt(match[2], 10);
    const goal = parseInt(match[3], 10);
    const today = new Date().toISOString().split('T')[0];

    // 習慣のIDを取得
    const { data: habits, error: habitErr } = await supabase
        .from('habits')
        .select('id, target_count')
        .eq('user_id', userId)
        .eq('name', habitName);

    if (!habits || habits.length === 0) {
        await reply(event.replyToken, `「${habitName}」という習慣が登録されていません。\n\`/goal ${habitName} 目標回数\` で目標を設定してください。`);
        return;
    }

    const habitId = habits[0].id;
    const targetCount = habits[0].target_count;

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

    // この特定の習慣のstreak情報を取得
    const streakInfo = await calculateStreak(userId, habitName);
    
    const percent = Math.round((actual / goal) * 100);
    let message = `✅ 「${habitName}」: ${actual}/${goal} 回を記録しました！\n📊 達成率：${percent}%`;
    
    if (streakInfo) {
        message += `\n\n${streakInfo.emoji} 連続記録: ${streakInfo.currentStreak}日`;
        
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