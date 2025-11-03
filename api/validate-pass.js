export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { password } = req.body || {};
  const pass = (password || "").trim();
  const realPass = process.env.ONE_TIME_PASS;

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  const ua = req.headers["user-agent"] || "";

  if (!global._usedPasswords) global._usedPasswords = new Set();
  if (!global._blockedIPs) global._blockedIPs = new Set();
  if (!global._geoCache) global._geoCache = new Map();

  if (global._blockedIPs.has(ip)) {
    return res.json({
      ok: false,
      reason: "blocked_ip",
      redirect: `https://wa.me/${process.env.WHATSAPP_NUMBER}?text=Access%20blocked%20(${ip})`
    });
  }

  if (pass !== realPass) {
    return res.json({ ok: false, reason: "invalid_password" });
  }

  if (global._usedPasswords.has(realPass)) {
    global._blockedIPs.add(ip);
    return res.json({
      ok: false,
      reason: "already_used",
      redirect: `https://wa.me/${process.env.WHATSAPP_NUMBER}?text=Password%20already%20used%20(${ip})`
    });
  }

  global._usedPasswords.add(realPass);

  let geo = null;
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`);
    geo = await r.json();
  } catch (e) {}

  return res.json({
    ok: true,
    visitor: { ip, geo, ua }
  });
}
