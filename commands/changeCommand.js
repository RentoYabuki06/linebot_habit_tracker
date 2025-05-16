import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';

export async function handleChangeCommand(event, userId, text) {
    console.log(`🔄 changeコマンド実行: userId=${userId}, text=${text}`);
    
    // `/change <習慣名> <新しい目標回数>` の形式にマッチ
    const match = text.match(/\/change\s+([^\s]+)\s+(\d+)/);
    if (!match) {
        await reply(event.replyToken, '目標変更の形式が正しくありません。\n例: `/change 腕立て 30`');
        return;
    }
    
    const habitTitle = match[1];
    const newGoalCount = parseInt(match[2], 10);
    
    console.log(`目標変更: title=${habitTitle}, newGoalCount=${newGoalCount}`);
    
    try {
        // 1. 習慣の存在確認
        const { data: habits, error: findError } = await supabase
            .from('habits')
            .select('id, title, goal_count')
            .eq('user_id', userId)
            .eq('title', habitTitle);
            
        if (findError) {
            console.error('習慣検索エラー:', findError);
            await reply(event.replyToken, '習慣の検索中にエラーが発生しました。');
            return;
        }
        
        if (!habits || habits.length === 0) {
            await reply(event.replyToken, `「${habitTitle}」という習慣は見つかりませんでした。\n/list で登録済みの習慣を確認できます。`);
            return;
        }
        
        const habitId = habits[0].id;
        const oldGoalCount = habits[0].goal_count;
        
        // 2. 習慣テーブルの目標値を更新
        const { error: updateError } = await supabase
            .from('habits')
            .update({ goal_count: newGoalCount })
            .eq('id', habitId);
            
        if (updateError) {
            console.error('目標更新エラー:', updateError);
            await reply(event.replyToken, '目標の更新中にエラーが発生しました。');
            return;
        }
        
        // 3. 今日のログにも新しい目標値を記録（今日のログがあれば）
        const today = new Date().toISOString().split('T')[0];
        
        // 今日のログを検索
        const { data: todayLogs } = await supabase
            .from('logs')
            .select('id')
            .eq('habit_id', habitId)
            .eq('logged_at', today);
            
        // 今日のログがなければ、新しい目標値だけのログを作成
        if (!todayLogs || todayLogs.length === 0) {
            await supabase.from('logs').insert({
                habit_id: habitId,
                user_id: userId,
                logged_at: today,
                goal_count: newGoalCount,
                actual_count: 0 // まだ実績はなし
            });
        } else {
            // 今日のログがあれば更新
            todayLogs.forEach(async (log) => {
                await supabase
                    .from('logs')
                    .update({ goal_count: newGoalCount })
                    .eq('id', log.id);
            });
        }
        
        await reply(event.replyToken, `✅ 「${habitTitle}」の目標を ${oldGoalCount || "未設定"} → ${newGoalCount} 回に変更しました！`);
    } catch (e) {
        console.error('changeコマンド実行エラー:', e);
        await reply(event.replyToken, 'コマンドの実行中にエラーが発生しました。');
    }
}

export default handleChangeCommand;