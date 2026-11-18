// Hero: a slow flow field. Particles follow the curl of a 3D value-noise potential and
// each one draws a short fading trail from its own position history (redrawn every frame,
// so nothing smears). The cursor adds a gentle swirl.
(() => {
  const canvas = document.querySelector('.field');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  const hero = canvas.closest('.hero');
  const readout = document.querySelector('.readout-live');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BG = [23, 32, 43];
  const INK = [
    [237, 240, 238],  // paper
    [143, 167, 255],  // cold blue
    [92, 124, 250],   // deep blue
    [242, 165, 107],  // rare warm
  ];

  // --- 3D value noise -------------------------------------------------------
  const P = new Uint8Array(512);
  (() => {
    const p = Array.from({ length: 256 }, (_, i) => i);
    let seed = 1729;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  })();
  const V = new Float32Array(256).map((_, i) => (P[i] / 255) * 2 - 1);
  const fade = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  function noise(x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    const u = fade(x - X), v = fade(y - Y), w = fade(z - Z);
    const xi = X & 255, yi = Y & 255, zi = Z & 255;
    const hsh = (a, b, c) => V[P[P[P[a] + b] + c]];
    const x1 = lerp(hsh(xi, yi, zi), hsh(xi + 1, yi, zi), u);
    const x2 = lerp(hsh(xi, yi + 1, zi), hsh(xi + 1, yi + 1, zi), u);
    const x3 = lerp(hsh(xi, yi, zi + 1), hsh(xi + 1, yi, zi + 1), u);
    const x4 = lerp(hsh(xi, yi + 1, zi + 1), hsh(xi + 1, yi + 1, zi + 1), u);
    return lerp(lerp(x1, x2, v), lerp(x3, x4, v), w);
  }
  const potential = (x, y, z) => noise(x, y, z) + 0.5 * noise(x * 2.1 + 17, y * 2.1 + 9, z * 1.3);

  // --- state -----------------------------------------------------------------
  let maxDpr = 2, slow = 0, frames = 0, lastNow = 0;
  let w = 0, h = 0, dpr = 1, parts = [], t = 3.7, running = false, visible = true;
  let start = performance.now(), lastRead = 0;
  const mouse = { x: -1e4, y: -1e4, s: 0, target: 0 };
  const SCALE = 1 / 340;      // spatial scale of the field
  const SPEED = 0.45;         // px per frame
  const DT = 0.00042;         // time step: slow evolution
  const E = 0.08;             // finite-difference step in field units
  const TRAIL = 44;           // positions kept per particle
  const EVERY = 3;            // record a position every N frames
  const BANDS = [0.06, 0.14, 0.26, 0.42]; // alpha from tail to head
  let tick = 0;

  function spawn(p) {
    p.x = Math.random() * w; p.y = Math.random() * h;
    p.hx = new Float32Array(TRAIL).fill(p.x); p.hy = new Float32Array(TRAIL).fill(p.y); p.k = 0; p.n = 1;
    p.life = 220 + Math.random() * 520;
    const r = Math.random();
    p.c = r < 0.72 ? 0 : r < 0.88 ? 1 : r < 0.97 ? 2 : 3;
        return p;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = `rgb(${BG})`; ctx.fillRect(0, 0, w, h);
    const n = Math.round(Math.min(900, Math.max(260, (w * h) / 1500)));
    parts = Array.from({ length: n }, () => spawn({}));
    if (readout) readout.dataset.n = n.toLocaleString('en-US');
  }

  function advance() {
    mouse.s += (mouse.target - mouse.s) * 0.02;
    for (const p of parts) {
      const x = p.x * SCALE, y = p.y * SCALE;
      // curl of the potential: divergence-free, so the flow never piles up
      let vx = potential(x, y + E, t) - potential(x, y - E, t);
      let vy = -(potential(x + E, y, t) - potential(x - E, y, t));
      const m = Math.hypot(vx, vy) || 1;
      vx = (vx / m) * SPEED; vy = (vy / m) * SPEED;
      if (mouse.s > 0.01) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2) + 1;
        const k = mouse.s * Math.exp(-d2 / (2 * 150 * 150)) * 0.9;
        vx += (-dy / d) * k; vy += (dx / d) * k;
      }
      p.x += vx; p.y += vy;
      if (--p.life < 0 || p.x < -4 || p.x > w + 4 || p.y < -4 || p.y > h + 4) { spawn(p); continue; }
      if (tick % EVERY === 0) { p.k = (p.k + 1) % TRAIL; if (p.n < TRAIL) p.n++; }
      p.hx[p.k] = p.x; p.hy[p.k] = p.y;
    }
    t += DT; tick++;
  }

  function draw() {
    ctx.fillStyle = `rgb(${BG})`;
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const per = TRAIL / BANDS.length;
    for (let c = 0; c < INK.length; c++) {
      for (let b = 0; b < BANDS.length; b++) {
        ctx.beginPath();
        const from = Math.floor(b * per), to = Math.min(TRAIL - 1, Math.ceil((b + 1) * per));
        for (const p of parts) {
          if (p.c !== c) continue;
          const len = p.n - 1;              // segments available, oldest at age len
          const s0 = TRAIL - 1 - to, s1 = TRAIL - 1 - from; // ages covered by this band
          if (s0 > len) continue;
          const aEnd = Math.min(s1, len);
          let idx = (p.k - aEnd + TRAIL * 2) % TRAIL;
          ctx.moveTo(p.hx[idx], p.hy[idx]);
          for (let a = aEnd - 1; a >= s0; a--) { idx = (p.k - a + TRAIL * 2) % TRAIL; ctx.lineTo(p.hx[idx], p.hy[idx]); }
        }
        const alpha = BANDS[b] * (p => p)(c === 0 ? 1 : 1.15);
        ctx.strokeStyle = `rgba(${INK[c]},${Math.min(0.5, alpha)})`;
        ctx.stroke();
      }
    }
  }

  function step() { advance(); draw(); }

  function label(now) {
    if (!readout) return;
    let txt = `curl-noise flow field / ${readout.dataset.n} particles`;
    if (now !== undefined) {
      const s = (now - start) / 1000;
      txt += ` / t ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    }
    readout.textContent = txt;
  }

  function frame(now) {
    if (!running) return;
    // Adaptive quality: if frames run long on this device, drop to 1x pixel density.
    if (lastNow && dpr > 1) {
      frames++; if (now - lastNow > 24) slow++;
      if (frames === 90) {
        if (slow > 45) { maxDpr = 1; const r = canvas.getBoundingClientRect(); dpr = 1; canvas.width = Math.round(r.width); canvas.height = Math.round(r.height); ctx.setTransform(1, 0, 0, 1, 0, 0); }
        frames = 0; slow = 0;
      }
    }
    lastNow = now;
    step();
    if (now - lastRead > 500) { lastRead = now; label(now); }
    requestAnimationFrame(frame);
  }
  function startLoop() { if (!running && visible && !document.hidden && !reduce) { running = true; requestAnimationFrame(frame); } }
  function stop() { running = false; }
  function predraw() { for (let i = 0; i < TRAIL * EVERY + 10; i++) advance(); draw(); }

  resize(); predraw(); label();

  const ready = () => requestAnimationFrame(() => hero.classList.add('is-ready'));
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(ready);
  setTimeout(ready, 900);

  let rt, lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - lastW) < 2) return; // ignore mobile toolbar height changes
    lastW = window.innerWidth;
    clearTimeout(rt);
    rt = setTimeout(() => { stop(); resize(); predraw(); label(); startLoop(); }, 150);
  });
  hero.addEventListener('pointermove', ev => {
    if (ev.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    mouse.x = ev.clientX - r.left; mouse.y = ev.clientY - r.top; mouse.target = 1;
  });
  hero.addEventListener('pointerleave', () => { mouse.target = 0; });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? startLoop() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : startLoop()));
  startLoop();
})();
