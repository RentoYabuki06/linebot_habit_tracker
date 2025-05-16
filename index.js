// index.js
import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { supabase } from './supabaseClient.js';

const app = express();
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

// Webhookエンドポイント
app.post('/webhook', async (req, res) => {
	console.log("🔐 CHANNEL_SECRET:", process.env.LINE_CHANNEL_SECRET);
	if (!validateSignature(req)) {
		console.warn("Invalid signature");
		return res.status(403).send('Invalid signature');
	}
	res.status(200).send('OK');
	console.log('📩 Webhook received:', JSON.stringify(req.body, null, 2));
	console.log("👤 userId:", req.body.events[0]?.source?.userId);
	// avoid timeout

	// (async () => {
	// 	try {
	// 		const events = req.body.events;
	// 		for (const event of events) {
	// 			if (event.type !== 'message' || !event.message.text) continue;

	// 			const userId = event.source.userId;
	// 			const text = event.message.text.trim();

	// 			// `/done 25/30` の形式にマッチ
	// 			const match = text.match(/\/done\s+(\d+)\s*\/\s*(\d+)/);
	// 			if (!match) {
	// 				await reply(event.replyToken, '記録形式が正しくありません。\n例: `/done 25/30`');
	// 				continue;
	// 			}

	// 			const actual = parseInt(match[1], 10);
	// 			const goal = parseInt(match[2], 10);
	// 			const today = new Date().toISOString().split('T')[0];

	// 			// 習慣のIDを取得（1人1習慣想定）
	// 			const { data: habits, error: habitErr } = await supabase
	// 				.from('habits')
	// 				.select('id')
	// 				.eq('user_id', userId)
	// 				.limit(1);

	// 			if (!habits || habits.length === 0) {
	// 				await reply(event.replyToken, '習慣が登録されていません。');
	// 				continue;
	// 			}

	// 			const habitId = habits[0].id;

	// 			// logs に記録
	// 			const { error: logErr } = await supabase.from('logs').insert({
	// 				habit_id: habitId,
	// 				user_id: userId,
	// 				logged_at: today,
	// 				actual_count: actual,
	// 				note: null,
	// 			});

	// 			if (logErr) {
	// 				console.error(logErr);
	// 				await reply(event.replyToken, '記録中にエラーが発生しました。');
	// 				continue;
	// 			}

	// 			const percent = Math.round((actual / goal) * 100);
	// 			await reply(event.replyToken, `✅ ${actual}/${goal} 回を記録しました！\n📊 達成率：${percent}%`);
	// 		}
	// 	} catch (e) {
	// 		console.error('Webhook Error:', e);
	// 	}
	// })();
});

// // LINEへの返信
// async function reply(token, message) {
// 	try {
// 		await axios.post(
// 			'https://api.line.me/v2/bot/message/reply',
// 			{
// 				replyToken: token,
// 				messages: [{ type: 'text', text: message }],
// 			},
// 			{
// 				headers: {
// 					Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
// 					'Content-Type': 'application/json',
// 				},
// 			}
// 		);
// 	} catch (err) {
// 		console.error('❌ LINE返信エラー:', err?.response?.data || err.message);
// 	}
// }


// 🚀 サーバー起動（Railway対応）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`✅ Server is running on port ${PORT}`);
});
