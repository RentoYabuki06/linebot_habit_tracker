import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';

export async function handleGoalCommand(event, userId, text) {
    // `/goal <習慣名> <目標回数>` の形式にマッチ
    const match = text.match(/\/goal\s+([^\s]+)\s+(\d+)/);
    if (!match) {
        await reply(event.replyToken, '目標設定の形式が正しくありません。\n例: `/goal 腕立て 30`');
        return;
    }
    
    const habitName = match[1];
    const goalCount = parseInt(match[2], 10);
    
    // ユーザーの特定の習慣を取得
    const { data: habits, error: selectErr } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('name', habitName);
        
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
                name: habitName,
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
        await reply(event.replyToken, `🎯 「${habitName}」の目標を${goalCount}回に設定しました！\n\n記録は \`/done ${habitName} 実績/${goalCount}\` で行えます。`);
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
        
        await reply(event.replyToken, `🔄 「${habitName}」の目標を${goalCount}回に更新しました！`);
    }
}