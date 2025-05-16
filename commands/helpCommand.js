import { reply } from '../utils.js';

export async function handleHelpCommand(event) {
    const helpMessage = `📋 使用可能なコマンド：
  
/goal <習慣名> <目標回数> - 新しい習慣と目標を設定
例: /goal 腕立て 30
  
/done <習慣名> <回数>/<目標> - 習慣を記録する
例: /done 腕立て 25/30
  
/list - 登録されている習慣の一覧を表示
  
/summary <習慣名> - 過去7日間の記録を表示
例: /summary 腕立て
  
/streak <習慣名> - 連続記録日数を表示
例: /streak 腕立て
  
/delete <習慣名> - 習慣を削除する
例: /delete 腕立て
  
/help - このヘルプを表示`;

    await reply(event.replyToken, helpMessage);
}