// Hero: a CAD-style spatial scan. Three wireframe models share one pool of line segments and
// key vertices and rebuild into each other: a tower massing (building physics), a contoured
// terrain (spatial data) and a layered network (machine learning). Raw WebGL: 1px lines with
// depth fog, crisp vertex markers with depth-of-field, one amber "measurement" layer per model,
// cursor parallax and a local wave field. Falls back to the canvas terrain without WebGL.
(() => {
  const canvas = document.querySelector('.gl');
  if (!canvas) return;
  const hero = canvas.closest('.hero');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) { const s = document.createElement('script'); s.src = '/assets/terrain.js'; canvas.classList.replace('gl', 'terrain'); document.body.appendChild(s); return; }

  const small = window.matchMedia('(max-width: 860px)').matches;
  const NS = small ? 4200 : 7600;   // line segments per model
  const NK = small ? 420 : 760;     // key vertices per model

  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ---- geometry helpers --------------------------------------------------------------
  // A model is { segs: [[x,y,z, x,y,z, hi], ...], keys: [[x,y,z, hi], ...] }
  function seg(out, a, b, hi = 0) { out.push([a[0], a[1], a[2], b[0], b[1], b[2], hi]); }
  function rectXZ(out, cx, cz, hw, hd, y, hi) {
    const p = [[cx - hw, y, cz - hd], [cx + hw, y, cz - hd], [cx + hw, y, cz + hd], [cx - hw, y, cz + hd]];
    for (let i = 0; i < 4; i++) seg(out, p[i], p[(i + 1) % 4], hi);
    return p;
  }

  function building() {
    const segs = [], keys = [];
    const masses = [ // cx, cz, half width, half depth, y0, y1
      [0.0, 0.0, 0.95, 0.62, -1.0, -0.6],
      [-0.28, 0.0, 0.42, 0.34, -0.6, 1.15],
      [0.42, 0.05, 0.28, 0.28, -0.6, 0.42],
    ];
    const FLOOR = 0.1, CUT = 0.3;
    for (const [cx, cz, hw, hd, y0, y1] of masses) {
      const nf = Math.round((y1 - y0) / FLOOR);
      for (let f = 0; f <= nf; f++) {
        const y = y0 + f * FLOOR;
        const corners = rectXZ(segs, cx, cz, hw, hd, y, 0);
        for (const c of corners) keys.push([c[0], c[1], c[2], 0]);
      }
      const step = 0.14;
      const run = (ax, az, bx, bz) => {
        const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / step));
        for (let i = 0; i <= n; i++) {
          const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
          seg(segs, [x, y0, z], [x, y1, z], 0);
        }
      };
      run(cx - hw, cz - hd, cx + hw, cz - hd); run(cx + hw, cz - hd, cx + hw, cz + hd);
      run(cx + hw, cz + hd, cx - hw, cz + hd); run(cx - hw, cz + hd, cx - hw, cz - hd);
      // section cut: the plane the WWR tool slices at, highlighted
      if (y0 < CUT && y1 > CUT) {
        const p = rectXZ(segs, cx, cz, hw + 0.035, hd + 0.035, CUT, 1);
        for (const c of p) keys.push([c[0], c[1], c[2], 1]);
      }
    }
    for (let i = -8; i <= 8; i++) {
      const v = i * 0.2;
      seg(segs, [-1.6, -1.0, v * 0.8], [1.6, -1.0, v * 0.8], 0);
      seg(segs, [v, -1.0, -1.3], [v, -1.0, 1.3], 0);
    }
    return { segs, keys };
  }

  const P = new Uint8Array(512);
  (() => { const p = Array.from({ length: 256 }, (_, i) => i); for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; })();
  const G = new Float32Array(256).map((_, i) => P[i] / 127.5 - 1);
  const sm = t => t * t * (3 - 2 * t);
  const n2 = (x, y) => { const X = Math.floor(x), Y = Math.floor(y), u = sm(x - X), v = sm(y - Y);
    const a = G[P[(X & 255) + P[Y & 255]]], b = G[P[((X + 1) & 255) + P[Y & 255]]], c = G[P[(X & 255) + P[(Y + 1) & 255]]], d = G[P[((X + 1) & 255) + P[(Y + 1) & 255]]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };

  function terrain() {
    const segs = [], keys = [];
    const NX = 44, NZ = 32, X0 = -1.7, X1 = 1.7, Z0 = -1.25, Z1 = 1.25;
    const H = (x, z) => {
      const fall = Math.max(0, 1 - Math.pow(Math.hypot(x / 1.7, z / 1.25), 4));
      return (0.62 * n2(x * 1.3 + 3, z * 1.3 + 1) + 0.25 * n2(x * 3, z * 3 + 9)) * 0.8 * (0.3 + 0.7 * fall) - 0.25;
    };
    const grid = [];
    for (let j = 0; j <= NZ; j++) { grid[j] = []; for (let i = 0; i <= NX; i++) {
      const x = X0 + (X1 - X0) * i / NX, z = Z0 + (Z1 - Z0) * j / NZ; grid[j][i] = [x, H(x, z), z]; } }
    for (let j = 0; j <= NZ; j += 2) for (let i = 0; i < NX; i++) seg(segs, grid[j][i], grid[j][i + 1], 0);
    for (let i = 0; i <= NX; i += 2) for (let j = 0; j < NZ; j++) seg(segs, grid[j][i], grid[j + 1][i], 0);
    let lo = 1e9, hi = -1e9; for (const r of grid) for (const p of r) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
    const LV = 9;
    for (let k = 1; k < LV; k++) {
      const L = lo + (hi - lo) * k / LV, isHi = k === 6 ? 1 : 0, lift = 0.004;
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], d = grid[j + 1][i];
        const e = [];
        const edge = (p, q) => { if ((p[1] > L) !== (q[1] > L)) { const t = (L - p[1]) / (q[1] - p[1]); e.push([p[0] + (q[0] - p[0]) * t, L + lift, p[2] + (q[2] - p[2]) * t]); } };
        edge(a, b); edge(b, c); edge(c, d); edge(d, a);
        if (e.length >= 2) seg(segs, e[0], e[1], isHi);
        if (e.length === 4) seg(segs, e[2], e[3], isHi);
      }
    }
    for (let j = 2; j < NZ - 1; j += 3) for (let i = 2; i < NX - 1; i += 3) {
      const p = grid[j][i];
      const peak = p[1] > grid[j][i - 2][1] && p[1] > grid[j][i + 2][1] && p[1] > grid[j - 2][i][1] && p[1] > grid[j + 2][i][1];
      keys.push([p[0], p[1], p[2], peak ? 1 : 0]);
    }
    return { segs, keys };
  }

  function network() {
    const segs = [], keys = [];
    const layers = [5, 8, 11, 8, 3];
    const nodes = layers.map((n, li) => {
      const x = -1.45 + (2.9 * li) / (layers.length - 1);
      return Array.from({ length: n }, (_, j) => {
        const a = (j / n) * Math.PI * 2 + li * 0.5, r = 0.12 + 0.055 * n;
        return [x, Math.sin(a) * r, Math.cos(a) * r * 0.8];
      });
    });
    const path = nodes.map((l, li) => l[(li * 3 + 1) % l.length]);
    for (let l = 0; l < nodes.length - 1; l++) for (const a of nodes[l]) for (const b of nodes[l + 1]) {
      seg(segs, a, b, path[l] === a && path[l + 1] === b ? 1 : 0);
    }
    for (let l = 0; l < nodes.length; l++) {
      for (const n of nodes[l]) {
        const hi = path[l] === n ? 1 : 0, r = 0.045, m = 10;
        for (let k = 0; k < m; k++) {
          const a0 = (k / m) * Math.PI * 2, a1 = ((k + 1) / m) * Math.PI * 2;
          seg(segs, [n[0], n[1] + Math.sin(a0) * r, n[2] + Math.cos(a0) * r], [n[0], n[1] + Math.sin(a1) * r, n[2] + Math.cos(a1) * r], hi);
        }
        keys.push([n[0], n[1], n[2], hi]);
      }
      const R = 0.12 + 0.055 * layers[l] + 0.12, x = nodes[l][0][0];
      for (let k = 0; k < 24; k++) {
        const a0 = (k / 24) * Math.PI * 2, a1 = ((k + 1) / 24) * Math.PI * 2;
        if (k % 2) seg(segs, [x, Math.sin(a0) * R, Math.cos(a0) * R * 0.8], [x, Math.sin(a1) * R, Math.cos(a1) * R * 0.8], 0);
      }
    }
    return { segs, keys };
  }

  function resample(model) {
    let total = 0; for (const s of model.segs) total += Math.hypot(s[3] - s[0], s[4] - s[1], s[5] - s[2]);
    let target = total / NS, out = [];
    for (let pass = 0; pass < 8; pass++) {
      out = [];
      for (const s of model.segs) {
        const len = Math.hypot(s[3] - s[0], s[4] - s[1], s[5] - s[2]);
        const n = Math.max(1, Math.floor(len / target));
        for (let i = 0; i < n; i++) {
          const t0 = i / n, t1 = (i + 1) / n;
          out.push([s[0] + (s[3] - s[0]) * t0, s[1] + (s[4] - s[1]) * t0, s[2] + (s[5] - s[2]) * t0,
                    s[0] + (s[3] - s[0]) * t1, s[1] + (s[4] - s[1]) * t1, s[2] + (s[5] - s[2]) * t1, s[6]]);
        }
      }
      if (out.length <= NS) break;
      target *= 1.08;
    }
    if (out.length > NS) out.length = NS;
    while (out.length < NS) { const s = out[Math.floor(rnd() * out.length)]; out.push([s[0], s[1], s[2], s[0], s[1], s[2], s[6]]); }
    out.sort((a, b) => (a[0] + a[3] + 0.35 * (a[2] + a[5])) - (b[0] + b[3] + 0.35 * (b[2] + b[5])));
    let keys = model.keys.slice();
    while (keys.length < NK) keys.push(keys[Math.floor(rnd() * keys.length)]);
    if (keys.length > NK) { for (let i = keys.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [keys[i], keys[j]] = [keys[j], keys[i]]; } keys = keys.slice(0, NK); }
    keys.sort((a, b) => (a[0] + 0.35 * a[2]) - (b[0] + 0.35 * b[2]));
    return { segs: out, keys };
  }
  const MODELS = [building(), terrain(), network()].map(resample);

  const LV = NS * 2;
  const lp = [new Float32Array(LV * 3), new Float32Array(LV * 3), new Float32Array(LV * 3)];
  const lh = new Float32Array(LV * 3), lo = new Float32Array(LV);
  for (let m = 0; m < 3; m++) {
    const S = MODELS[m].segs;
    for (let i = 0; i < NS; i++) {
      const s = S[i];
      lp[m].set([s[0], s[1], s[2], s[3], s[4], s[5]], i * 6);
      lh[(i * 2) * 3 + m] = s[6]; lh[(i * 2 + 1) * 3 + m] = s[6];
    }
  }
  for (let i = 0; i < NS; i++) { lo[i * 2] = i / NS; lo[i * 2 + 1] = i / NS; }
  const kp = [new Float32Array(NK * 3), new Float32Array(NK * 3), new Float32Array(NK * 3)];
  const kh = new Float32Array(NK * 3), ko = new Float32Array(NK);
  for (let m = 0; m < 3; m++) for (let i = 0; i < NK; i++) { const k = MODELS[m].keys[i]; kp[m].set([k[0], k[1], k[2]], i * 3); kh[i * 3 + m] = k[3]; }
  for (let i = 0; i < NK; i++) ko[i] = i / NK;

  const COMMON = `
    attribute vec3 aA, aB, aC, aHi; attribute float aO;
    uniform vec3 uFrom, uTo; uniform float uP, uTime, uYaw, uPitch, uAspect, uScale, uShiftX, uShiftY, uWave;
    uniform vec2 uMouse;
    varying float vFog, vHi, vFocus;
    vec3 pick(vec3 w){ return aA*w.x + aB*w.y + aC*w.z; }
    vec4 place(){
      float t = clamp((uP - aO*0.55)/0.45, 0.0, 1.0); t = t*t*(3.0-2.0*t);
      vec3 p = mix(pick(uFrom), pick(uTo), t);
      p.y += 0.06 * sin(3.14159*t);
      vHi = mix(dot(aHi, uFrom), dot(aHi, uTo), t);
      float cy = cos(uYaw), sy = sin(uYaw), cp = cos(uPitch), sp = sin(uPitch);
      vec3 q = vec3(cy*p.x + sy*p.z, p.y, -sy*p.x + cy*p.z);
      q = vec3(q.x, cp*q.y - sp*q.z, sp*q.y + cp*q.z) * uScale;
      float dist = 4.6 - q.z, f = 1.0/tan(0.36);
      vec2 ndc = vec2((q.x*f/uAspect)/dist + uShiftX, (q.y*f)/dist + uShiftY);
      vec2 dm = ndc - uMouse; dm.x *= uAspect;
      float r = length(dm);
      float k = uWave * exp(-r*r/0.05);
      ndc.y += k * 0.022 * sin(r*42.0 - uTime*4.0);
      vFog = clamp(1.0 - (dist - 3.4)/2.4, 0.08, 1.0);
      vFocus = abs(dist - 4.1);
      return vec4(ndc, 0.0, 1.0);
    }`;
  const LINE_VS = COMMON + `
    void main(){ gl_Position = place(); }`;
  const LINE_FS = `
    precision mediump float; varying float vFog, vHi, vFocus; uniform float uGain;
    void main(){
      vec3 base = vec3(0.957, 0.957, 0.941), amber = vec3(0.898, 0.663, 0.235);
      float a = mix(0.24, 0.9, vHi) * vFog * uGain;
      gl_FragColor = vec4(mix(base, amber, vHi) * a, a);
    }`;
  const KEY_VS = COMMON + `
    uniform float uSize;
    void main(){ gl_Position = place(); gl_PointSize = uSize * (1.0 + vFocus*3.2) * (1.0 + vHi*0.6); }`;
  const KEY_FS = `
    precision mediump float; varying float vFog, vHi, vFocus; uniform float uGain;
    void main(){
      vec2 c = gl_PointCoord - 0.5; float r = length(c);
      float blur = clamp(vFocus*1.6, 0.0, 0.85);
      float core = 1.0 - smoothstep(0.18 - blur*0.12, 0.22 + blur*0.25, r);
      float ring = (1.0 - smoothstep(0.02, 0.06, abs(r - 0.38))) * (1.0 - blur) * vHi;
      vec3 base = vec3(0.957, 0.957, 0.941), amber = vec3(0.898, 0.663, 0.235);
      float a = (core * mix(0.75, 1.0, vHi) * (1.0 - blur*0.7) + ring*0.8) * vFog * uGain;
      gl_FragColor = vec4(mix(base, amber, vHi) * a, a);
    }`;

  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s)); return s; };
  const program = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(p)); return null; } return p; };
  const lineProg = program(LINE_VS, LINE_FS), keyProg = program(KEY_VS, KEY_FS);
  if (!lineProg || !keyProg) { canvas.remove(); return; }
  const UN = ['uFrom', 'uTo', 'uP', 'uTime', 'uYaw', 'uPitch', 'uAspect', 'uScale', 'uShiftX', 'uShiftY', 'uWave', 'uMouse', 'uGain', 'uSize'];
  const setup = (prog, P3, H3, O1) => {
    const bufs = [];
    const add = (name, data, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); bufs.push([gl.getAttribLocation(prog, name), b, size]); };
    add('aA', P3[0], 3); add('aB', P3[1], 3); add('aC', P3[2], 3); add('aHi', H3, 3); add('aO', O1, 1);
    const u = {}; UN.forEach(n => u[n] = gl.getUniformLocation(prog, n));
    return { prog, bufs, u };
  };
  const LINES = setup(lineProg, lp, lh, lo), KEYS = setup(keyProg, kp, kh, ko);
  gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let w = 0, h = 0, dpr = 1, narrow = false;
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = r.width; h = r.height; narrow = w < 860;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  const onehot = i => [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0];
  const HOLD = 7.5, MORPH = 2.6;
  let from = 0, to = 0, p = 1, phase = 'hold', clock = 0, last = 0, t = 0;
  let yaw = 0.62, yawO = 0, yawT = 0, pitch = 0.36, pitchT = 0.36, mx = 9, my = 9, wave = 0, waveT = 0;
  let running = false, visible = true;
  const tabs = [...document.querySelectorAll('.morph-tab')];

  function uniforms(o) {
    const u = o.u;
    gl.useProgram(o.prog);
    for (const [loc, b, size] of o.bufs) { if (loc < 0) continue; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); }
    gl.uniform3fv(u.uFrom, onehot(from)); gl.uniform3fv(u.uTo, onehot(to));
    gl.uniform1f(u.uP, p); gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uYaw, yaw + yawO); gl.uniform1f(u.uPitch, pitch);
    gl.uniform1f(u.uAspect, w / h);
    gl.uniform1f(u.uScale, narrow ? 0.4 : Math.min(0.74, 0.48 * (w / h) / 1.6 + 0.25));
    gl.uniform1f(u.uShiftX, narrow ? 0.0 : 0.43); gl.uniform1f(u.uShiftY, narrow ? -0.34 : 0.09);
    gl.uniform1f(u.uWave, wave); gl.uniform2f(u.uMouse, mx, my);
    gl.uniform1f(u.uGain, narrow ? 0.7 : 1.0);
    if (u.uSize) gl.uniform1f(u.uSize, (narrow ? 3.0 : 3.6) * dpr);
  }
  function draw() {
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    uniforms(LINES); gl.drawArrays(gl.LINES, 0, LV);
    uniforms(KEYS); gl.drawArrays(gl.POINTS, 0, NK);
  }
  function setActive(i) { tabs.forEach((b, k) => b.setAttribute('aria-pressed', k === i ? 'true' : 'false')); }
  function go(i) { if (i === to && phase === 'hold') return; from = phase === 'morph' && p < 0.5 ? from : to; to = i; p = 0; phase = 'morph'; clock = 0; setActive(i); }
  tabs.forEach((b, i) => b.addEventListener('click', () => { go(i); if (reduce) { p = 1; phase = 'hold'; from = to; draw(); } }));

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
    t += dt; clock += dt;
    if (phase === 'morph') { p = Math.min(1, clock / MORPH); if (p >= 1) { phase = 'hold'; clock = 0; from = to; } }
    else if (clock > HOLD) go((to + 1) % 3);
    const pv = phase === 'hold' ? Math.min(1, clock / HOLD) : 0;
    tabs.forEach((b, k) => b.style.setProperty('--p', k === to ? pv.toFixed(3) : '0'));
    yaw = 0.62 + 0.38 * Math.sin(t * 0.1);
    yawO += (yawT - yawO) * 0.04; pitch += (pitchT - pitch) * 0.04; wave += (waveT - wave) * 0.05;
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
    const r = canvas.getBoundingClientRect();
    const nx = (ev.clientX - r.left) / r.width, ny = (ev.clientY - r.top) / r.height;
    yawT = (nx - 0.5) * 0.45; pitchT = 0.36 + (ny - 0.5) * 0.22;
    mx = nx * 2 - 1; my = 1 - ny * 2; waveT = 1;
  });
  hero.addEventListener('pointerleave', () => { yawT = 0; pitchT = 0.36; waveT = 0; });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? startLoop() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : startLoop()));
  startLoop();
})();
