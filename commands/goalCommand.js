import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';

export async function handleGoalCommand(event, userId, text) {
    console.log(`🎯 goalコマンド実行: userId=${userId}, text=${text}`);
    
    // `/goal <習慣名> <目標回数>` の形式にマッチ
    const match = text.match(/\/goal\s+([^\s]+)\s+(\d+)/);
    if (!match) {
        await reply(event.replyToken, '目標設定の形式が正しくありません。\n例: `/goal 腕立て 30`');
        return;
    }
    
    const habitTitle = match[1]; // habitsテーブルのtitleカラムに合わせて変数名変更
    const goalCount = parseInt(match[2], 10);
    
    console.log(`習慣設定: title=${habitTitle}, goalCount=${goalCount}`);
    
    // ユーザーの特定の習慣を取得
    const { data: habits, error: selectErr } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('title', habitTitle); // nameではなくtitleカラムを参照
        
    if (selectErr) {
        console.error('習慣検索エラー:', selectErr);
        await reply(event.replyToken, '目標の設定中にエラーが発生しました。');
        return;
    }
    
    console.log(`取得した習慣: ${JSON.stringify(habits)}`);
    
    let habitId;
    
    try {
        if (!habits || habits.length === 0) {
            // 習慣が存在しない場合は新規作成
            console.log('新規習慣を作成します');
            
            const { data: newHabit, error: insertErr } = await supabase
                .from('habits')
                .insert({
                    user_id: userId,
                    title: habitTitle,   // nameではなくtitleカラムを使用
                    created_at: new Date().toISOString(), // created_atカラムを追加
					goal_count: goalCount // goal_countカラムを追加
                })
                .select();
                
            if (insertErr || !newHabit) {
                console.error('習慣作成エラー:', insertErr);
                await reply(event.replyToken, '習慣の作成中にエラーが発生しました。');
                return;
            }
            
            habitId = newHabit[0].id;
            console.log(`習慣作成成功: id=${habitId}`);
            
            // 初回のログも同時に作成
            const today = new Date().toISOString().split('T')[0];
            const { error: logErr } = await supabase
                .from('logs')
                .insert({
                    habit_id: habitId,
                    logged_at: today,
                    goal_count: goalCount,
                    actual_count: 0 // まだ実績は0
                });
                
            if (logErr) {
                console.error('初回ログ作成エラー:', logErr);
                // ログの作成に失敗しても習慣自体は作成されているので続行
            }
            
            await reply(event.replyToken, `🎯 「${habitTitle}」の目標を${goalCount}回に設定しました！\n\n記録は \`/done ${habitTitle} 実績/${goalCount}\` で行えます。`);
        } else {
            // 既存の習慣のログを更新
            habitId = habits[0].id;
            console.log(`既存の習慣を更新: id=${habitId}`);
            
            // 新しいログを追加
            const today = new Date().toISOString().split('T')[0];
            const { error: logErr } = await supabase
                .from('logs')
                .insert({
                    habit_id: habitId,
                    logged_at: today,
                    goal_count: goalCount,
                    actual_count: 0 // まだ実績は0
                });
                
            if (logErr) {
                console.error('ログ更新エラー:', logErr);
                await reply(event.replyToken, '目標の更新中にエラーが発生しました。');
                return;
            }
            
            await reply(event.replyToken, `🔄 「${habitTitle}」の目標を${goalCount}回に更新しました！`);
        }
    } catch (e) {
        console.error('goalコマンド実行エラー:', e);
        await reply(event.replyToken, 'コマンドの実行中にエラーが発生しました。');
    }
}

export default handleGoalCommand;