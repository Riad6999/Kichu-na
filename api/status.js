export default function (req) {
  const noCount = globalThis._noCount || 0;
  const used = !!(globalThis._usedPasswords && globalThis._usedPasswords.size > 0);
  const blocked = Array.from((globalThis._blockedIPs && globalThis._blockedIPs.values && globalThis._blockedIPs.values()) || []);
  return new Response(JSON.stringify({ ok: true, noCount, usedPass: used, blocked }), { headers: { 'content-type': 'application/json' } });
}
