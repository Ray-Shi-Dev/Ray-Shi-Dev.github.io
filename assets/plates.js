// Plates: full-bleed line drawings that open each section, drawn in the same fine-line language
// as the hero. Each plate draws in once when it scrolls into view and answers the pointer:
//   ridge   96 hourly load traces stacked as a ridge field, one carrying an anomaly; a scanner reads the hour
//   braid   strands of practice carried through each role, 2016 to 2026, into one point; hover reads the year
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

  // ---- braid: strands of practice carried through each role and drawn together ------------
  const braid = {
    build(W, H, el) {
      const narrow = W < 700, N = narrow ? 90 : 170;
      const x0 = W * 0.04, x1 = W * 0.96, y0 = 2016, y1 = 2026.9;
      const X = yr => x0 + ((yr - y0) / (y1 - y0)) * (x1 - x0);
      const top = H * (narrow ? 0.2 : 0.24);
      const Y = f => top + (H * (narrow ? 0.62 : 0.8) - top) * f;
      // lanes: [centre, thickness, label]
      const L = {
        arch: [0.3, 0.42, 'Architecture'], plan: [0.72, 0.2, 'Planning and econometrics'], ud: [0.14, 0.16, 'Urban design'],
        arup: [0.42, 0.16, 'Computational energy'], llm: [0.86, 0.07, 'LLM training'], cs: [0.5, 0.012, 'Computer science'], cord: [0.5, 0.004, ''],
      };
      const knots = [
        [2014.6, () => 'arch'], [2016.4, () => 'arch'], [2019.9, () => 'arch'],
        [2021.6, s => s < 0.58 ? 'plan' : 'ud'], [2023.1, s => s < 0.58 ? 'plan' : 'ud'],
        [2024.7, s => s < 0.8 ? 'arup' : 'llm'], [2025.6, s => s < 0.8 ? 'arup' : 'arup'],
        [2026.85, () => 'cs'], [2028.4, () => 'cord'],
      ];
      const strands = [];
      for (let i = 0; i < N; i++) {
        const s = rnd(), pts = [];
        knots.forEach(([yr, lane], k) => {
          const [c, th] = L[lane(s)];
          const u = k % 2 ? rnd() : (i + 0.5) / N * 0.6 + rnd() * 0.4;
          pts.push([X(yr) + (rnd() - 0.5) * W * 0.012 * (k > 1 && k < knots.length - 2 ? 1 : 0), Y(c + (u - 0.5) * th)]);
        });
        strands.push({ pts, a: 0.05 + rnd() * 0.13 });
      }
      // the traced strand: architecture, planning, Arup, computer science
      const hi = { pts: knots.map(([yr, lane], k) => { const ln = ['arch', 'arch', 'arch', 'plan', 'plan', 'arup', 'arup', 'cs', 'cord'][k]; return [X(yr), Y(L[ln][0] + (k < 3 ? 0.05 : 0.01))]; }), hi: true };
      strands.push(hi);
      let events = []; try { events = JSON.parse(el.dataset.events || '[]'); } catch (e) {}
      const tags = [['arch', 2016.6], ['ud', 2021.7], ['plan', 2021.7], ['arup', 2024.8], ['llm', 2024.8]].map(([k, yr]) => [L[k][2], X(yr), Y(L[k][0] - L[k][1] / 2) - 9]);
      return { strands, X, x0, x1, y0, y1, events, top, narrow, tags, csx: X(2026.85), csy: Y(L.cs[0]) };
    },
    paint(ctx, m, W, H) {
      const ry = m.top - (m.narrow ? 30 : 46);
      ctx.strokeStyle = INK(0.22); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(m.x0, ry + 0.5); ctx.lineTo(m.x1, ry + 0.5); ctx.stroke();
      for (let y = 2016; y <= 2026; y++) {
        const x = Math.round(m.X(y)) + 0.5;
        ctx.beginPath(); ctx.moveTo(x, ry - 5); ctx.lineTo(x, ry + 5); ctx.stroke();
        if (!m.narrow || y % 2 === 0) label(ctx, String(y), x, ry - 16, INK(0.55), 'center');
        if (y < 2026) for (let q = 1; q < 4; q++) { const xq = Math.round(m.X(y + q / 4)) + 0.5; ctx.beginPath(); ctx.moveTo(xq, ry - 2); ctx.lineTo(xq, ry + 2); ctx.stroke(); }
      }
      for (const ev of m.events) { const x = Math.round(m.X(ev.s)) + 0.5; ctx.fillStyle = ev.now ? AMBER : INK(0.7); ctx.fillRect(x - 2, ry - 2, 4, 4); }
      const curve = p => {
        ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
        for (let k = 1; k < p.length; k++) { const a = p[k - 1], b = p[k], d = (b[0] - a[0]) * 0.45; ctx.bezierCurveTo(a[0] + d, a[1], b[0] - d, b[1], b[0], b[1]); }
      };
      ctx.globalCompositeOperation = 'lighter';
      for (const s of m.strands) if (!s.hi) { curve(s.pts); ctx.strokeStyle = INK(s.a); ctx.lineWidth = 0.75; ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
      const h = m.strands[m.strands.length - 1];
      curve(h.pts); ctx.strokeStyle = AMBER; ctx.lineWidth = 1.4; ctx.stroke(); ctx.lineWidth = 1;
      for (const p of h.pts.slice(2, -2)) { ctx.fillStyle = BG; ctx.strokeStyle = AMBER; ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = AMBER; ctx.fillRect(m.csx - 3.5, m.csy - 3.5, 7, 7);
      if (!m.narrow) for (const [t, x, y] of m.tags) label(ctx, t, x, y, INK(0.6));
      label(ctx, 'Computer science', m.csx + 2, m.csy + 22, AMBER, 'right');
    },
    overlay(ctx, m, W, H, p) {
      if (!p) return;
      const x = Math.max(m.x0, Math.min(m.x1, p.x)), yr = m.y0 + ((x - m.x0) / (m.x1 - m.x0)) * (m.y1 - m.y0);
      const ry = m.top - (m.narrow ? 30 : 46);
      ctx.strokeStyle = INK(0.35); ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, ry); ctx.lineTo(Math.round(x) + 0.5, H); ctx.stroke();
      const live = m.events.filter(ev => yr >= ev.s && yr < ev.e).sort((a, b) => b.s - a.s);
      const right = x < W - 300, tx = right ? x + 12 : x - 12, al = right ? 'left' : 'right';
      ctx.fillStyle = 'rgba(7,7,9,.82)';
      const bw = Math.max(60, ...live.slice(0, 3).map(ev => ev.t.length * 6.7)) + 16, bh = 26 + Math.min(3, live.length) * 17;
      ctx.fillRect(right ? tx - 8 : tx - bw + 8, ry + 8, bw, bh);
      label(ctx, String(Math.floor(yr)), tx, ry + 20, AMBER, al);
      live.slice(0, 3).forEach((ev, i) => label(ctx, ev.t, tx, ry + 40 + i * 17, INK(0.85), al));
    },
  };

  // ---- moire: two ring fields interfering, one fixed on Tainan, one following the pointer ---
  const moire = {
    live: true,
    build(W, H) {
      const narrow = W < 700;
      return { A: [W * (narrow ? 0.62 : 0.7), H * (narrow ? 0.34 : 0.46)], B: null, gap: narrow ? 8 : 10, narrow };
    },
    frame(ctx, m, W, H, p, t, reveal) {
      const A = m.A, ease = reduce ? 1 : 0.045;
      const target = p ? [p.x, p.y] : [A[0] - W * 0.16 * Math.cos(t * 0.11), A[1] + H * 0.2 * Math.sin(t * 0.15)];
      if (!m.B) m.B = target.slice();
      m.B[0] += (target[0] - m.B[0]) * ease; m.B[1] += (target[1] - m.B[1]) * ease;
      const B = m.B, R = Math.hypot(W, H) * reveal, RB = Math.min(R, Math.max(W, H) * 0.42);
      ctx.lineWidth = 1;
      // fixed field: even and quiet, fading towards the edges
      for (let r = m.gap; r < R; r += m.gap) {
        ctx.strokeStyle = INK(0.17 * (1 - 0.55 * Math.min(1, r / (W * 0.8)))); ctx.beginPath(); ctx.arc(A[0], A[1], r, 0, Math.PI * 2); ctx.stroke();
      }
      // moving field: local to the pointer and fading out, so the fringes stay soft as it moves
      for (let r = m.gap * 1.5; r < RB; r += m.gap * 1.5) {
        const f = 1 - r / RB; ctx.strokeStyle = INK(0.16 * f * f); ctx.beginPath(); ctx.arc(B[0], B[1], r, 0, Math.PI * 2); ctx.stroke();
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

  // ---- molnar: loop to vector; random strokes aligned left to right, and under the pointer ---
  const molnar = {
    build(W, H) {
      const narrow = W < 520, cols = narrow ? 30 : 58, padT = narrow ? 44 : 60, padB = narrow ? 40 : 54;
      const cell = W / (cols + 2), rows = Math.max(6, Math.floor((H - padT - padB) / cell));
      const oy = padT + (H - padT - padB - rows * cell) / 2, ox = cell;
      const cells = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = ox + (i + 0.5) * cell, y = oy + (j + 0.5) * cell, t = smooth(0.14, 0.86, x / W);
        if (rnd() < 0.07 * (1 - t)) continue;
        cells.push({ x, y, t, th: rnd() * Math.PI });
      }
      return { cells, len: cell * 0.86, narrow, padT, padB, R: narrow ? 70 : 120 };
    },
    frame(ctx, m, W, H, p, t, reveal) {
      ctx.lineWidth = 1; ctx.lineCap = 'round';
      const lim = W * reveal * 1.05, R2 = m.R * m.R;
      for (const c of m.cells) {
        if (c.x > lim) continue;
        let a = c.th * (1 - c.t) + (Math.PI / 2) * c.t, f = 0;
        if (p) { const d2 = (c.x - p.x) ** 2 + (c.y - p.y) ** 2; f = Math.exp(-d2 / R2); a = a * (1 - f) + (Math.PI / 2) * f; }
        const dx = Math.cos(a) * m.len / 2, dy = Math.sin(a) * m.len / 2;
        ctx.strokeStyle = f > 0.35 ? AMBER_A(0.4 + 0.6 * f) : INK(0.32 + 0.4 * c.t);
        ctx.beginPath(); ctx.moveTo(c.x - dx, c.y - dy); ctx.lineTo(c.x + dx, c.y + dy); ctx.stroke();
      }
      if (reveal < 1) return;
      const y0 = m.padT * 0.5, y1 = H - m.padB * 0.45;
      label(ctx, m.narrow ? 'for i in buildings' : 'for i, idx in enumerate(building_id)', 18, y0, INK(0.55));
      label(ctx, m.narrow ? '.transform(mean)' : "groupby('building_id').transform('mean')", W - 18, y0, INK(0.8), 'right');
      label(ctx, '26.6 min', 18, y1, INK(0.55));
      label(ctx, '7.3 min', W - 18, y1, AMBER, 'right');
    },
  };

  const KINDS = { ridge, braid, moire, molnar };

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
      if (!document.hidden && (reveal < 1 || (visible && kind.live && !reduce))) raf = requestAnimationFrame(tick);
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
