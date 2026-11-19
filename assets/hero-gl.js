// Hero: a dense CAD / survey scan that rebuilds between three models sharing one pool of
// line segments and points: a district of towers (building physics), a contoured terrain
// (spatial data) and a layered network (machine learning). Raw WebGL: 1px lines with depth
// fog, thousands of fine scan points plus brighter key vertices with depth of field, one amber
// "measurement" layer per model, and smooth cursor parallax. Canvas fallback without WebGL.
(() => {
  const canvas = document.querySelector('.gl');
  if (!canvas) return;
  const hero = canvas.closest('.hero');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) { const s = document.createElement('script'); s.src = '/assets/terrain.js'; canvas.classList.replace('gl', 'terrain'); document.body.appendChild(s); return; }

  const small = window.matchMedia('(max-width: 860px)').matches;
  const NS = small ? 9000 : 20000;    // line segments per model
  const NP = small ? 7000 : 16000;    // points per model (scan dots + key vertices)

  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // segments: [x,y,z, x,y,z, hi]; points: [x,y,z, kind (0 scan, 1 key), hi]
  const seg = (o, a, b, hi = 0) => o.push([a[0], a[1], a[2], b[0], b[1], b[2], hi]);

  // ---- 01 a district of towers --------------------------------------------------------
  function district() {
    const segs = [], pts = [];
    const CUT = 0.32;
    const towers = [ // cx, cz, half w, half d, height, floor
      [-0.15, 0.0, 0.34, 0.27, 1.95, 0.055],
      [0.42, 0.12, 0.22, 0.22, 1.35, 0.055],
      [0.38, -0.42, 0.18, 0.15, 0.95, 0.055],
      [-0.75, 0.35, 0.22, 0.18, 0.85, 0.055],
      [-0.72, -0.38, 0.2, 0.24, 1.1, 0.055],
      [0.95, -0.05, 0.16, 0.2, 0.7, 0.055],
      [0.05, 0.62, 0.26, 0.14, 0.55, 0.055],
      [-1.15, -0.02, 0.14, 0.14, 0.5, 0.055],
      [0.9, 0.55, 0.14, 0.12, 0.42, 0.055],
    ];
    const Y0 = -1.0;
    for (const [cx, cz, hw, hd, ht, fl] of towers) {
      const y1 = Y0 + ht, corners = [[cx - hw, cz - hd], [cx + hw, cz - hd], [cx + hw, cz + hd], [cx - hw, cz + hd]];
      const nf = Math.round(ht / fl);
      for (let f = 0; f <= nf; f++) {
        const y = Y0 + f * fl;
        for (let i = 0; i < 4; i++) { const a = corners[i], b = corners[(i + 1) % 4]; seg(segs, [a[0], y, a[1]], [b[0], y, b[1]]); }
        if (f % 4 === 0) for (const c of corners) pts.push([c[0], y, c[1], 1, 0]);
      }
      // mullions and facade scan points
      for (let i = 0; i < 4; i++) {
        const a = corners[i], b = corners[(i + 1) % 4], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const n = Math.max(2, Math.round(len / 0.045));
        for (let k = 0; k <= n; k++) {
          const t = k / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
          seg(segs, [x, Y0, z], [x, y1, z]);
          for (let f = 0; f <= nf; f += 2) pts.push([x, Y0 + f * fl, z, 0, 0]);
        }
      }
      // roof cross-bracing
      seg(segs, [cx - hw, y1, cz - hd], [cx + hw, y1, cz + hd]); seg(segs, [cx + hw, y1, cz - hd], [cx - hw, y1, cz + hd]);
      // section cut at the slicing height, highlighted
      if (Y0 + ht > CUT - 0.6 && ht > 1.0) {
        const yc = CUT - 0.5, m = 0.025;
        const c = [[cx - hw - m, cz - hd - m], [cx + hw + m, cz - hd - m], [cx + hw + m, cz + hd + m], [cx - hw - m, cz + hd + m]];
        for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; seg(segs, [a[0], yc, a[1]], [b[0], yc, b[1]], 1); }
        for (const q of c) pts.push([q[0], yc, q[1], 1, 1]);
      }
    }
    // site grid, fine and wide
    for (let i = -30; i <= 30; i++) {
      const v = i * 0.07;
      seg(segs, [-2.2, Y0, v * 0.8], [2.2, Y0, v * 0.8]);
      seg(segs, [v * 1.05, Y0, -1.7], [v * 1.05, Y0, 1.7]);
    }
    for (let i = -30; i <= 30; i += 3) for (let j = -24; j <= 24; j += 3) pts.push([i * 0.0735, Y0, j * 0.07, 0, 0]);
    return { segs, pts };
  }

  // ---- 02 terrain ----------------------------------------------------------------------
  const P = new Uint8Array(512);
  (() => { const p = Array.from({ length: 256 }, (_, i) => i); for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; })();
  const G = new Float32Array(256).map((_, i) => P[i] / 127.5 - 1);
  const sm = t => t * t * (3 - 2 * t);
  const n2 = (x, y) => { const X = Math.floor(x), Y = Math.floor(y), u = sm(x - X), v = sm(y - Y);
    const a = G[P[(X & 255) + P[Y & 255]]], b = G[P[((X + 1) & 255) + P[Y & 255]]], c = G[P[(X & 255) + P[(Y + 1) & 255]]], d = G[P[((X + 1) & 255) + P[(Y + 1) & 255]]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };

  function terrain() {
    const segs = [], pts = [];
    const NX = 110, NZ = 78, X0 = -2.3, X1 = 2.3, Z0 = -1.7, Z1 = 1.7;
    const H = (x, z) => (0.6 * n2(x * 1.05 + 3, z * 1.05 + 1) + 0.28 * n2(x * 2.4, z * 2.4 + 9) + 0.08 * n2(x * 6, z * 6 + 4)) * 0.85 - 0.35;
    const grid = [];
    for (let j = 0; j <= NZ; j++) { grid[j] = []; for (let i = 0; i <= NX; i++) {
      const x = X0 + (X1 - X0) * i / NX, z = Z0 + (Z1 - Z0) * j / NZ; grid[j][i] = [x, H(x, z), z]; } }
    for (let j = 0; j <= NZ; j += 2) for (let i = 0; i < NX; i++) seg(segs, grid[j][i], grid[j][i + 1]);
    for (let i = 0; i <= NX; i += 4) for (let j = 0; j < NZ; j++) seg(segs, grid[j][i], grid[j + 1][i]);
    let lo = 1e9, hi = -1e9; for (const r of grid) for (const p of r) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
    const LV = 22;
    for (let k = 1; k < LV; k++) {
      const L = lo + (hi - lo) * k / LV, isHi = k === 15 ? 1 : 0;
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], d = grid[j + 1][i], e = [];
        const edge = (p, q) => { if ((p[1] > L) !== (q[1] > L)) { const t = (L - p[1]) / (q[1] - p[1]); e.push([p[0] + (q[0] - p[0]) * t, L + 0.003, p[2] + (q[2] - p[2]) * t]); } };
        edge(a, b); edge(b, c); edge(c, d); edge(d, a);
        if (e.length >= 2) seg(segs, e[0], e[1], isHi);
        if (e.length === 4) seg(segs, e[2], e[3], isHi);
      }
    }
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const p = grid[j][i]; pts.push([p[0], p[1], p[2], 0, 0]); }
    for (let j = 4; j < NZ - 3; j += 4) for (let i = 4; i < NX - 3; i += 4) {
      const p = grid[j][i];
      const peak = p[1] > grid[j][i - 4][1] && p[1] > grid[j][i + 4][1] && p[1] > grid[j - 4][i][1] && p[1] > grid[j + 4][i][1];
      if (peak || (i + j) % 16 === 0) pts.push([p[0], p[1], p[2], 1, peak ? 1 : 0]);
    }
    return { segs, pts };
  }

  // ---- 03 network ----------------------------------------------------------------------
  function network() {
    const segs = [], pts = [];
    const layers = [10, 18, 26, 26, 18, 10, 4];
    const nodes = layers.map((n, li) => {
      const x = -1.8 + (3.6 * li) / (layers.length - 1);
      return Array.from({ length: n }, (_, j) => {
        const a = (j / n) * Math.PI * 2 + li * 0.45, r = 0.18 + 0.032 * n;
        return [x, Math.sin(a) * r, Math.cos(a) * r * 0.85];
      });
    });
    const path = nodes.map((l, li) => l[(li * 5 + 2) % l.length]);
    for (let l = 0; l < nodes.length - 1; l++) for (const a of nodes[l]) for (const b of nodes[l + 1]) {
      const hi = path[l] === a && path[l + 1] === b ? 1 : 0;
      seg(segs, a, b, hi);
      // signal points travelling along edges
      const n = hi ? 14 : 2;
      for (let k = 0; k < n; k++) { const t = rnd(); pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 0, hi]); }
    }
    for (let l = 0; l < nodes.length; l++) {
      for (const n of nodes[l]) {
        const hi = path[l] === n ? 1 : 0, r = 0.04, m = 14;
        for (let k = 0; k < m; k++) {
          const a0 = (k / m) * Math.PI * 2, a1 = ((k + 1) / m) * Math.PI * 2;
          seg(segs, [n[0], n[1] + Math.sin(a0) * r, n[2] + Math.cos(a0) * r], [n[0], n[1] + Math.sin(a1) * r, n[2] + Math.cos(a1) * r], hi);
        }
        pts.push([n[0], n[1], n[2], 1, hi]);
        for (let k = 0; k < 18; k++) pts.push([n[0] + gauss() * 0.022, n[1] + gauss() * 0.022, n[2] + gauss() * 0.022, 0, hi]);
      }
      const R = 0.18 + 0.032 * layers[l] + 0.16, x = nodes[l][0][0];
      for (let k = 0; k < 64; k++) {
        const a0 = (k / 64) * Math.PI * 2, a1 = ((k + 1) / 64) * Math.PI * 2;
        if (k % 2 === 0) seg(segs, [x, Math.sin(a0) * R, Math.cos(a0) * R * 0.85], [x, Math.sin(a1) * R, Math.cos(a1) * R * 0.85]);
      }
    }
    // a loose field of embedding points around the graph
    for (let k = 0; k < 2600; k++) { const x = (rnd() - 0.5) * 4.2; pts.push([x, gauss() * 0.55, gauss() * 0.5, 0, 0]); }
    return { segs, pts };
  }

  function resample(model) {
    let total = 0; for (const s of model.segs) total += Math.hypot(s[3] - s[0], s[4] - s[1], s[5] - s[2]);
    let target = total / NS, out = [];
    for (let pass = 0; pass < 10; pass++) {
      out = [];
      for (const s of model.segs) {
        const len = Math.hypot(s[3] - s[0], s[4] - s[1], s[5] - s[2]), n = Math.max(1, Math.floor(len / target));
        for (let i = 0; i < n; i++) {
          const t0 = i / n, t1 = (i + 1) / n;
          out.push([s[0] + (s[3] - s[0]) * t0, s[1] + (s[4] - s[1]) * t0, s[2] + (s[5] - s[2]) * t0,
                    s[0] + (s[3] - s[0]) * t1, s[1] + (s[4] - s[1]) * t1, s[2] + (s[5] - s[2]) * t1, s[6]]);
        }
      }
      if (out.length <= NS) break;
      target *= 1.07;
    }
    if (out.length > NS) out.length = NS;
    while (out.length < NS) { const s = out[Math.floor(rnd() * out.length)]; out.push([s[0], s[1], s[2], s[0], s[1], s[2], s[6]]); }
    out.sort((a, b) => (a[0] + a[3] + 0.35 * (a[2] + a[5])) - (b[0] + b[3] + 0.35 * (b[2] + b[5])));
    let pts = model.pts.slice();
    // keep every key vertex, sample scan points to fit
    const keys = pts.filter(p => p[3] === 1), scan = pts.filter(p => p[3] === 0);
    for (let i = scan.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [scan[i], scan[j]] = [scan[j], scan[i]]; }
    pts = keys.slice(0, NP).concat(scan.slice(0, Math.max(0, NP - keys.length)));
    while (pts.length < NP) pts.push(pts[Math.floor(rnd() * pts.length)]);
    pts.sort((a, b) => (a[0] + 0.35 * a[2]) - (b[0] + 0.35 * b[2]));
    return { segs: out, pts };
  }
  const MODELS = [district(), terrain(), network()].map(resample);

  // ---- buffers ----------------------------------------------------------------------------
  const LV = NS * 2;
  const lp = [0, 1, 2].map(() => new Float32Array(LV * 3)), lh = new Float32Array(LV * 3), lk = new Float32Array(LV * 3), lo = new Float32Array(LV);
  for (let m = 0; m < 3; m++) for (let i = 0; i < NS; i++) {
    const s = MODELS[m].segs[i];
    lp[m].set([s[0], s[1], s[2], s[3], s[4], s[5]], i * 6);
    lh[i * 6 + m] = s[6]; lh[i * 6 + 3 + m] = s[6];
  }
  for (let i = 0; i < NS; i++) { lo[i * 2] = lo[i * 2 + 1] = i / NS; }
  const pp = [0, 1, 2].map(() => new Float32Array(NP * 3)), ph = new Float32Array(NP * 3), pk = new Float32Array(NP * 3), po = new Float32Array(NP);
  for (let m = 0; m < 3; m++) for (let i = 0; i < NP; i++) {
    const q = MODELS[m].pts[i];
    pp[m].set([q[0], q[1], q[2]], i * 3); pk[i * 3 + m] = q[3]; ph[i * 3 + m] = q[4];
  }
  for (let i = 0; i < NP; i++) po[i] = i / NP;

  const COMMON = `
    attribute vec3 aA, aB, aC, aHi, aKind; attribute float aO;
    uniform vec3 uFrom, uTo; uniform float uP, uTime, uYaw, uPitch, uAspect, uScale, uShiftX, uShiftY;
    varying float vFog, vHi, vFocus, vKind;
    vec3 pick(vec3 w){ return aA*w.x + aB*w.y + aC*w.z; }
    vec4 place(){
      float t = clamp((uP - aO*0.55)/0.45, 0.0, 1.0); t = t*t*(3.0-2.0*t);
      vec3 p = mix(pick(uFrom), pick(uTo), t);
      p.y += 0.05 * sin(3.14159*t);
      vHi = mix(dot(aHi, uFrom), dot(aHi, uTo), t);
      vKind = mix(dot(aKind, uFrom), dot(aKind, uTo), t);
      float cy = cos(uYaw), sy = sin(uYaw), cp = cos(uPitch), sp = sin(uPitch);
      vec3 q = vec3(cy*p.x + sy*p.z, p.y, -sy*p.x + cy*p.z);
      q = vec3(q.x, cp*q.y - sp*q.z, sp*q.y + cp*q.z) * uScale;
      float dist = 4.6 - q.z, f = 1.0/tan(0.36);
      vFog = clamp(1.0 - (dist - 3.2)/2.8, 0.05, 1.0);
      vFocus = abs(dist - 4.3);
      return vec4((q.x*f/uAspect)/dist + uShiftX, (q.y*f)/dist + uShiftY, 0.0, 1.0);
    }`;
  const LINE_VS = COMMON + `void main(){ gl_Position = place(); }`;
  const LINE_FS = `
    precision mediump float; varying float vFog, vHi, vFocus, vKind; uniform float uGain;
    void main(){
      vec3 base = vec3(0.957, 0.957, 0.941), amber = vec3(0.898, 0.663, 0.235);
      float a = mix(0.2, 0.9, vHi) * vFog * uGain;
      gl_FragColor = vec4(mix(base, amber, vHi) * a, a);
    }`;
  const PT_VS = COMMON + `
    uniform float uSize;
    void main(){
      gl_Position = place();
      float s = mix(1.35, 2.4, vKind) * (1.0 + vHi*0.4);
      gl_PointSize = uSize * s * (1.0 + vFocus * mix(0.5, 1.5, vKind));
    }`;
  const PT_FS = `
    precision mediump float; varying float vFog, vHi, vFocus, vKind; uniform float uGain;
    void main(){
      vec2 c = gl_PointCoord - 0.5; float r = length(c);
      float blur = clamp(vFocus * 1.1, 0.0, 0.6);
      float core = 1.0 - smoothstep(0.2 - blur*0.12, 0.26 + blur*0.22, r);
      float ring = (1.0 - smoothstep(0.02, 0.06, abs(r - 0.4))) * (1.0 - blur) * vHi * vKind;
      vec3 base = vec3(0.957, 0.957, 0.941), amber = vec3(0.898, 0.663, 0.235);
      float a = (core * mix(0.62, 1.0, max(vKind, vHi)) * (1.0 - blur*0.6) + ring*0.8) * vFog * uGain;
      gl_FragColor = vec4(mix(base, amber, vHi) * a, a);
    }`;
  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s)); return s; };
  const program = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(p)); return null; } return p; };
  const lineProg = program(LINE_VS, LINE_FS), ptProg = program(PT_VS, PT_FS);
  if (!lineProg || !ptProg) { canvas.remove(); return; }
  const UN = ['uFrom', 'uTo', 'uP', 'uTime', 'uYaw', 'uPitch', 'uAspect', 'uScale', 'uShiftX', 'uShiftY', 'uGain', 'uSize'];
  const setup = (prog, P3, H3, K3, O1) => {
    const bufs = [];
    const add = (name, data, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); bufs.push([gl.getAttribLocation(prog, name), b, size]); };
    add('aA', P3[0], 3); add('aB', P3[1], 3); add('aC', P3[2], 3); add('aHi', H3, 3); add('aKind', K3, 3); add('aO', O1, 1);
    const u = {}; UN.forEach(n => u[n] = gl.getUniformLocation(prog, n));
    return { prog, bufs, u };
  };
  const LINES = setup(lineProg, lp, lh, lk, lo), PTS = setup(ptProg, pp, ph, pk, po);
  gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  // ---- layout and state ------------------------------------------------------------------
  let w = 0, h = 0, dpr = 1, narrow = false;
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = r.width; h = r.height; narrow = w < 860;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  const onehot = i => [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0];
  const HOLD = 8, MORPH = 2.8;
  let from = 0, to = 0, p = 1, phase = 'hold', clock = 0, last = 0, t = 0;
  let yaw = 0.6, yawO = 0, yawT = 0, pitch = 0.42, pitchT = 0.42, running = false, visible = true;
  const tabs = [...document.querySelectorAll('.morph-tab')];

  function uniforms(o) {
    const u = o.u;
    gl.useProgram(o.prog);
    for (const [loc, b, size] of o.bufs) { if (loc < 0) continue; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); }
    gl.uniform3fv(u.uFrom, onehot(from)); gl.uniform3fv(u.uTo, onehot(to));
    gl.uniform1f(u.uP, p); gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uYaw, yaw + yawO); gl.uniform1f(u.uPitch, pitch);
    gl.uniform1f(u.uAspect, w / h);
    gl.uniform1f(u.uScale, narrow ? 0.5 : Math.min(1.02, 0.56 * (w / h) / 1.6 + 0.4));
    gl.uniform1f(u.uShiftX, narrow ? 0.0 : 0.2); gl.uniform1f(u.uShiftY, narrow ? 0.42 : 0.22);
    gl.uniform1f(u.uGain, narrow ? 0.85 : 1.0);
    if (u.uSize) gl.uniform1f(u.uSize, (narrow ? 1.6 : 1.8) * dpr);
  }
  function draw() {
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    uniforms(LINES); gl.drawArrays(gl.LINES, 0, LV);
    uniforms(PTS); gl.drawArrays(gl.POINTS, 0, NP);
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
    yaw = 0.6 + 0.32 * Math.sin(t * 0.09);
    yawO += (yawT - yawO) * 0.035; pitch += (pitchT - pitch) * 0.035;
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
    yawT = ((ev.clientX - r.left) / r.width - 0.5) * 0.4;
    pitchT = 0.42 + ((ev.clientY - r.top) / r.height - 0.5) * 0.2;
  });
  hero.addEventListener('pointerleave', () => { yawT = 0; pitchT = 0.42; });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? startLoop() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : startLoop()));
  startLoop();
})();
