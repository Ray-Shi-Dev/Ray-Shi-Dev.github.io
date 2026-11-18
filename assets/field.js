// Hero: an isotherm drawing. A slowly drifting scalar field is contoured with
// marching squares and coloured with a thermal-comfort style ramp. The cursor adds heat.
(() => {
  const canvas = document.querySelector('.field');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RAMP = [[39,65,208],[79,143,224],[156,198,232],[200,205,200],[242,196,107],[238,122,58],[215,52,42]];
  const LEVELS = 22, LO = -1.1, HI = 1.1, CELL = 9;
  let w = 0, h = 0, dpr = 1, nx = 0, ny = 0, grid = null, t = Math.random() * 1000;
  let running = false, visible = true, last = 0;
  const mouse = { x: 0, y: 0, a: 0, target: 0 };

  const sources = [
    { ax: .78, ay: .30, rx: .10, ry: .12, s: .0019, p: 0.0, amp:  1.05, sig: .22 },
    { ax: .58, ay: .72, rx: .14, ry: .08, s: .0013, p: 2.1, amp: -0.95, sig: .26 },
    { ax: .92, ay: .80, rx: .06, ry: .10, s: .0023, p: 4.0, amp:  0.70, sig: .16 },
    { ax: .30, ay: .20, rx: .12, ry: .08, s: .0011, p: 1.3, amp: -0.55, sig: .30 },
    { ax: .15, ay: .85, rx: .08, ry: .06, s: .0017, p: 5.2, amp:  0.45, sig: .20 },
  ];

  function color(v) {
    const u = Math.min(1, Math.max(0, (v - LO) / (HI - LO))) * (RAMP.length - 1);
    const i = Math.min(RAMP.length - 2, Math.floor(u)), f = u - i;
    const a = RAMP[i], b = RAMP[i + 1];
    return `rgb(${a.map((c, k) => Math.round(c + (b[k] - c) * f)).join(',')})`;
  }
  const colors = Array.from({ length: LEVELS }, (_, k) => color(LO + (k + .5) * (HI - LO) / LEVELS));

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    nx = Math.ceil(w / CELL) + 2; ny = Math.ceil(h / CELL) + 2;
    grid = new Float32Array(nx * ny);
  }

  function sample() {
    const m = Math.max(w, h);
    const S = sources.map(s => ({
      x: (s.ax + s.rx * Math.sin(t * s.s * 6 + s.p)) * w,
      y: (s.ay + s.ry * Math.cos(t * s.s * 5 + s.p * 1.3)) * h,
      amp: s.amp, k: 1 / (2 * (s.sig * m) ** 2),
    }));
    const mk = 1 / (2 * (0.09 * m) ** 2);
    for (let j = 0; j < ny; j++) {
      const y = (j - 1) * CELL;
      for (let i = 0; i < nx; i++) {
        const x = (i - 1) * CELL;
        let v = 0.22 * Math.sin(x / m * 7.3 + t * .0021) * Math.cos(y / m * 5.1 - t * .0017)
              + 0.12 * Math.sin((x + y) / m * 11 + t * .0013);
        for (const s of S) { const dx = x - s.x, dy = y - s.y; v += s.amp * Math.exp(-(dx * dx + dy * dy) * s.k); }
        if (mouse.a > 0.01) { const dx = x - mouse.x, dy = y - mouse.y; v += 0.9 * mouse.a * Math.exp(-(dx * dx + dy * dy) * mk); }
        grid[j * nx + i] = v;
      }
    }
  }

  function draw() {
    sample();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1; ctx.globalAlpha = 0.62; ctx.lineJoin = 'round';
    for (let k = 0; k < LEVELS; k++) {
      const L = LO + (k + .5) * (HI - LO) / LEVELS;
      ctx.beginPath();
      for (let j = 0; j < ny - 1; j++) {
        const y0 = (j - 1) * CELL;
        for (let i = 0; i < nx - 1; i++) {
          const a = grid[j * nx + i], b = grid[j * nx + i + 1], c = grid[(j + 1) * nx + i + 1], d = grid[(j + 1) * nx + i];
          const idx = (a > L) | ((b > L) << 1) | ((c > L) << 2) | ((d > L) << 3);
          if (idx === 0 || idx === 15) continue;
          const x0 = (i - 1) * CELL;
          const top = x0 + CELL * (L - a) / (b - a), right = y0 + CELL * (L - b) / (c - b);
          const bot = x0 + CELL * (L - d) / (c - d), left = y0 + CELL * (L - a) / (d - a);
          const seg = (ax, ay, bx, by) => { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); };
          switch (idx) {
            case 1: case 14: seg(x0, left, top, y0); break;
            case 2: case 13: seg(top, y0, x0 + CELL, right); break;
            case 3: case 12: seg(x0, left, x0 + CELL, right); break;
            case 4: case 11: seg(x0 + CELL, right, bot, y0 + CELL); break;
            case 6: case 9: seg(top, y0, bot, y0 + CELL); break;
            case 7: case 8: seg(x0, left, bot, y0 + CELL); break;
            case 5: seg(x0, left, top, y0); seg(x0 + CELL, right, bot, y0 + CELL); break;
            case 10: seg(top, y0, x0 + CELL, right); seg(x0, left, bot, y0 + CELL); break;
          }
        }
      }
      ctx.strokeStyle = colors[k];
      ctx.stroke();
    }
  }

  function frame(now) {
    if (!running) return;
    if (now - last > 33) {
      last = now; t += 16;
      mouse.a += (mouse.target - mouse.a) * 0.08;
      draw();
    }
    requestAnimationFrame(frame);
  }
  function start() { if (!running && visible && !document.hidden && !reduce) { running = true; requestAnimationFrame(frame); } }
  function stop() { running = false; }

  resize(); draw();
  window.addEventListener('resize', () => { resize(); draw(); });
  const hero = canvas.parentElement;
  hero.addEventListener('pointermove', ev => {
    const r = canvas.getBoundingClientRect();
    mouse.x = ev.clientX - r.left; mouse.y = ev.clientY - r.top; mouse.target = 1;
  });
  hero.addEventListener('pointerleave', () => { mouse.target = 0; });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  start();
})();
