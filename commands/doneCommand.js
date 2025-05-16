import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';
import { calculateStreak } from './streakCommand.js';

export async function handleDoneCommand(event, userId, text) {
    // `/done <習慣名> <実績>/<目標>` もしくは `/done <習慣名> <実績>` の形式にマッチ
    const matchWithGoal = text.match(/\/done\s+([^\s]+)\s+(\d+)\s*\/\s*(\d+)/);
    const matchOnlyActual = text.match(/\/done\s+([^\s]+)\s+(\d+)$/);
    
    let habitName, actual, goal;
    
    if (matchWithGoal) {
        // 目標も指定されている場合
        habitName = matchWithGoal[1];
        actual = parseInt(matchWithGoal[2], 10);
        goal = parseInt(matchWithGoal[3], 10);
    } else if (matchOnlyActual) {
        // 実績のみ指定されている場合
        habitName = matchOnlyActual[1];
        actual = parseInt(matchOnlyActual[2], 10);
        // goal は後でhabitsテーブルから取得
    } else {
        await reply(event.replyToken, '記録形式が正しくありません。\n例: `/done 腕立て 25` または `/done 腕立て 25/30`');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];

    // 習慣のIDと目標値を取得
    const { data: habits, error: habitErr } = await supabase
        .from('habits')
        .select('id, goal_count')
        .eq('user_id', userId)
        .eq('title', habitName);

    if (!habits || habits.length === 0) {
        await reply(event.replyToken, `「${habitName}」という習慣が登録されていません。\n\`/goal ${habitName} 目標回数\` で目標を設定してください。`);
        return;
    }

    const habitId = habits[0].id;
    
    // 目標値が指定されていない場合はhabitsテーブルから取得
    if (!goal) {
        goal = habits[0].goal_count;
        if (!goal) {
            await reply(event.replyToken, `「${habitName}」の目標が設定されていません。\n\`/change ${habitName} 目標回数\` で目標を設定してください。`);
            return;
        }
    }

    // logs に記録
    const { error: logErr } = await supabase.from('logs').insert({
        habit_id: habitId,
        user_id: userId,
        logged_at: today,
        actual_count: actual,
        goal_count: goal,
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