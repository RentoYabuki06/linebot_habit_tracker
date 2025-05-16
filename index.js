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
    handleGoalCommand
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
                if (event.type !== 'message' || !event.message.text) continue;

                const userId = event.source.userId;
                const text = event.message.text.trim();

                // コマンドの種類を判別
                if (text.startsWith('/done')) {
                    await handleDoneCommand(event, userId, text);
                } else if (text.startsWith('/help')) {
                    await handleHelpCommand(event);
                } else if (text.startsWith('/summary')) {
                    await handleSummaryCommand(event, userId);
                } else if (text.startsWith('/streak')) {
                    await handleStreakCommand(event, userId);
                } else if (text.startsWith('/goal')) {
                    await handleGoalCommand(event, userId, text);
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


