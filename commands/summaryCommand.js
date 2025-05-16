import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';

export async function handleSummaryCommand(event, userId) {
    // 過去7日間の記録を取得
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6); // 過去7日間（今日含む）
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const { data: logs, error } = await supabase
        .from('logs')
        .select('logged_at, actual_count')
        .eq('user_id', userId)
        .gte('logged_at', startDateStr)
        .lte('logged_at', endDateStr)
        .order('logged_at', { ascending: true });
        
    if (error) {
        console.error(error);
        await reply(event.replyToken, '記録の取得中にエラーが発生しました。');
        return;
    }
    
    if (!logs || logs.length === 0) {
        await reply(event.replyToken, '過去7日間の記録はありません。');
        return;
    }
    
    // 日付ごとの記録をまとめる
    const summary = logs.reduce((acc, log) => {
        const date = new Date(log.logged_at);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        acc[dateStr] = log.actual_count;
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
    let summaryText = `📊 直近7日間のサマリー：\n\n`;
    const total = logs.reduce((sum, log) => sum + log.actual_count, 0);
    
    dateLabels.forEach(dateStr => {
        const count = summary[dateStr] || 0;
        summaryText += `${dateStr}: ${count}回\n`;
    });
    
    summaryText += `\n合計: ${total}回`;
    
    await reply(event.replyToken, summaryText);
}