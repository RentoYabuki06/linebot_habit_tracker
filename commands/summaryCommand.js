import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';

export async function handleSummaryCommand(event, userId, text) {
    // `/summary <習慣名>` の形式にマッチ
    const match = text?.match(/\/summary\s+([^\s]+)/);
    let habitTitle = null;
    
    if (match) {
        habitTitle = match[1];
        console.log(`特定の習慣のサマリー表示: ${habitTitle}`);
    }
    
    // 習慣の確認・取得
    let habitsQuery = supabase
        .from('habits')
        .select('id, title')
        .eq('user_id', userId);
    
    if (habitTitle) {
        habitsQuery = habitsQuery.eq('title', habitTitle);
    }
    
    const { data: habits, error: habitsError } = await habitsQuery;
    
    if (habitsError) {
        console.error('習慣取得エラー:', habitsError);
        await reply(event.replyToken, '習慣の取得中にエラーが発生しました。');
        return;
    }
    
    if (!habits || habits.length === 0) {
        if (habitTitle) {
            await reply(event.replyToken, `「${habitTitle}」という習慣は見つかりませんでした。`);
        } else {
            await reply(event.replyToken, '習慣が登録されていません。');
        }
        return;
    }
    
    // 習慣が1つだけ指定された場合は単一の習慣のサマリーを表示
    if (habitTitle || habits.length === 1) {
        const habit = habitTitle ? habits[0] : habits[0];
        await showSingleHabitSummary(event, userId, habit);
    } else {
        // 複数の習慣がある場合は、習慣を選択するよう促す
        let message = '📊 どの習慣のサマリーを表示しますか？\n\n';
        habits.forEach(habit => {
            message += `・${habit.title} → /summary ${habit.title}\n`;
        });
        message += '\n全ての習慣のサマリーを表示するには: /summary all';
        
        await reply(event.replyToken, message);
    }
}

// 単一の習慣のサマリーを表示する関数
async function showSingleHabitSummary(event, userId, habit) {
    const habitId = habit.id;
    const habitTitle = habit.title;
    
    // 過去7日間の記録を取得
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6); // 過去7日間（今日含む）
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const { data: logs, error } = await supabase
        .from('logs')
        .select('logged_at, actual_count, goal_count')
        .eq('habit_id', habitId)
        .gte('logged_at', startDateStr)
        .lte('logged_at', endDateStr)
        .order('logged_at', { ascending: true });
        
    if (error) {
        console.error('ログ取得エラー:', error);
        await reply(event.replyToken, '記録の取得中にエラーが発生しました。');
        return;
    }
    
    if (!logs || logs.length === 0) {
        await reply(event.replyToken, `「${habitTitle}」の過去7日間の記録はありません。`);
        return;
    }
    
    // 日付ごとの記録をまとめる
    const summary = logs.reduce((acc, log) => {
        const date = new Date(log.logged_at);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        
        if (!acc[dateStr]) {
            acc[dateStr] = {
                actual: log.actual_count,
                goal: log.goal_count
            };
        } else {
            // 同じ日に複数のログがある場合は合計する
            acc[dateStr].actual += log.actual_count;
        }
        
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
    let summaryText = `📊 「${habitTitle}」の直近7日間のサマリー：\n\n`;
    const total = logs.reduce((sum, log) => sum + log.actual_count, 0);
    const totalGoal = logs.reduce((sum, log) => sum + (log.goal_count || 0), 0);
    let totalPct = 0;
    
    if (totalGoal > 0) {
        totalPct = Math.round((total / totalGoal) * 100);
    }
    
    // 日付ごとの記録を表示
    dateLabels.forEach(dateStr => {
        if (summary[dateStr]) {
            const { actual, goal } = summary[dateStr];
            if (goal) {
                const pct = Math.round((actual / goal) * 100);
                summaryText += `${dateStr}: ${actual}/${goal} (${pct}%)\n`;
            } else {
                summaryText += `${dateStr}: ${actual}回\n`;
            }
        } else {
            summaryText += `${dateStr}: -\n`;
        }
    });
    
    // 合計を表示
    if (totalGoal > 0) {
        summaryText += `\n合計: ${total}/${totalGoal} (${totalPct}%)`;
    } else {
        summaryText += `\n合計: ${total}回`;
    }
    
    await reply(event.replyToken, summaryText);
}

export default handleSummaryCommand;