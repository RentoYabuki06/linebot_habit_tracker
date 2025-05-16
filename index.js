// index.js
import axios from 'axios';
import crypto from 'crypto';
import { supabase } from './supabaseClient.js';
import express from 'express';
import {
    handleDoneCommand,
    handleHelpCommand,
    handleSummaryCommand,
    handleStreakCommand,
    handleGoalCommand,
    handleListCommand,
    handleDeleteCommand,
    handleChangeCommand
} from './commands/index.js';
import { reply } from './utils.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// LINE署名検証
function validateSignature(req) {
	const signature = req.headers['x-line-signature'];
	const body = JSON.stringify(req.body);
	const hash = crypto
		.createHmac('SHA256', process.env.LINE_CHANNEL_SECRET)
		.update(body)
		.digest('base64');
	return signature === hash;
}

process.on('unhandledRejection', (reason, promise) => {
	console.error('❌ Unhandled Rejection:', reason);
});


// Webhookエンドポイント
app.post('/webhook', async (req, res) => {
    console.log("🔐 CHANNEL_SECRET:", process.env.LINE_CHANNEL_SECRET);
    if (!validateSignature(req)) {
        console.warn("Invalid signature");
        return res.status(403).send('Invalid signature');
    }
    console.log("webhook received");
    res.status(200).send('OK');

    (async () => {
        try {
            const events = req.body.events;
            for (const event of events) {
                // グループ・ルームへの参加イベント処理
                if (event.type === 'join') {
                  console.log('🎉 参加イベント検知:', event.source.type);
                  try {
                    await reply(event.replyToken, 'こんにちは！このグループで習慣を記録できます。まずは `/help` を送ってみてください📘');
                  } catch (err) {
                    console.error('❌ LINE返信エラー（join時）:', err?.response?.data || err.message);
                  }
                  continue;
                }

                
                // 友達追加イベント処理
                if (event.type === 'follow') {
                    console.log("👋 友達追加イベント検知");
                    const message = "友達追加ありがとうございます！\n\n" +
                                    "私は習慣記録Botです。毎日の習慣を簡単に記録して、継続をサポートします。\n\n" +
                                    "まずは `/goal 習慣名 目標回数` で目標を設定してみましょう。\n" +
                                    "例: `/goal 腕立て 30`\n\n" +
                                    "使い方の詳細は `/help` で確認できます。";
                    await reply(event.replyToken, message);
                    continue;
                }

                // メッセージイベント処理（既存コード）
                if (event.type !== 'message' || !event.message.text) continue;

                const userId = event.source.userId;
                const text = event.message.text.trim();

                // コマンドの種類を判別
                if (text.startsWith('/done')) {
                    await handleDoneCommand(event, userId, text);
                } else if (text.startsWith('/help')) {
                    await handleHelpCommand(event);
                } else if (text.startsWith('/list')) {
                    await handleListCommand(event, userId);
                } else if (text.startsWith('/summary')) {
                    await handleSummaryCommand(event, userId, text);
                } else if (text.startsWith('/streak')) {
                    await handleStreakCommand(event, userId, text);
                } else if (text.startsWith('/goal')) {
                    await handleGoalCommand(event, userId, text);
                } else if (text.startsWith('/delete')) {
                    await handleDeleteCommand(event, userId, text);
                } else if (text.startsWith('/change')) {
                    await handleChangeCommand(event, userId, text);
                } else {
                    await reply(event.replyToken, '未知のコマンドです。\n`/help` で使い方を確認できます。');
                }
            }
        } catch (e) {
            console.error('Webhook Error:', e);
        }
    })();
});

// Pingエンドポイント
app.get('/ping', (req, res) => {
	console.log('🔁 Ping received at', new Date().toISOString());
	res.status(200).send('pong');
});

// 🚀 サーバー起動（Railway対応）
app.listen(PORT, () => {
	console.log(`✅ Server is running on port ${PORT}`);
	console.log('📡 Environment:', {
		LINE_CHANNEL_SECRET: !!process.env.LINE_CHANNEL_SECRET,
		SUPABASE_URL: process.env.SUPABASE_URL,
	});
});


