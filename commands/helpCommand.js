import { reply } from '../utils.js';

export async function handleHelpCommand(event) {
    const helpMessage = `📋 使用可能なコマンド：
  
/done [回数]/[目標] - 習慣を記録する
例: /done 25/30
  
/goal [目標回数] - 目標を設定する
例: /goal 30
  
/summary - 過去7日間の記録を表示
  
/streak - 現在の継続日数を表示
  
/help - このヘルプを表示`;

    await reply(event.replyToken, helpMessage);
}