// api/report-no.js
import fetch from 'node-fetch';
async function upstashIncr(key) {
  const url = `${process.env.UPSTASH_REDIS_REST_URL}/incr/${encodeURIComponent(key)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` } });
  const j = await r.json();
  return j.result;
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false });
  const newCount = await upstashIncr('no_count');
  return res.json({ ok:true, noCount: newCount });
}
