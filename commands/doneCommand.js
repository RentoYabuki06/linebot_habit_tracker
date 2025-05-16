import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';

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

    const percent = Math.round((actual / goal) * 100);
    await reply(event.replyToken, `✅ ${actual}/${goal} 回を記録しました！\n📊 達成率：${percent}%`);
}