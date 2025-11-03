// api/status.js
import fetch from 'node-fetch';
async function upstashGet(key) {
  const url = `${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` } });
  const j = await r.json();
  return j.result;
}
export default async function handler(req, res) {
  const noCount = parseInt(await upstashGet('no_count') || '0', 10);
  const used = (await upstashGet('one_time_pass_used')) === 'true';
  const usedBy = await upstashGet('one_time_pass_used_by') || null;
  return res.json({ ok:true, noCount, usedPass: used, usedBy });
}
