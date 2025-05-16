import axios from 'axios';

// LINEへの返信
export async function reply(token, message) {
    try {
        await axios.post(
            'https://api.line.me/v2/bot/message/reply',
            {
                replyToken: token,
                messages: [{ type: 'text', text: message }],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );
    } catch (err) {
        console.error('❌ LINE返信エラー:', err?.response?.data || err.message);
    }
}