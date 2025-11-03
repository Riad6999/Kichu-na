// api/validate-pass.js
import fetch from 'node-fetch';

const TELEGRAM_API_BASE = (token) => `https://api.telegram.org/bot${token}`;

function getIp(req) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0]
    || req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown';
}

async function sendTelegramMessage(token, chatId, text) {
  if (!token || !chatId) return;
  try {
    await fetch(`${TELEGRAM_API_BASE(token)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    });
  } catch (e) { console.warn('tg send failed', e?.message); }
}

async function getGeo(ip) {
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`, { timeout: 2000 });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

// Upstash simple helpers (REST)
async function upstashGet(key) {
  const url = `${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` } });
  const j = await r.json();
  return j.result; // may be string/null
}
async function upstashSet(key, value) {
  const url = `${process.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`;
  await fetch(url, { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` } });
}
async function upstashIncr(key) {
  const url = `${process.env.UPSTASH_REDIS_REST_URL}/incr/${encodeURIComponent(key)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` } });
  const j = await r.json();
  return j.result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false });

  const body = await req.json().catch(()=> ({}));
  const pass = (body.password || '').toString().trim();

  const ip = getIp(req);
  const ua = req.headers.get('user-agent') || '';

  const CHAT = process.env.TELEGRAM_CHAT_ID;
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  // get current password from Redis (persistent)
  const realPass = await upstashGet('one_time_pass') || process.env.ONE_TIME_PASS || 'lovemeone';

  // get used flag stored in redis (we mark "used:true")
  const used = await upstashGet('one_time_pass_used') === 'true';
  const blockedKey = `blocked:${ip}`;
  const isBlocked = await upstashGet(blockedKey) === 'true';

  if (isBlocked) {
    // notify and redirect
    await sendTelegramMessage(TOKEN, CHAT, `🔒 Blocked IP tried access:\nIP: \`${ip}\`\nUA: ${ua}`);
    return res.json({ ok:false, reason:'blocked_ip', redirect: `https://wa.me/${process.env.WHATSAPP_NUMBER || ''}?text=${encodeURIComponent('Access blocked')}` });
  }

  if (!pass || pass !== realPass) {
    // invalid attempt — notify
    const geo = await getGeo(ip);
    const msg = `❌ Invalid password attempt\nIP: \`${ip}\`\nLocation: ${geo?.city||'-'} ${geo?.region||''} ${geo?.country_name||''}\nUA: ${ua}\nTried: \`${pass}\``;
    await sendTelegramMessage(TOKEN, CHAT, msg);
    return res.json({ ok:false, reason:'invalid_password' });
  }

  if (used) {
    // already used — block this ip
    await upstashSet(blockedKey, 'true');
    await sendTelegramMessage(TOKEN, CHAT, `⚠️ Reuse attempt of one-time-password\nIP: \`${ip}\`\nUA: ${ua}`);
    return res.json({ ok:false, reason:'already_used', redirect: `https://wa.me/${process.env.WHATSAPP_NUMBER || ''}?text=${encodeURIComponent('Password already used')}` });
  }

  // Success: mark used, store used-by-ip, increment counters, notify TG
  await upstashSet('one_time_pass_used', 'true');
  await upstashSet('one_time_pass_used_by', ip);
  await upstashSet(`used_by_ua:${ip}`, ua);

  const geo = await getGeo(ip);
  const msg = `✅ Password used *once*\nIP: \`${ip}\`\nLocation: ${geo?.city||'-'} ${geo?.region||''} ${geo?.country_name||''}\nUA: ${ua}\nTime: ${new Date().toISOString()}`;
  await sendTelegramMessage(TOKEN, CHAT, msg);

  // increment noCount if you want to initialize
  const noCount = await upstashGet('no_count') || '0';

  // return visitor info to frontend and allow entrance
  return res.json({ ok:true, visitor:{ ip, geo, ua, noCount } });
}
