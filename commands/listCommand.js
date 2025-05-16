import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';
import { calculateStreak } from './streakCommand.js'; // streakの計算関数をインポート

export async function handleListCommand(event, userId) {
    const { data: habits, error } = await supabase
        .from('habits')
        .select('id, title, goal_count')
        .eq('user_id', userId);
        
    if (error) {
        console.error(error);
        await reply(event.replyToken, '習慣の取得中にエラーが発生しました。');
        return;
    }
    
    if (!habits || habits.length === 0) {
        await reply(event.replyToken, '登録されている習慣はありません。\n`/goal <習慣名> <目標回数>` で新しい習慣を登録できます。');
        return;
    }
    
    let message = '📋 あなたの習慣一覧:\n\n';
    
    // 各習慣の連続記録情報を取得
    for (const habit of habits) {
        // 習慣ごとの連続記録を計算
        const streakInfo = await calculateStreak(userId, habit.title);
        
        let streakDisplay = '';
        if (streakInfo && streakInfo.currentStreak > 0) {
            streakDisplay = `${streakInfo.emoji} ${streakInfo.currentStreak}日継続中`;
        } else {
            streakDisplay = '記録なし';
        }
        
        message += `• ${habit.title}: 目標${habit.goal_count}回 - ${streakDisplay}\n`;
    }
    
    message += '\n特定の習慣を記録するには: `/done <習慣名> <実績>/<目標>`';
    
    await reply(event.replyToken, message);
}

export default handleListCommand;