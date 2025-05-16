import { supabase } from '../supabaseClient.js';
import { reply } from '../utils.js';

export async function handleDeleteCommand(event, userId, text) {
    console.log(`🗑️ deleteコマンド実行: userId=${userId}, text=${text}`);
    
    // `/delete <習慣名>` の形式にマッチ
    const match = text.match(/\/delete\s+([^\s]+)/);
    if (!match) {
        await reply(event.replyToken, '削除形式が正しくありません。\n例: `/delete 腕立て`');
        return;
    }

    const habitTitle = match[1];
    
    try {
        // 1. 習慣の存在確認
        const { data: habits, error: findError } = await supabase
            .from('habits')
            .select('id, title')
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
        
        // 2. 関連するログも全て削除（外部キー制約がある場合）
        const { error: deleteLogsError } = await supabase
            .from('logs')
            .delete()
            .eq('habit_id', habitId);
            
        if (deleteLogsError) {
            console.error('ログ削除エラー:', deleteLogsError);
            await reply(event.replyToken, 'ログの削除中にエラーが発生しました。');
            return;
        }
        
        // 3. 習慣を削除
        const { error: deleteHabitError } = await supabase
            .from('habits')
            .delete()
            .eq('id', habitId);
            
        if (deleteHabitError) {
            console.error('習慣削除エラー:', deleteHabitError);
            await reply(event.replyToken, '習慣の削除中にエラーが発生しました。');
            return;
        }
        
        await reply(event.replyToken, `✅ 「${habitTitle}」を削除しました。`);
    } catch (e) {
        console.error('削除コマンド実行エラー:', e);
        await reply(event.replyToken, 'コマンド実行中にエラーが発生しました。');
    }
}

export default handleDeleteCommand;