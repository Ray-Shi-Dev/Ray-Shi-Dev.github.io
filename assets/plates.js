// Plates: full-bleed line drawings that open each section, drawn in the same fine-line language
// as the hero. Each plate draws in once when it scrolls into view and answers the pointer:
//   ridge   96 hourly load traces stacked as a ridge field, one carrying an anomaly; a scanner reads the hour
//   signal  smooth physical waves quantised into discrete steps across 2016 to 2026; hover reads the year
//   moire   two ring fields, one fixed on Tainan and one following the pointer, interfering live
(() => {
  const plates = document.querySelectorAll('[data-plate]');
  if (!plates.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BG = '#070709', AMBER = '#E5A93C', AMBER_A = a => `rgba(229,169,60,${a})`, INK = a => `rgba(244,244,240,${a})`;
  const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

  // small deterministic value noise
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const P = new Uint8Array(512);
  { const p = Array.from({ length: 256 }, (_, i) => i); for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
  const G = Float32Array.from({ length: 256 }, (_, i) => P[i] / 127.5 - 1);
  const sm = t => t * t * (3 - 2 * t);
  const n2 = (x, y) => { const X = Math.floor(x), Y = Math.floor(y), u = sm(x - X), v = sm(y - Y);
    const a = G[P[(X & 255) + P[Y & 255]]], b = G[P[((X + 1) & 255) + P[Y & 255]]], c = G[P[(X & 255) + P[(Y + 1) & 255]]], d = G[P[((X + 1) & 255) + P[(Y + 1) & 255]]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const label = (ctx, text, x, y, color, align = 'left') => { ctx.font = `400 11px ${MONO}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y); };

  // ---- ridge: stacked hourly load traces with hidden-line occlusion -------------------------
  const ridge = {
    build(W, H) {
      const narrow = W < 700, N = narrow ? 44 : 72, dx = narrow ? 3 : 2.5;
      const top = H * 0.16, bottom = H * 0.97, gap = (bottom - top) / N, K = Math.ceil(W / dx) + 1;
      const hi = Math.round(N * 0.7), spike = 0.7, amp = narrow ? 6.5 : 11;
      const rows = [];
      for (let i = 0; i < N; i++) {
        const ys = new Float32Array(K), base = top + i * gap;
        for (let k = 0; k < K; k++) {
          const x = k * dx, u = x / W;
          const env = 0.18 + 0.82 * Math.exp(-(((u - 0.63) / (narrow ? 0.36 : 0.24)) ** 2));
          const a1 = (n2(u * 4.2 + i * 0.17, i * 0.29) + 1) / 2;
          let v = env * (1.7 * a1 * a1 * a1 + 0.16 * Math.max(0, n2(u * 22 + 3, i * 0.9)) + 0.05 * (n2(u * 110, i * 2.1) + 1));
          if (i === hi) v = 0.35 * v + 1.05 * Math.exp(-(((u - spike) / 0.011) ** 2)) + 0.42 * Math.exp(-(((u - spike - 0.028) / 0.007) ** 2));
          ys[k] = base - v * gap * amp;
        }
        rows.push({ ys, base, hi: i === hi, a: 0.16 + 0.5 * (i / (N - 1)) });
      }
      return { rows, dx, K, N, hi, spike, gap };
    },
    paint(ctx, m, W, H) {
      ctx.lineWidth = 1; ctx.lineJoin = 'round';
      for (const r of m.rows) {
        ctx.beginPath(); ctx.moveTo(0, r.ys[0]);
        for (let k = 1; k < m.K; k++) ctx.lineTo(k * m.dx, r.ys[k]);
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        ctx.fillStyle = BG; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, r.ys[0]);
        for (let k = 1; k < m.K; k++) ctx.lineTo(k * m.dx, r.ys[k]);
        ctx.strokeStyle = r.hi ? AMBER : INK(r.a); ctx.lineWidth = r.hi ? 1.3 : 1; ctx.stroke(); ctx.lineWidth = 1;
      }
    },
    overlay(ctx, m, W, H, p) {
      if (!p) return;
      const k = Math.max(0, Math.min(m.K - 1, Math.round(p.x / m.dx))), x = k * m.dx;
      ctx.strokeStyle = INK(0.35); ctx.beginPath(); ctx.moveTo(x + 0.5, H * 0.1); ctx.lineTo(x + 0.5, H); ctx.stroke();
      for (const r of m.rows) { ctx.fillStyle = r.hi ? AMBER : INK(Math.min(1, r.a + 0.3)); const s = r.hi ? 4 : 2; ctx.fillRect(x - s / 2, r.ys[k] - s / 2, s, s); }
      const hour = Math.round((x / W) * 8760), near = Math.abs(x / W - m.spike) < 0.02;
      const right = x < W - 220, tx = right ? x + 12 : x - 12, al = right ? 'left' : 'right';
      label(ctx, `hour ${hour.toLocaleString('en-US')} / 8,760`, tx, H * 0.1 + 6, INK(0.85), al);
      label(ctx, near ? 'anomaly flagged' : `${m.N} meters, normal`, tx, H * 0.1 + 24, near ? AMBER : INK(0.5), al);
    },
  };

  // ---- signal: analogue fields quantised into digital steps across the years --------------
  const signal = {
    build(W, H, el) {
      const narrow = W < 700, N = narrow ? 18 : 30;
      const x0 = W * 0.04, x1 = W * 0.96, y0 = 2016, y1 = 2026.9;
      const top = H * 0.24, bottom = H * 0.94, gap = (bottom - top) / N, dx = 2, K = Math.ceil(W / dx) + 1;
      const step = narrow ? 14 : 20, hi = Math.round(N * 0.42);
      const rows = [];
      for (let i = 0; i < N; i++) {
        const base = top + i * gap, ys = new Float32Array(K), lv = gap * 0.9;
        const phys = x => gap * 2.4 * (0.62 * Math.sin(x * 0.0052 + i * 0.13) + 0.38 * Math.sin(x * 0.0123 + i * 0.21 + 1.3)) * (0.55 + 0.45 * n2(x * 0.0018, i * 0.06 + 4));
        for (let k = 0; k < K; k++) {
          const x = k * dx, q = smooth(W * 0.28, W * 0.82, x);
          const xs = Math.floor(x / step) * step, d = Math.round(phys(xs) / lv) * lv;
          ys[k] = base - (phys(x) * (1 - q) + d * q);
        }
        rows.push({ ys, hi: i === hi, a: 0.2 + 0.5 * (i / (N - 1)) });
      }
      let events = []; try { events = JSON.parse(el.dataset.events || '[]'); } catch (e) {}
      const X = yr => x0 + ((yr - y0) / (y1 - y0)) * (x1 - x0);
      return { rows, dx, K, N, X, x0, x1, y0, y1, events, top, step, narrow };
    },
    paint(ctx, m, W, H) {
      // year ruler
      const ry = m.top - (m.narrow ? 26 : 42);
      ctx.strokeStyle = INK(0.22); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(m.x0, ry + 0.5); ctx.lineTo(m.x1, ry + 0.5); ctx.stroke();
      for (let y = 2016; y <= 2026; y++) {
        const x = Math.round(m.X(y)) + 0.5;
        ctx.beginPath(); ctx.moveTo(x, ry - 5); ctx.lineTo(x, ry + 5); ctx.stroke();
        if (!m.narrow || y % 2 === 0) label(ctx, String(y), x, ry - 16, INK(0.55), 'center');
        for (let q = 1; q < 4; q++) { const xq = Math.round(m.X(y + q / 4)) + 0.5; if (y < 2026 || q < 4) { ctx.beginPath(); ctx.moveTo(xq, ry - 2); ctx.lineTo(xq, ry + 2); ctx.stroke(); } }
      }
      for (const ev of m.events) { const x = Math.round(m.X(ev.s)) + 0.5; ctx.fillStyle = ev.now ? AMBER : INK(0.7); ctx.fillRect(x - 2, ry - 2, 4, 4); }
      ctx.lineJoin = 'miter';
      for (const r of m.rows) {
        ctx.beginPath(); ctx.moveTo(0, r.ys[0]);
        for (let k = 1; k < m.K; k++) ctx.lineTo(k * m.dx, r.ys[k]);
        ctx.strokeStyle = r.hi ? AMBER : INK(r.a); ctx.lineWidth = r.hi ? 1.3 : 1; ctx.stroke();
      }
      ctx.lineWidth = 1;
    },
    overlay(ctx, m, W, H, p) {
      if (!p) return;
      const x = Math.max(m.x0, Math.min(m.x1, p.x)), yr = m.y0 + ((x - m.x0) / (m.x1 - m.x0)) * (m.y1 - m.y0);
      const k = Math.round(x / m.dx), ry = m.top - (m.narrow ? 26 : 42);
      ctx.strokeStyle = INK(0.35); ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, ry); ctx.lineTo(Math.round(x) + 0.5, H); ctx.stroke();
      for (const r of m.rows) if (r.hi) { ctx.fillStyle = AMBER; ctx.fillRect(x - 2.5, r.ys[k] - 2.5, 5, 5); }
      const live = m.events.filter(ev => yr >= ev.s && yr < ev.e).sort((a, b) => b.s - a.s);
      const right = x < W - 300, tx = right ? x + 12 : x - 12, al = right ? 'left' : 'right';
      label(ctx, String(Math.floor(yr)), tx, ry + 18, AMBER, al);
      live.slice(0, 3).forEach((ev, i) => label(ctx, ev.t, tx, ry + 38 + i * 17, INK(0.82), al));
    },
  };

  // ---- moire: two ring fields interfering, one fixed on Tainan, one following the pointer ---
  const moire = {
    live: true,
    build(W, H) {
      const narrow = W < 700;
      return { A: [W * (narrow ? 0.62 : 0.7), H * (narrow ? 0.34 : 0.46)], B: null, gap: narrow ? 7 : 8, narrow };
    },
    frame(ctx, m, W, H, p, t, reveal) {
      const A = m.A, ease = reduce ? 1 : 0.07;
      const target = p ? [p.x, p.y] : [A[0] - W * 0.16 * Math.cos(t * 0.11), A[1] + H * 0.2 * Math.sin(t * 0.15)];
      if (!m.B) m.B = target.slice();
      m.B[0] += (target[0] - m.B[0]) * ease; m.B[1] += (target[1] - m.B[1]) * ease;
      const B = m.B, R = Math.hypot(W, H) * reveal;
      ctx.lineWidth = 1;
      for (const [c, a] of [[A, 0.26], [B, 0.2]]) {
        ctx.strokeStyle = INK(a); ctx.beginPath();
        for (let r = m.gap; r < R; r += m.gap) { ctx.moveTo(c[0] + r, c[1]); ctx.arc(c[0], c[1], r, 0, Math.PI * 2); }
        ctx.stroke();
      }
      if (reveal < 1) return;
      const d = Math.hypot(B[0] - A[0], B[1] - A[1]);
      ctx.strokeStyle = AMBER_A(0.9); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(A[0], A[1], d, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
      ctx.strokeStyle = INK(0.4); ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = AMBER; ctx.fillRect(A[0] - 3, A[1] - 3, 6, 6);
      ctx.fillStyle = BG; ctx.strokeStyle = INK(0.9); ctx.beginPath(); ctx.arc(B[0], B[1], 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      label(ctx, m.narrow ? 'Tainan' : 'Tainan  22.9997° N, 120.2170° E', A[0] + 12, A[1] - 12, INK(0.85));
      label(ctx, p ? 'you' : (m.narrow ? 'tap to steer' : 'drifting, move to steer'), B[0] + 12, B[1] + 14, INK(0.6));
    },
  };

  const KINDS = { ridge, signal, moire };

  plates.forEach(el => {
    const kind = KINDS[el.dataset.plate], art = el.querySelector('.plate-art');
    if (!kind || !art) return;
    const ctx = art.getContext('2d');
    let W = 0, H = 0, dpr = 1, model = null, cache = null, reveal = reduce ? 1 : 0, started = false, visible = false, ptr = null, raf = 0, t = 0, last = 0;

    function size() {
      const r = art.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
      art.width = Math.round(W * dpr); art.height = Math.round(H * dpr);
      seed = 7; model = kind.build(W, H, el);
      if (kind.paint) {
        cache = document.createElement('canvas'); cache.width = art.width; cache.height = art.height;
        const c = cache.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); kind.paint(c, model, W, H);
      }
      draw();
    }
    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, art.width, art.height);
      if (cache) {
        const e = reveal >= 1 ? 1 : 1 - Math.pow(1 - reveal, 3), w = Math.round(art.width * e);
        if (w > 0) ctx.drawImage(cache, 0, 0, w, art.height, 0, 0, w, art.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (reveal < 1 && w > 0) { ctx.strokeStyle = AMBER_A(0.7); ctx.beginPath(); ctx.moveTo(w / dpr + 0.5, 0); ctx.lineTo(w / dpr + 0.5, H); ctx.stroke(); }
        if (reveal >= 1) kind.overlay(ctx, model, W, H, ptr);
      } else {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        kind.frame(ctx, model, W, H, ptr, t, reveal >= 1 ? 1 : 1 - Math.pow(1 - reveal, 3));
      }
    }
    function tick(now) {
      raf = 0;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now; t += dt;
      if (reveal < 1) reveal = Math.min(1, reveal + dt / 1.8);
      draw();
      if (visible && !document.hidden && (reveal < 1 || (kind.live && !reduce))) raf = requestAnimationFrame(tick);
    }
    const kick = () => { if (!raf && started) { last = 0; raf = requestAnimationFrame(tick); } };

    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !started) { started = true; el.classList.add('is-in'); size(); }
      if (visible) kick();
    }, { rootMargin: '0px 0px -12% 0px' }).observe(el);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

    const move = ev => {
      const r = art.getBoundingClientRect();
      ptr = { x: ev.clientX - r.left, y: ev.clientY - r.top };
      if (kind.live) kick(); else if (reveal >= 1) draw();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', move);
    el.addEventListener('pointerleave', () => { ptr = null; if (kind.live) kick(); else draw(); });

    let rt, lw = window.innerWidth;
    window.addEventListener('resize', () => {
      if (!started || Math.abs(window.innerWidth - lw) < 2) return;
      lw = window.innerWidth; clearTimeout(rt); rt = setTimeout(size, 150);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (started) draw(); });
  });
})();
