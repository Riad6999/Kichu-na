// api/telegram-webhook.js
import fetch from 'node-fetch';

const TELEGRAM_API_BASE = (token) => `https://api.telegram.org/bot${token}`;

async function upstashSet(key, value) {
  const url = `${process.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`;
  await fetch(url, { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` } });
}

async function sendTelegramMessage(token, chatId, text) {
  try {
    await fetch(`${TELEGRAM_API_BASE(token)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode:'Markdown' })
    });
  } catch (e) { console.warn('tg send failed', e?.message); }
}

export default async function handler(req, res) {
  // Telegram sends POST JSON updates
  const body = await req.json().catch(()=> ({}));
  const msg = body.message || body.edited_message;
  if (!msg) return res.status(200).send('ok');

  const text = msg.text || '';
  const fromId = msg.from?.id;
  const chatId = msg.chat?.id;

  // Only accept commands from YOUR chat id
  if (String(fromId) !== String(process.env.TELEGRAM_CHAT_ID) && String(chatId) !== String(process.env.TELEGRAM_CHAT_ID)) {
    return res.status(200).send('ignored');
  }

  // handle /setpass newpass
  if (text.startsWith('/setpass')) {
    const parts = text.split(' ');
    if (parts.length < 2) {
      await sendTelegramMessage(process.env.TELEGRAM_BOT_TOKEN, chatId, 'Usage: /setpass your_new_password');
      return res.status(200).send('ok');
    }
    const newpass = parts.slice(1).join(' ').trim();
    // set it and clear used flag
    await upstashSet('one_time_pass', newpass);
    await upstashSet('one_time_pass_used', 'false');
    await upstashSet('one_time_pass_used_by', '');
    await sendTelegramMessage(process.env.TELEGRAM_BOT_TOKEN, chatId, `✅ One-time password updated to: \`${newpass}\`\nNote: it will work once until used.`);
    return res.status(200).send('ok');
  }

  if (text.startsWith('/getinfo')) {
    // fetch info and reply
    const used = await (async ()=>{
      const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/one_time_pass_used`, { headers:{ Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }});
      const j = await r.json(); return j.result;
    })();
    const usedBy = await (async ()=>{
      const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/one_time_pass_used_by`, { headers:{ Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }});
      const j = await r.json(); return j.result;
    })();
    await sendTelegramMessage(process.env.TELEGRAM_BOT_TOKEN, chatId, `Status:\nused: ${used}\nusedBy: ${usedBy || '-'}`);
    return res.status(200).send('ok');
  }

  // default reply
  await sendTelegramMessage(process.env.TELEGRAM_BOT_TOKEN, chatId, 'Command not recognized. Use /setpass or /getinfo');
  return res.status(200).send('ok');
                        }
