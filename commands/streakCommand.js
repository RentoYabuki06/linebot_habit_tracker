import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';

// streak計算関数を特定の習慣に対応
export async function calculateStreak(userId, habitName = null) {
    console.log(`🔍 Streak計算開始: userId=${userId}, habitName=${habitName}`);
    
    // 連続達成日数を取得
    const today = new Date().toISOString().split('T')[0];
    
    // まず、対象の習慣を取得
    let habitsQuery = supabase
        .from('habits')
        .select('id, title')
        .eq('user_id', userId);
    
    if (habitName) {
        habitsQuery = habitsQuery.eq('title', habitName);
    }
    
    const { data: habits, error: habitsError } = await habitsQuery;
    
    if (habitsError) {
        console.error('Habits取得エラー:', habitsError);
        return null;
    }
    
    if (!habits || habits.length === 0) {
        console.log('習慣が見つかりません');
        return { currentStreak: 0, maxStreak: 0, emoji: '' };
    }
    
    // 指定された習慣のIDを取得
    const habitId = habitName ? habits[0].id : habits.map(h => h.id);
    
    // 対象の習慣のログを取得
    let logsQuery = supabase.from('logs').select('*');
    
    if (Array.isArray(habitId)) {
        // 複数の習慣ID
        logsQuery = logsQuery.in('habit_id', habitId);
    } else {
        // 単一の習慣ID
        logsQuery = logsQuery.eq('habit_id', habitId);
    }
    
    const { data: logs, error: logsError } = await logsQuery
        .order('logged_at', { ascending: false });
    
    if (logsError) {
        console.error('Logs取得エラー:', logsError);
        return null;
    }
    
    if (!logs || logs.length === 0) {
        console.log('ログが見つかりません');
        return { currentStreak: 0, maxStreak: 0, emoji: '' };
    }
    
    console.log(`📊 取得したログ: ${logs.length}件`);
    
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
    
    console.log(`🏆 計算結果: currentStreak=${currentStreak}, maxStreak=${maxStreak}`);
    
    return {
        currentStreak,
        maxStreak,
        emoji: streakEmoji
    };
}

// 元の関数はそのまま残す
export async function handleStreakCommand(event, userId, text) {
    // `/streak <習慣名>` の形式にマッチ
    const match = text?.match(/\/streak\s+([^\s]+)/);
    
    // 習慣名が指定されていない場合はすべての習慣の連続記録を表示
    if (!match) {
        const { data: habits } = await supabase
            .from('habits')
            .select('title')
            .eq('user_id', userId);
            
        if (!habits || habits.length === 0) {
            await reply(event.replyToken, '習慣が登録されていません。');
            return;
        }
        
        // すべての習慣のstreakを取得
        let allStreaksMessage = '📊 あなたの習慣の連続記録:\n\n';
        
        for (const habit of habits) {
            const streakInfo = await calculateStreak(userId, habit.title);
            if (streakInfo) {
                allStreaksMessage += `${habit.title}: ${streakInfo.emoji} ${streakInfo.currentStreak}日\n`;
            } else {
                allStreaksMessage += `${habit.title}: 記録なし\n`;
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