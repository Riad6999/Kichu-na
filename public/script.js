// script.js (frontend) — expects server at same origin (or adjust URL)
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('passwordOverlay');
  const main = document.getElementById('mainContent');
  const pwInput = document.getElementById('pwInput');
  const pwSubmit = document.getElementById('pwSubmit');
  const pwHint = document.getElementById('pwHint');
  const visitorInfoEl = document.getElementById('visitorInfo');
  const noBtn = document.getElementById('noBtn');
  const yesBtn = document.getElementById('yesBtn');
  const noCountEl = document.getElementById('noCount');

  // show overlay by default
  overlay.style.display = 'flex';

  pwSubmit.addEventListener('click', async () => {
    const pass = pwInput.value.trim();
    if(!pass) {
      pwHint.textContent = 'Please type the password...';
      return;
    }
    pwHint.textContent = 'Checking...';
    try {
      const resp = await fetch('/api/validate-pass', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pass })
      });
      const j = await resp.json();
      if (j.ok) {
        // allowed
        overlay.style.display = 'none';
        main.style.display = 'block';

        // store visitor for yes.html
        try { sessionStorage.setItem('visitor', JSON.stringify(j.visitor)); } catch(e){}

        // show visitor info returned from server
        const vis = j.visitor;
        visitorInfoEl.textContent = `IP: ${vis.ip || '—'} · ${vis.geo?.city || ''} ${vis.geo?.region || ''} ${vis.geo?.country || ''} · Device: ${vis.ua || '—'}`;

        // fetch current noCount (optional)
        const s = await fetch('/api/status');
        const sj = await s.json();
        noCountEl.textContent = sj.noCount || 0;
      } else {
        // not ok — either invalid or already used => redirect or show reason
        if (j.redirect) {
          window.location.href = j.redirect;
          return;
        }
        pwHint.textContent = 'Wrong password or already used.';
      }
    } catch (err) {
      console.error(err);
      pwHint.textContent = 'Server error. Try again later.';
    }
  });

  // allow Enter key
  pwInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') pwSubmit.click(); });

  // NO button behaviour: increments count on server and grows yes button
  noBtn.addEventListener('click', async () => {
    // animate yes button growth
    yesBtn.style.transform = `scale(${1.08 + Math.random()*0.14})`;
    setTimeout(()=> yesBtn.style.transform = '', 650);

    try {
      const r = await fetch('/api/report-no', { method: 'POST' });
      const jr = await r.json();
      if (jr.ok) {
        noCountEl.textContent = jr.noCount;
      }
    } catch (e) { console.warn('report-no failed', e); }
  });

  // yes button behaviour: go to yes.html (we kept existing yes page)
  yesBtn.addEventListener('click', () => {
    window.location.href = '/yes.html';
  });

  // Proximity scaling: scale yes button when cursor near it
  document.addEventListener('mousemove', (ev) => {
    const rect = yesBtn.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    const dx = ev.clientX - cx;
    const dy = ev.clientY - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const max = 220; // distance at which effect is visible
    const pct = Math.max(0, (max - dist) / max);
    const scale = 1 + pct * 0.36;
    yesBtn.style.transform = `scale(${scale})`;
  });

  // If user leaves page or mouseout, reset transform
  document.addEventListener('mouseout', () => yesBtn.style.transform = '');
});
