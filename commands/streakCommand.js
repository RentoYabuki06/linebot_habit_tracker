import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';

// streak計算関数を特定の習慣に対応
export async function calculateStreak(userId, habitName = null) {
    // 連続達成日数を取得
    const today = new Date().toISOString().split('T')[0];
    
    // habitNameが指定されている場合は特定の習慣、そうでなければすべての習慣
    let query = supabase
        .from('logs')
        .select('logged_at, habits!inner(id, name)')
        .eq('user_id', userId);
    
    // 特定の習慣名が指定されている場合、条件を追加
    if (habitName) {
        query = query.eq('habits.name', habitName);
    }
    
    const { data: logs, error } = await query
        .order('logged_at', { ascending: false });
        
    if (error) {
        console.error(error);
        return null;
    }
    
    if (!logs || logs.length === 0) {
        return { currentStreak: 0, maxStreak: 0, emoji: '' };
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
    
    return {
        currentStreak,
        maxStreak,
        emoji: streakEmoji
    };
}

// 元の関数はそのまま残す
export async function handleStreakCommand(event, userId, text) {
    // `/streak <習慣名>` の形式にマッチ
    const match = text.match(/\/streak\s+([^\s]+)/);
    
    // 習慣名が指定されていない場合はすべての習慣の連続記録を表示
    if (!match) {
        const { data: habits } = await supabase
            .from('habits')
            .select('name')
            .eq('user_id', userId);
            
        if (!habits || habits.length === 0) {
            await reply(event.replyToken, '習慣が登録されていません。');
            return;
        }
        
        // すべての習慣のstreakを取得
        let allStreaksMessage = '📊 あなたの習慣の連続記録:\n\n';
        
        for (const habit of habits) {
            const streakInfo = await calculateStreak(userId, habit.name);
            if (streakInfo) {
                allStreaksMessage += `${habit.name}: ${streakInfo.emoji} ${streakInfo.currentStreak}日\n`;
            } else {
                allStreaksMessage += `${habit.name}: 記録なし\n`;
            }
        }
        
        await reply(event.replyToken, allStreaksMessage);
        return;
    }
    
    const habitName = match[1];
    const streakInfo = await calculateStreak(userId, habitName);
    
    if (!streakInfo) {
        await reply(event.replyToken, `「${habitName}」という習慣が見つからないか、記録がありません。`);
        return;
    }
    
    await reply(event.replyToken, 
        `「${habitName}」の記録:\n` +
        `${streakInfo.emoji} 現在の連続記録日数: ${streakInfo.currentStreak}日 ${streakInfo.emoji}\n` +
        `🏆 最大連続記録日数: ${streakInfo.maxStreak}日！`
    );
}