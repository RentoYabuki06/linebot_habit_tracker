import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';
import { calculateStreak } from './streakCommand.js';

export async function handleListCommand(event, userId) {
    console.log(`📋 listコマンド実行: userId=${userId}`);
    
    try {
        // 習慣一覧をgoal_countも含めて取得
        const { data: habits, error } = await supabase
            .from('habits')
            .select('id, title, goal_count')
            .eq('user_id', userId);
            
        if (error) {
            console.error('習慣取得エラー:', error);
            await reply(event.replyToken, '習慣の取得中にエラーが発生しました。');
            return;
        }
        
        console.log(`取得した習慣: ${JSON.stringify(habits)}`);
        
        if (!habits || habits.length === 0) {
            console.log('習慣が見つかりません');
            await reply(event.replyToken, '登録されている習慣はありません。\n`/goal <習慣名> <目標回数>` で新しい習慣を登録できます。');
            return;
        }
        
        let message = '📋 あなたの習慣一覧:\n\n';
        
        // 各習慣の連続記録情報を取得
        for (const habit of habits) {
            try {
                // 習慣ごとの連続記録を計算
                const streakInfo = await calculateStreak(userId, habit.title);
                
                let streakDisplay = '';
                if (streakInfo && streakInfo.currentStreak > 0) {
                    streakDisplay = `${streakInfo.emoji} ${streakInfo.currentStreak}日継続中`;
                } else {
                    streakDisplay = '記録なし';
                }
                
                // habitsテーブルのgoal_countを使用
                const goalCount = habit.goal_count || "未設定";
                message += `• ${habit.title}: 目標${goalCount}回 - ${streakDisplay}\n`;
            } catch (streakError) {
                console.error(`Streak計算エラー (${habit.title}):`, streakError);
                message += `• ${habit.title}: 目標${habit.goal_count || "未設定"}回\n`;
            }
        }
        
        message += '\n特定の習慣を記録するには: `/done <習慣名> <実績>/<目標>`';
        message += '\n目標を変更するには: `/change <習慣名> <新しい目標回数>`';
        
        console.log('送信メッセージ:', message);
        await reply(event.replyToken, message);
    } catch (e) {
        console.error('listコマンド実行エラー:', e);
        await reply(event.replyToken, 'コマンドの実行中にエラーが発生しました。');
    }
}

export default handleListCommand;