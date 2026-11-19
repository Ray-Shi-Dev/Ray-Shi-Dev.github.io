// Hero: one point cloud, three forms. ~26k particles morph between a tower (building
// physics), a terrain (spatial data) and a neural network (machine learning). Raw WebGL,
// additive point sprites, staggered transitions. Falls back to the canvas terrain.
(() => {
  const canvas = document.querySelector('.gl');
  if (!canvas) return;
  const hero = canvas.closest('.hero');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl) { const s = document.createElement('script'); s.src = '/assets/terrain.js'; canvas.classList.replace('gl', 'terrain'); document.body.appendChild(s); return; }

  const small = window.matchMedia('(max-width: 860px)').matches;
  const N = small ? 14000 : 26000;
  const SHAPES = ['Buildings', 'Spatial data', 'Machine learning'];

  // --- deterministic random ----------------------------------------------------
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // --- shape 1: tower massing --------------------------------------------------
  function tower() {
    const out = new Float32Array(N * 3);
    const masses = [ // x, z centre, half width, half depth, y0, y1
      [0.0, 0.0, 0.95, 0.62, -1.0, -0.62],
      [-0.28, 0.0, 0.42, 0.34, -0.62, 1.15],
      [0.42, 0.05, 0.28, 0.28, -0.62, 0.42],
    ];
    const FLOOR = 0.085;
    let k = 0;
    const put = (x, y, z) => { if (k < N) { out[k * 3] = x; out[k * 3 + 1] = y; out[k * 3 + 2] = z; k++; } };
    const perim = (m, t) => { // point on rectangle perimeter, t in [0,1)
      const [cx, cz, hw, hd] = m, P = 4 * (hw + hd); let d = t * P;
      if (d < 2 * hw) return [cx - hw + d, cz - hd]; d -= 2 * hw;
      if (d < 2 * hd) return [cx + hw, cz - hd + d]; d -= 2 * hd;
      if (d < 2 * hw) return [cx + hw - d, cz + hd]; d -= 2 * hw;
      return [cx - hw, cz + hd - d];
    };
    const slabs = Math.floor(N * 0.5), mull = Math.floor(N * 0.3);
    const wts = masses.map(m => (m[5] - m[4]) * (m[2] + m[3]));
    const tw = wts.reduce((a, b) => a + b);
    const pick = () => { let r = rnd() * tw; for (let i = 0; i < masses.length; i++) { r -= wts[i]; if (r <= 0) return masses[i]; } return masses[0]; };
    for (let i = 0; i < slabs; i++) {
      const m = pick(); const nf = Math.round((m[5] - m[4]) / FLOOR);
      const y = m[4] + Math.floor(rnd() * (nf + 1)) * FLOOR;
      const [x, z] = perim(m, rnd()); put(x, y, z);
    }
    for (let i = 0; i < mull; i++) {
      const m = pick(); const P = 4 * (m[2] + m[3]); const step = 0.11 / P;
      const t = Math.floor(rnd() / step) * step; const [x, z] = perim(m, t);
      put(x, m[4] + rnd() * (m[5] - m[4]), z);
    }
    while (k < N) { // ground grid
      const along = rnd() * 3.2 - 1.6, line = Math.round((rnd() * 3.2 - 1.6) / 0.2) * 0.2;
      if (rnd() < 0.5) put(along, -1.0, line); else put(line, -1.0, along);
    }
    return out;
  }

  // --- shape 2: terrain --------------------------------------------------------
  const P = new Uint8Array(512);
  (() => { const p = Array.from({ length: 256 }, (_, i) => i); for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; })();
  const G = new Float32Array(256).map((_, i) => P[i] / 127.5 - 1);
  const sm = t => t * t * (3 - 2 * t);
  const n2 = (x, y) => { const X = Math.floor(x), Y = Math.floor(y), u = sm(x - X), v = sm(y - Y);
    const a = G[P[(X & 255) + P[Y & 255]]], b = G[P[((X + 1) & 255) + P[Y & 255]]], c = G[P[(X & 255) + P[(Y + 1) & 255]]], d = G[P[((X + 1) & 255) + P[(Y + 1) & 255]]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  function terrain() {
    const out = new Float32Array(N * 3);
    const cols = Math.round(Math.sqrt(N * 1.6)), rows = Math.ceil(N / cols);
    for (let i = 0; i < N; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const x = (c / (cols - 1)) * 3.4 - 1.7, z = (r / (rows - 1)) * 2.6 - 1.3;
      const fall = Math.max(0, 1 - Math.pow(Math.hypot(x / 1.7, z / 1.3), 4));
      const y = (0.62 * n2(x * 1.4 + 3, z * 1.4 + 1) + 0.25 * n2(x * 3.1, z * 3.1 + 9)) * 0.75 * (0.35 + 0.65 * fall) - 0.15;
      out[i * 3] = x + (rnd() - 0.5) * 0.004; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    }
    return out;
  }

  // --- shape 3: neural network -------------------------------------------------
  function network() {
    const out = new Float32Array(N * 3);
    const layers = [5, 9, 12, 9, 3];
    const nodes = layers.map((n, li) => {
      const x = -1.45 + (2.9 * li) / (layers.length - 1);
      return Array.from({ length: n }, (_, j) => {
        const a = (j / n) * Math.PI * 2 + li * 0.4, r = 0.1 + 0.05 * n;
        return [x, Math.sin(a) * r, Math.cos(a) * r * 0.85];
      });
    });
    const edges = [];
    for (let l = 0; l < nodes.length - 1; l++) for (const a of nodes[l]) for (const b of nodes[l + 1]) edges.push([a, b]);
    const all = nodes.flat();
    for (let i = 0; i < N; i++) {
      let x, y, z;
      if (rnd() < 0.3) { const n = all[Math.floor(rnd() * all.length)]; x = n[0] + gauss() * 0.028; y = n[1] + gauss() * 0.028; z = n[2] + gauss() * 0.028; }
      else { const [a, b] = edges[Math.floor(rnd() * edges.length)]; const t = rnd(); x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t; z = a[2] + (b[2] - a[2]) * t; }
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    }
    return out;
  }

  const A = tower(), B = terrain(), C = network();
  // colour value per particle and form: height for tower and terrain, depth through the network
  const T = new Float32Array(N * 3);
  const range = (arr, axis) => { let lo = 1e9, hi = -1e9; for (let i = 0; i < N; i++) { const v = arr[i * 3 + axis]; if (v < lo) lo = v; if (v > hi) hi = v; } return [lo, hi]; };
  const [ty0, ty1] = range(A, 1), [gy0, gy1] = range(B, 1), [nx0, nx1] = range(C, 0);
  for (let i = 0; i < N; i++) {
    const ay = A[i * 3 + 1];
    T[i * 3] = ay <= -0.999 ? 0.06 + rnd() * 0.08 : 0.12 + 0.88 * (ay - ty0) / (ty1 - ty0);
    T[i * 3 + 1] = 0.05 + 0.95 * Math.pow((B[i * 3 + 1] - gy0) / (gy1 - gy0), 1.6);
    T[i * 3 + 2] = Math.min(1, Math.max(0, 0.08 + 0.9 * (C[i * 3] - nx0) / (nx1 - nx0) + (rnd() - 0.5) * 0.08));
  }
  const extra = new Float32Array(N * 4); // delay, tone, twinkle, warm flag
  const dir = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    extra[i * 4] = rnd(); extra[i * 4 + 1] = rnd(); extra[i * 4 + 2] = rnd() * 6.283; extra[i * 4 + 3] = rnd() < 0.045 ? 1 : 0;
    const gx = gauss(), gy = gauss(), gz = gauss(), m = Math.hypot(gx, gy, gz) || 1;
    dir[i * 3] = gx / m; dir[i * 3 + 1] = gy / m; dir[i * 3 + 2] = gz / m;
  }

  // --- GL program ----------------------------------------------------------------
  const VS = `
    attribute vec3 aA, aB, aC, aDir, aT; attribute vec4 aX;
    uniform vec3 uFrom, uTo; uniform float uP, uTime, uYaw, uPitch, uAspect, uSize, uShiftX, uShiftY, uScale, uHalo, uMouseS; uniform vec2 uMouse;
    varying float vAlpha; varying vec3 vCol; varying float vHalo;
    vec3 pick(vec3 w){ return aA*w.x + aB*w.y + aC*w.z; }
    vec3 heat(float t){
      vec3 c0 = vec3(0.42,0.11,0.54), c1 = vec3(0.72,0.20,0.48), c2 = vec3(0.90,0.28,0.50),
           c3 = vec3(0.96,0.48,0.24), c4 = vec3(0.99,0.71,0.29), c5 = vec3(0.99,0.94,0.66);
      if (t < 0.25) return mix(c0, c1, t/0.25);
      if (t < 0.45) return mix(c1, c2, (t-0.25)/0.2);
      if (t < 0.65) return mix(c2, c3, (t-0.45)/0.2);
      if (t < 0.85) return mix(c3, c4, (t-0.65)/0.2);
      return mix(c4, c5, (t-0.85)/0.15);
    }
    void main(){
      float lp = clamp((uP - aX.x*0.45)/0.55, 0.0, 1.0);
      lp = lp*lp*(3.0-2.0*lp);
      vec3 p = mix(pick(uFrom), pick(uTo), lp);
      p += aDir * 0.2 * sin(3.14159*lp);
      float terr = mix(uFrom.y, uTo.y, lp);
      p.y += terr * 0.045 * sin(p.x*3.2 + uTime*0.55) * cos(p.z*2.4 + uTime*0.4);
      float cy = cos(uYaw), sy = sin(uYaw), cp = cos(uPitch), sp = sin(uPitch);
      vec3 q = vec3(cy*p.x + sy*p.z, p.y, -sy*p.x + cy*p.z);
      q = vec3(q.x, cp*q.y - sp*q.z, sp*q.y + cp*q.z);
      q *= uScale;
      float dist = 4.6 - q.z;
      float f = 1.0 / tan(0.36);
      vec2 ndc = vec2((q.x*f/uAspect)/dist + uShiftX, (q.y*f)/dist + uShiftY);
      vec2 dm = ndc - uMouse; dm.x *= uAspect;
      float k = uMouseS * exp(-dot(dm, dm) / 0.03);
      vec2 push = normalize(dm + 1e-5) * 0.07 * k; push.x /= uAspect;
      ndc += push;
      gl_Position = vec4(ndc, 0.0, 1.0);
      gl_PointSize = uSize * (2.4 / dist) * mix(1.0, 3.4, uHalo);
      float depth = clamp((dist - 3.2)/2.6, 0.0, 1.0);
      float tw = 0.8 + 0.2*sin(uTime*1.3 + aX.z);
      vAlpha = (1.0 - depth*0.6) * tw * 0.55 * (1.0 + 1.4*k) * mix(1.0, 0.075, uHalo);
      vHalo = uHalo;
      float ct = mix(dot(aT, uFrom), dot(aT, uTo), lp);
      vCol = mix(heat(ct), vec3(1.0, 0.97, 0.9), aX.w * 0.8);
    }`;
  const FS = `
    precision mediump float; varying float vAlpha; varying vec3 vCol; varying float vHalo; uniform float uGain;
    void main(){
      vec2 c = gl_PointCoord - 0.5; float r = length(c);
      float a = smoothstep(0.5, 0.05, r); float core = smoothstep(0.22, 0.0, r); a = a*0.55 + core*0.75;
      if (vHalo > 0.5) a = smoothstep(0.5, 0.0, r) * smoothstep(0.5, 0.0, r);
      gl_FragColor = vec4(vCol * a * vAlpha * uGain, a * vAlpha * uGain);
    }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('shader', gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('link', gl.getProgramInfoLog(prog)); canvas.remove(); return; }
  gl.useProgram(prog);
  const attr = (name, data, size) => {
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  };
  attr('aA', A, 3); attr('aB', B, 3); attr('aC', C, 3); attr('aDir', dir, 3); attr('aX', extra, 4); attr('aT', T, 3);
  const U = {}; ['uFrom', 'uTo', 'uP', 'uTime', 'uYaw', 'uPitch', 'uAspect', 'uSize', 'uShiftX', 'uShiftY', 'uScale', 'uGain', 'uHalo', 'uMouse', 'uMouseS'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
  gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  const onehot = i => [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0];

  // --- layout ------------------------------------------------------------------------
  let w = 0, h = 0, dpr = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const narrow = w < 860;
    gl.uniform1f(U.uAspect, w / h);
    gl.uniform1f(U.uShiftX, narrow ? 0.0 : 0.42);
    gl.uniform1f(U.uShiftY, narrow ? -0.3 : -0.02);
    gl.uniform1f(U.uScale, narrow ? 0.5 : Math.min(0.78, 0.5 * (w / h) / 1.6 + 0.26));
    gl.uniform1f(U.uSize, (narrow ? 3.0 : 3.4) * dpr);
    gl.uniform1f(U.uGain, narrow ? 1.5 : 1.2);
  }

  // --- timeline ------------------------------------------------------------------------
  const HOLD = 7.0, MORPH = 2.8;
  let from = 0, to = 0, p = 1, phase = 'hold', clock = 0, last = 0, t = 0;
  let mx = 9, my = 9, ms = 0, msT = 0;
  let yaw = 0.6, yawT = 0, yawO = 0, pitch = 0.32, pitchT = 0.32, running = false, visible = true;
  const tabs = [...document.querySelectorAll('.morph-tab')];
  const cap = document.querySelector('.morph-cap');
  const CAPS = ['Energy, daylight and airflow models for buildings', 'Satellite data, GIS and spatial statistics', 'Gradient-boosting ensembles and data pipelines'];
  const readout = document.querySelector('.readout-live');
  function setActive(i) {
    tabs.forEach((b, k) => b.setAttribute('aria-pressed', k === i ? 'true' : 'false'));
    if (readout) readout.textContent = `webgl / ${N.toLocaleString('en-US')} particles / colour = ${i === 2 ? 'layer depth' : 'height'}`;
    if (cap) cap.textContent = CAPS[i];
  }
  function go(i) { if (i === to && phase === 'hold') return; from = (phase === 'morph' && p < 0.5) ? from : to; to = i; p = 0; phase = 'morph'; clock = 0; setActive(i); }
  tabs.forEach((b, i) => b.addEventListener('click', () => { go(i); if (reduce) { p = 1; phase = 'hold'; from = to; draw(); } }));

  function draw() {
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform3fv(U.uFrom, onehot(from)); gl.uniform3fv(U.uTo, onehot(to));
    gl.uniform1f(U.uP, p); gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uYaw, yaw + yawO); gl.uniform1f(U.uPitch, pitch);
    gl.uniform2f(U.uMouse, mx, my); gl.uniform1f(U.uMouseS, ms);
    gl.uniform1f(U.uHalo, 1); gl.drawArrays(gl.POINTS, 0, N);   // soft bloom pass
    gl.uniform1f(U.uHalo, 0); gl.drawArrays(gl.POINTS, 0, N);   // crisp points
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
    t += dt; clock += dt;
    yaw = 0.55 + 0.42 * Math.sin(t * 0.11);  // slow sway, keeps a three-quarter view
    yawO += (yawT - yawO) * 0.03;           // pointer influence eases in
    if (phase === 'morph') { p = Math.min(1, clock / MORPH); if (p >= 1) { phase = 'hold'; clock = 0; from = to; } }
    else if (clock > HOLD) go((to + 1) % SHAPES.length);
    const pv = phase === 'hold' ? Math.min(1, clock / HOLD) : 0;
    tabs.forEach((b, k) => b.style.setProperty('--p', k === to ? pv.toFixed(3) : '0'));
    pitch += (pitchT - pitch) * 0.03;
    ms += (msT - ms) * 0.06;
    draw();
    requestAnimationFrame(frame);
  }
  const startLoop = () => { if (!running && visible && !document.hidden && !reduce) { running = true; last = 0; requestAnimationFrame(frame); } };
  const stop = () => { running = false; };

  resize(); setActive(0); draw();
  const ready = () => requestAnimationFrame(() => hero.classList.add('is-ready'));
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(ready);
  setTimeout(ready, 900);

  let rt, lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - lastW) < 2) return;
    lastW = window.innerWidth; clearTimeout(rt); rt = setTimeout(() => { resize(); draw(); }, 120);
  });
  hero.addEventListener('pointermove', ev => {
    if (ev.pointerType !== 'mouse') return;
    const r = hero.getBoundingClientRect();
    yawT = ((ev.clientX - r.left) / r.width - 0.5) * 0.5;
    const cr = canvas.getBoundingClientRect();
    mx = ((ev.clientX - cr.left) / cr.width) * 2 - 1; my = 1 - ((ev.clientY - cr.top) / cr.height) * 2; msT = 1;
    pitchT = 0.32 + ((ev.clientY - r.top) / r.height - 0.5) * 0.25;
  });
  hero.addEventListener('pointerleave', () => { yawT = 0; pitchT = 0.32; msT = 0; });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? startLoop() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : startLoop()));
  startLoop();
})();
