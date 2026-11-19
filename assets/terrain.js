// Hero: a data terrain. A grid of points is lifted by 3D value noise and projected in
// perspective; the camera drifts forward very slowly. Points are batched into colour and
// depth buckets so each frame is a few dozen fill calls. The pointer nudges the camera.
(() => {
  const canvas = document.querySelector('.terrain');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = canvas.closest('.hero');
  const readout = document.querySelector('.readout-live');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Palette: low ground to high peaks.
  const RAMP = [[70, 72, 78], [100, 103, 110], [138, 143, 152], [180, 183, 189], [215, 216, 212], [244, 244, 240]];
  const HB = RAMP.length, DB = 5;

  // --- value noise ---------------------------------------------------------
  const P = new Uint8Array(512);
  (() => {
    const p = Array.from({ length: 256 }, (_, i) => i);
    let s = 90210;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  })();
  const G = new Float32Array(256).map((_, i) => P[i] / 127.5 - 1);
  const sm = t => t * t * (3 - 2 * t);
  function n2(x, y) {
    const X = Math.floor(x), Y = Math.floor(y), u = sm(x - X), v = sm(y - Y);
    const a = G[P[(X & 255) + P[Y & 255]]], b = G[P[((X + 1) & 255) + P[Y & 255]]];
    const c = G[P[(X & 255) + P[(Y + 1) & 255]]], d = G[P[((X + 1) & 255) + P[(Y + 1) & 255]]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const height = (x, z) => 0.62 * n2(x * 1.15, z * 1.15) + 0.28 * n2(x * 2.6 + 11, z * 2.6 + 7) + 0.10 * n2(x * 6 + 3, z * 6 + 5);

  // --- scene -----------------------------------------------------------------
  let w = 0, h = 0, dpr = 1, maxDpr = 2, cols = 0, rows = 0, t = 0, running = false, visible = true;
  let camX = 0, camXT = 0, camY = 0, camYT = 0, frames = 0, slow = 0, lastNow = 0;
  const Z0 = 0.3, Z1 = 5.2, XS = 2.6, AMP = 0.62;
  let buckets = [], horizonBase = 0;
  function measure() {
    // horizon sits a little below the middle; on narrow screens push it below the buttons
    const cta = document.querySelector('.hero-cta');
    const below = cta ? cta.offsetTop + cta.offsetHeight + 40 : h * 0.6;
    horizonBase = w < 860 ? Math.max(h * 0.5, Math.min(h * 0.74, below)) : h * 0.46;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.round(Math.min(230, Math.max(90, w / 6.5)));
    rows = Math.round(Math.min(90, Math.max(50, h / 10)));
    buckets = Array.from({ length: HB * DB }, () => []);
    if (readout) readout.dataset.n = (cols * rows).toLocaleString('en-US');
    measure();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const f = Math.max(w, h * 1.3) * 0.62;
    const horizon = horizonBase + camY * 30;
    const cx = w * 0.5;
    const cy0 = 0.74; // camera height above the mean surface
    for (const b of buckets) b.length = 0;
    const lines = [];
    for (let j = rows - 1; j >= 0; j--) {
      // depth spacing grows with distance so rows look evenly spread on screen
      const zz = Z0 + (Z1 - Z0) * Math.pow(j / (rows - 1), 1.45);
      const worldZ = zz + t;
      const fadeFar = 1 - Math.pow(j / (rows - 1), 2.2);
      const fadeNear = Math.min(1, (zz - Z0) / 0.25 + 0.15);
      const depthAlpha = fadeFar * fadeNear;
      if (depthAlpha <= 0.02) continue;
      const db = Math.min(DB - 1, Math.floor((1 - depthAlpha) * DB));
      const size = Math.max(0.9, Math.min(2.6, 1.25 / zz + 0.5));
      const line = depthAlpha > 0.35 && j % 2 === 0 ? [] : null;
      for (let i = 0; i < cols; i++) {
        const x = -XS + (2 * XS * i) / (cols - 1) + camX;
        const y = height(x, worldZ);
        const sx = cx + ((x - camX) / zz) * f;
        if (sx < -4 || sx > w + 4) continue;
        const sy = horizon + ((cy0 - y * AMP) / zz) * f * 0.55;
        if (sy < -4 || sy > h + 4) continue;
        const hb = Math.max(0, Math.min(HB - 1, Math.floor((y * 0.95 + 0.48) * HB)));
        buckets[hb * DB + db].push(sx - size / 2, sy - size / 2, size);
        if (line) line.push(sx, sy);
      }
      if (line) lines.push([line, depthAlpha]);
    }
    ctx.lineWidth = 0.6;
    for (const [pts, a] of lines) {
      ctx.strokeStyle = `rgba(244,244,240,${0.08 * a})`;
      ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
      for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
      ctx.stroke();
    }
    for (let hb = 0; hb < HB; hb++) {
      for (let db = 0; db < DB; db++) {
        const arr = buckets[hb * DB + db];
        if (!arr.length) continue;
        const a = (1 - db * 0.17) * (0.8 + hb * 0.08);
        ctx.fillStyle = `rgba(${RAMP[hb]},${Math.max(0.05, Math.min(0.95, a))})`;
        ctx.beginPath();
        for (let k = 0; k < arr.length; k += 3) ctx.rect(arr[k], arr[k + 1], arr[k + 2], arr[k + 2]);
        ctx.fill();
      }
    }
  }

  let start = performance.now(), lastRead = 0;
  function label(now) {
    if (!readout) return;
    let s = `terrain / 3D value noise / ${readout.dataset.n} points`;
    if (now !== undefined) {
      const sec = (now - start) / 1000;
      s += ` / t ${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
    }
    readout.textContent = s;
  }

  function frame(now) {
    if (!running) return;
    if (lastNow && dpr > 1) {
      frames++; if (now - lastNow > 24) slow++;
      if (frames === 90) { if (slow > 45) { maxDpr = 1; resize(); } frames = 0; slow = 0; }
    }
    lastNow = now;
    t += 0.0016;                        // forward drift: slow and steady
    camX += (camXT - camX) * 0.015;     // pointer influence eases in
    camY += (camYT - camY) * 0.015;
    draw();
    if (now - lastRead > 500) { lastRead = now; label(now); }
    requestAnimationFrame(frame);
  }
  const startLoop = () => { if (!running && visible && !document.hidden && !reduce) { running = true; requestAnimationFrame(frame); } };
  const stop = () => { running = false; };

  resize(); draw(); label();
  const ready = () => requestAnimationFrame(() => hero.classList.add('is-ready'));
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(ready);
  setTimeout(ready, 900);

  let rt, lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - lastW) < 2) return;
    lastW = window.innerWidth; clearTimeout(rt);
    rt = setTimeout(() => { resize(); draw(); }, 150);
  });
  hero.addEventListener('pointermove', ev => {
    if (ev.pointerType !== 'mouse') return;
    const r = hero.getBoundingClientRect();
    camXT = ((ev.clientX - r.left) / r.width - 0.5) * 0.35;
    camYT = ((ev.clientY - r.top) / r.height - 0.5) * 0.6;
  });
  hero.addEventListener('pointerleave', () => { camXT = 0; camYT = 0; });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? startLoop() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : startLoop()));
  startLoop();
})();
