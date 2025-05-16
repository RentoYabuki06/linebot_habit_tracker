import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';

export async function handleStreakCommand(event, userId) {
    // 連続達成日数を取得
    const today = new Date().toISOString().split('T')[0];
    
    const { data: logs, error } = await supabase
        .from('logs')
        .select('logged_at')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false });
        
    if (error) {
        console.error(error);
        await reply(event.replyToken, '記録の取得中にエラーが発生しました。');
        return;
    }
    
    if (!logs || logs.length === 0) {
        await reply(event.replyToken, '記録がありません。\n`/done` コマンドで記録を始めましょう！');
        return;
    }
    
    // 日付の配列に変換
    const dates = logs.map(log => log.logged_at);
    
    // 現在のストリークを計算
    let currentStreak = 0;
    let currentDate = new Date(today);
    
    // 今日の記録があるか確認
    const hasToday = dates.includes(today);
    if (hasToday) {
        currentStreak = 1;
    } else {
        // 今日の記録がない場合、昨日までのストリークを計算
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    // 連続日数を計算
    while (currentStreak < dates.length) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (dates.includes(dateStr)) {
            currentStreak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    // 最大連続日数を計算
    let maxStreak = 0;
    let tempStreak = 0;
    
    // 日付を昇順でソート
    const sortedDates = [...dates].sort();
    
    for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
            // 最初の記録
            tempStreak = 1;
        } else {
            // 前日との差を確認
            const currentDateObj = new Date(sortedDates[i]);
            const prevDateObj = new Date(sortedDates[i-1]);
            
            // 日付の差を計算（ミリ秒を日に変換）
            const diffDays = Math.round((currentDateObj - prevDateObj) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                // 連続している
                tempStreak++;
            } else {
                // 連続が途切れた
                maxStreak = Math.max(maxStreak, tempStreak);
                tempStreak = 1;
            }
        }
    }
    
    // 最後のストリークも確認
    maxStreak = Math.max(maxStreak, tempStreak);
    
    // 現在のストリークが最大ストリークを更新している場合
    maxStreak = Math.max(maxStreak, currentStreak);
    
    let streakEmoji = '';
    if (currentStreak >= 30) streakEmoji = '🔥🔥🔥';
    else if (currentStreak >= 14) streakEmoji = '🔥🔥';
    else if (currentStreak >= 7) streakEmoji = '🔥';
    else if (currentStreak >= 3) streakEmoji = '✨';
    
    await reply(event.replyToken, 
        `${streakEmoji} 現在の連続記録日数: ${currentStreak}日 ${streakEmoji}\n` +
        `🏆 最大連続記録日数: ${maxStreak}日！`
    );
}