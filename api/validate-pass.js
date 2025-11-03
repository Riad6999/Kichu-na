export const config = { runtime: 'edge' };

const ONE_TIME_PASS = process.env.ONE_TIME_PASS || 'lovemeone';
const WHATSAPP = process.env.WHATSAPP_NUMBER || '966502681629';

if (!globalThis._usedPasswords) globalThis._usedPasswords = new Set();
if (!globalThis._blockedIPs) globalThis._blockedIPs = new Set();
if (!globalThis._geoCache) globalThis._geoCache = new Map();

async function fetchGeo(ip) {
  if (!ip) return null;
  if (globalThis._geoCache.has(ip)) return globalThis._geoCache.get(ip);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const j = await res.json();
    const out = {
      ip: j.ip,
      city: j.city,
      region: j.region,
      country: j.country_name,
      latitude: j.latitude,
      longitude: j.longitude,
      org: j.org
    };
    globalThis._geoCache.set(ip, out);
    setTimeout(()=> globalThis._geoCache.delete(ip), 10 * 60 * 1000);
    return out;
  } catch (e) {
    clearTimeout(timer);
    return null;
  }
}

export default async function (req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405 });

  let body;
  try { body = await req.json(); } catch (e) { body = {}; }
  const pass = (body.password || '').toString().trim();

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown';
  const ua = req.headers.get('user-agent') || '';

  if (globalThis._blockedIPs.has(ip)) {
    return new Response(JSON.stringify({
      ok: false,
      reason: 'blocked_ip',
      redirect: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Access blocked')}`
    }), { headers: { 'content-type': 'application/json' } });
  }

  if (!pass || pass !== ONE_TIME_PASS) {
    return new Response(JSON.stringify({ ok: false, reason: 'invalid_password' }), { headers: { 'content-type': 'application/json' } });
  }

  if (globalThis._usedPasswords.has(ONE_TIME_PASS)) {
    globalThis._blockedIPs.add(ip);
    return new Response(JSON.stringify({
      ok: false,
      reason: 'already_used',
      redirect: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Password already used')}`
    }), { headers: { 'content-type': 'application/json' } });
  }

  globalThis._usedPasswords.add(ONE_TIME_PASS);
  const geo = await fetchGeo(ip);

  return new Response(JSON.stringify({
    ok: true,
    visitor: { ip, geo, ua }
  }), { headers: { 'content-type': 'application/json' } });
}
