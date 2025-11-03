export default function (req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({ ok: false }), { status: 405 });

  if (!globalThis._noCount) globalThis._noCount = 0;
  globalThis._noCount += 1;

  return new Response(JSON.stringify({ ok: true, noCount: globalThis._noCount }), { headers: { 'content-type': 'application/json' } });
}
