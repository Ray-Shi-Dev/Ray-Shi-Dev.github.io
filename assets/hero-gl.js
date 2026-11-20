// Hero: a dense line-and-point installation that rebuilds between three models sharing one pool
// of segments and points: twisted towers in a wind field under Tainan's sun-path dome (building
// physics), a contoured terrain (spatial data) and a rolled data manifold unrolled layer by layer
// (machine learning). Raw WebGL: 1px lines with depth fog, fine scan points and brighter key
// vertices with depth of field, one amber measurement per model, smooth cursor parallax.
(() => {
  const canvas = document.querySelector('.gl');
  if (!canvas) return;
  const hero = canvas.closest('.hero');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) { const s = document.createElement('script'); s.src = '/assets/terrain.js'; canvas.classList.replace('gl', 'terrain'); document.body.appendChild(s); return; }

  const small = window.matchMedia('(max-width: 860px)').matches;
  const NS = small ? 10000 : 26000;    // line segments per model
  const NP = small ? 7000 : 16000;    // points per model (scan dots + key vertices)

  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // probes: { p:[x,y,z], rows:[title, ...] } readouts computed from each model; anchors: { p, label }
  const fx = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('-', '\u2212');
  const compass = a => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((a % 360) + 360) % 360 / 45) % 8];
  // segments: [x,y,z, x,y,z, hi]; points: [x,y,z, kind (0 scan, 1 key), hi]
  const seg = (o, a, b, hi = 0) => o.push([a[0], a[1], a[2], b[0], b[1], b[2], hi]);

  // ---- 01 building physics: twisted towers in a wind field under a sun-path dome ----------
  const Q = small ? 0.5 : 1;            // geometry density
  const LAT = 23.0 * Math.PI / 180;     // Tainan
  const sunDir = (dec, H) => {          // local east (x), up (y), north (-z)
    const e = -Math.cos(dec) * Math.sin(H), n = Math.sin(dec) * Math.cos(LAT) - Math.cos(dec) * Math.cos(H) * Math.sin(LAT);
    const u = Math.sin(dec) * Math.sin(LAT) + Math.cos(dec) * Math.cos(H) * Math.cos(LAT);
    return [e, u, -n];
  };
  function building() {
    const segs = [], pts = [], probes = [], anchors = [];
    const Y0 = -1.0;
    const SUN = sunDir(23.44 * Math.PI / 180, -0.95), sl = Math.hypot(...SUN), S = SUN.map(v => v / sl);
    // cx, cz, a, b, floors, twist, taper, exponent, phase
    const towers = [
      [0.1, 0.0, 0.46, 0.2, 68, 2.1, 0.62, 3.2, 0.25],
      [-0.95, -0.38, 0.22, 0.13, 34, -1.3, 0.78, 3.0, 1.2],
      [1.05, 0.42, 0.16, 0.16, 24, 0.0, 0.9, 2.0, 0.0],
    ];
    const FH = 0.027;
    const tops = [];
    for (const [cx, cz, a, b, nf, tw, tp, ex, ph] of towers) {
      const M = Math.round((a > 0.3 ? 84 : 56) * (small ? 0.6 : 1));
      const ring = f => {
        const s = f / nf, rot = ph + tw * s, sc = 1 - (1 - tp) * s * s, cr = Math.cos(rot), sr = Math.sin(rot);
        return Array.from({ length: M }, (_, k) => {
          const t = (k / M) * Math.PI * 2, c = Math.cos(t), si = Math.sin(t);
          const x0 = a * sc * Math.sign(c) * Math.pow(Math.abs(c), 2 / ex), z0 = b * sc * Math.sign(si) * Math.pow(Math.abs(si), 2 / ex);
          return [cx + x0 * cr - z0 * sr, Y0 + f * FH, cz + x0 * sr + z0 * cr];
        });
      };
      const rings = [];
      for (let f = 0; f <= nf; f++) rings.push(ring(f));
      const step = small ? 2 : 1;
      for (let f = 0; f <= nf; f += step) {
        const r = rings[f], major = f % 8 === 0 || f === nf;
        for (let k = 0; k < M; k++) seg(segs, r[k], r[(k + 1) % M]);
        // facade points carry the solar radiation: hi grows with exposure to the sun
        for (let k = 0; k < M; k += (major ? 1 : 3)) {
          const p = r[k], q = r[(k + 1) % M], o = r[(k + M - 1) % M];
          const tx = q[0] - o[0], tz = q[2] - o[2], nl = Math.hypot(tx, tz) || 1, nx = tz / nl, nz = -tx / nl;
          const ex2 = Math.max(0, nx * S[0] + nz * S[2]) * (0.5 + 0.5 * f / nf);
          if (a > 0.3 && k % 4 === 0 && f % 2 === 0) {
            const cosi = Math.max(0, nx * S[0] + nz * S[2]) * Math.sqrt(1 - S[1] * S[1]), irr = 870 * cosi + 105;
            probes.push({ p: p.slice(), irr, nx, nz, rows: ['Facade irradiance', `level ${f} of ${nf}, ${Math.round(f * 4)} m`, `normal azimuth ${Math.round(((Math.atan2(nx, -nz) * 180 / Math.PI) + 360) % 360)}\u00b0 ${compass(Math.atan2(nx, -nz) * 180 / Math.PI)}`,
              `direct + diffuse ${Math.round(irr)} W/m\u00b2`, '21 Jun, 08:22 solar time'] });
          }
          pts.push([p[0], p[1], p[2], major && k % 7 === 0 ? 1 : 0, Math.min(1, Math.pow(ex2, 1.6) * 1.2)]);
        }
      }
      // helical mullions following the twist
      const every = small ? 6 : 3;
      for (let k = 0; k < M; k += every) for (let f = 0; f < nf; f++) seg(segs, rings[f][k], rings[f + 1][k]);
      tops.push([cx, cz, Math.max(a, b) * 1.45, Y0 + nf * FH]);
    }

    // wind: potential flow around each tower (2D doublets that fade out above the roof)
    const vel = (x, y, z) => {
      let u = 1, w = 0, lift = 0;
      for (const [cx, cz, R, top] of tops) {
        const fade = Math.min(1, Math.max(0, (top - y) / 0.22)), R2 = R * R * fade;
        const dx = x - cx, dz = z - cz, r2 = dx * dx + dz * dz + 1e-4, r4 = r2 * r2;
        u -= R2 * (dx * dx - dz * dz) / r4; w -= 2 * R2 * dx * dz / r4;
        const wake = Math.exp(-(dz * dz) / (R * R * 2.2)) * Math.max(0, Math.min(1, dx / 0.3)) * fade;
        w += 1.1 * wake * n2(x * 1.8 + cz * 7, y * 1.6 + 2);
        lift += 0.35 * wake * n2(x * 1.6 + 5, z * 2 + y);
        const roof = Math.exp(-((y - top) ** 2) / 0.02) * Math.exp(-r2 / (R * R * 3));
        lift += 0.5 * roof * Math.sign(-dx) * 0.6;
      }
      return [u, lift, w];
    };
    const levels = small ? [-0.8, -0.3, 0.2, 0.7] : [-0.86, -0.5, -0.14, 0.22, 0.58, 0.9];
    const ns = small ? 10 : 18, h = 0.045;
    levels.forEach((y0, li) => {
      for (let i = 0; i <= ns; i++) {
        let p = [-2.3, y0, -0.85 + 1.7 * (i / ns) + (li % 2) * (0.85 / ns)];
        let prev = p, n = 0;
        while (p[0] < 2.3 && n++ < 220) {
          const v1 = vel(...p), m1 = Math.hypot(...v1) || 1;
          const mid = [p[0] + v1[0] / m1 * h / 2, p[1] + v1[1] / m1 * h / 2, p[2] + v1[2] / m1 * h / 2];
          const v2 = vel(...mid), m2 = Math.hypot(...v2) || 1;
          p = [p[0] + v2[0] / m2 * h, p[1] + v2[1] / m2 * h * 0.5, p[2] + v2[2] / m2 * h];
          if (tops.some(([cx, cz, R, top]) => p[1] < top + 0.02 && (p[0] - cx) ** 2 + (p[2] - cz) ** 2 < R * R * 0.8)) break;
          seg(segs, prev, p);
          if (n % 14 === (i * 3 + li) % 14) pts.push([p[0], p[1], p[2], 0, 0]);
          if (n % 5 === 0) {
            const v = vel(...p), U = Math.hypot(v[0], v[2]), cp = 1 - U * U;
            probes.push({ p: p.slice(), raw: p.slice(), cp, rows: ['Wind field, potential flow', `height ${Math.round((p[1] - Y0) / FH * 4)} m`, `U/U\u221e ${fx(U, 2)}`, `Cp = 1 \u2212 (U/U\u221e)\u00b2 = ${fx(cp, 2)}`] });
          }
          prev = p;
        }
      }
    });

    // sun-path dome for Tainan: solstices and equinox, hour marks, the summer arc in amber
    const C = [0.1, Y0, 0.0], RD = 1.8;
    for (const [d, hi] of [[23.44, 1], [0, 0], [-23.44, 0]]) {
      const dec = d * Math.PI / 180, K = 160;
      let prev = null;
      for (let k = 0; k <= K; k++) {
        const H = -Math.PI + (2 * Math.PI * k) / K, s = sunDir(dec, H);
        const p = s[1] > -0.005 ? [C[0] + s[0] * RD, C[1] + s[1] * RD, C[2] + s[2] * RD] : null;
        if (p && prev) seg(segs, prev, p, hi);
        prev = p;
      }
      for (let hr = -7; hr <= 7; hr++) {
        const s = sunDir(dec, hr * Math.PI / 12);
        if (s[1] > 0) {
          const q = [C[0] + s[0] * RD, C[1] + s[1] * RD, C[2] + s[2] * RD];
          pts.push([...q, 1, hi]);
          const alt = Math.asin(s[1]) * 180 / Math.PI, az = (Math.atan2(s[0], -s[2]) * 180 / Math.PI + 360) % 360;
          probes.push({ p: q, dec: d, hr, rows: ['Sun path, Tainan 23.0\u00b0 N', `${['21 Jun', '20 Mar', '21 Dec'][d > 1 ? 0 : d < -1 ? 2 : 1]}, ${String(12 + hr).padStart(2, '0')}:00 solar time`, `altitude ${fx(alt)}\u00b0`, `azimuth ${Math.round(az)}\u00b0 ${compass(az)}`] });
        }
      }
    }
    // analemma-like hour lines joining the arcs
    for (let hr = -6; hr <= 6; hr++) {
      let prev = null;
      for (let d = -23.44; d <= 23.45; d += 2.93) {
        const s = sunDir(d * Math.PI / 180, hr * Math.PI / 12);
        const p = s[1] > 0 ? [C[0] + s[0] * RD, C[1] + s[1] * RD, C[2] + s[2] * RD] : null;
        if (p && prev && (hr + 6) % 2 === 0) seg(segs, prev, p);
        prev = p;
      }
    }
    // the sun position used for the facade study
    pts.push([C[0] + S[0] * RD, C[1] + S[1] * RD, C[2] + S[2] * RD, 1, 1]);
    anchors.push({ p: [C[0] + S[0] * RD, C[1] + S[1] * RD, C[2] + S[2] * RD], label: 'Sun, 21 Jun 08:22' });
    const pk = probes.filter(q => q.irr).sort((a, b) => b.irr - a.irr)[0];
    if (pk) anchors.push({ p: pk.p, label: `Peak irradiance ${Math.round(pk.irr)} W/m\u00b2` });
    const sep = probes.filter(q => q.cp !== undefined && q.p[0] > 0.3).sort((a, b) => a.cp - b.cp)[0];
    if (sep) anchors.push({ p: sep.p, label: `Separation, Cp ${fx(sep.cp, 2)}` });
    // ground: horizon ring, polar rings and a compass rose of ticks
    const RN = small ? 8 : 14;
    for (let r = 1; r <= RN; r++) {
      const R = (RD * r) / RN, K = Math.round(40 + 70 * r / RN);
      for (let k = 0; k < K; k++) {
        if (r < RN && k % 2) continue;
        const a0 = (k / K) * Math.PI * 2, a1 = ((k + 1) / K) * Math.PI * 2;
        seg(segs, [C[0] + Math.cos(a0) * R, Y0, C[2] + Math.sin(a0) * R], [C[0] + Math.cos(a1) * R, Y0, C[2] + Math.sin(a1) * R]);
      }
      for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2; pts.push([C[0] + Math.cos(a) * R, Y0, C[2] + Math.sin(a) * R, 0, 0]); }
    }
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2, l = k % 6 === 0 ? 0.16 : 0.06;
      seg(segs, [C[0] + Math.cos(a) * RD, Y0, C[2] + Math.sin(a) * RD], [C[0] + Math.cos(a) * (RD + l), Y0, C[2] + Math.sin(a) * (RD + l)]);
    }
    const B = 0.9, cb = Math.cos(B), sb = Math.sin(B), rot = (x, z) => [x * cb - z * sb, x * sb + z * cb];
    for (const s of segs) { [s[0], s[2]] = rot(s[0], s[2]); [s[3], s[5]] = rot(s[3], s[5]); }
    for (const p of pts) [p[0], p[2]] = rot(p[0], p[2]);
    for (const q of probes.concat(anchors)) { const r = rot(q.p[0], q.p[2]); q.p = [r[0], q.p[1], r[1]]; }
    const R3 = p => { const r = rot(p[0], p[2]); return [r[0], p[1], r[1]]; };
    const SPr = R3([C[0] + S[0] * RD, C[1] + S[1] * RD, C[2] + S[2] * RD]);
    const dayH = Array.from({ length: 57 }, (_, k) => -7 + k * 0.25);
    const detail = q => {
      if (q.raw) {
        const path = [q.raw.slice()], U = []; let p = q.raw.slice();
        for (let n = 0; n < 90 && p[0] < 2.3; n++) {
          const v1 = vel(...p), m1 = Math.hypot(...v1) || 1;
          const mid = [p[0] + v1[0] / m1 * 0.0225, p[1] + v1[1] / m1 * 0.0225, p[2] + v1[2] / m1 * 0.0225];
          const v2 = vel(...mid), m2 = Math.hypot(...v2) || 1;
          p = [p[0] + v2[0] / m2 * 0.045, p[1] + v2[1] / m2 * 0.0225, p[2] + v2[2] / m2 * 0.045];
          if (tops.some(([cx, cz, R, top]) => p[1] < top + 0.02 && (p[0] - cx) ** 2 + (p[2] - cz) ** 2 < R * R * 0.8)) break;
          path.push(p.slice()); U.push(Math.hypot(v2[0], v2[2]));
        }
        return { paths: [{ pts: path.map(R3), style: 'amber' }], spark: { vals: U, mark: 0, label: 'U/U\u221e downstream along this streamline', fmt: v => fx(v, 2) } };
      }
      if (q.irr) {
        const vals = dayH.map(hh => { const s = sunDir(23.44 * Math.PI / 180, hh * Math.PI / 12); if (s[1] <= 0) return 0; const n = Math.hypot(s[0], s[1], s[2]); return 870 * Math.max(0, (q.nx * s[0] + q.nz * s[2]) / n) + 105; });
        return { paths: [{ pts: [SPr, q.p], style: 'ray' }], dots: [SPr], spark: { vals, mark: Math.round((-3.63 + 7) * 4), label: 'W/m\u00b2 on this facade, 05:00 to 19:00, 21 Jun', fmt: v => Math.round(v) } };
      }
      if (q.dec !== undefined) {
        const dec = q.dec * Math.PI / 180, arc = [], alt = [];
        for (const hh of dayH) { const s = sunDir(dec, hh * Math.PI / 12); alt.push(Math.max(0, Math.asin(s[1]) * 180 / Math.PI)); if (s[1] > -0.005) arc.push(R3([C[0] + s[0] * RD, C[1] + s[1] * RD, C[2] + s[2] * RD])); }
        return { paths: [{ pts: arc, style: 'amber' }, { pts: [q.p, R3([C[0], Y0, C[2]])], style: 'ray' }], spark: { vals: alt, mark: Math.round((q.hr + 7) * 4), label: 'solar altitude, 05:00 to 19:00', fmt: v => fx(v) + '\u00b0' } };
      }
      return null;
    };
    return { segs, pts, probes, anchors, detail };
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
    // analysis: elevation in metres, slope and aspect, local Moran's I and Getis-Ord Gi*
    const probes = [], anchors = [];
    const M = y => (y - lo) / (hi - lo) * 420, cell = 2000 / ((NX) / (X1 - X0));        // 1 unit = 2 km
    let mu = 0, nn = 0; for (const r of grid) for (const p of r) { mu += p[1]; nn++; } mu /= nn;
    let sd = 0; for (const r of grid) for (const p of r) sd += (p[1] - mu) ** 2; sd = Math.sqrt(sd / nn);
    const Z = (j, i) => (grid[j][i][1] - mu) / sd;
    const gi = (j, i, r) => { let s = 0, c = 0; for (let b = -r; b <= r; b += 2) for (let a = -r; a <= r; a += 2) { const jj = j + b, ii = i + a; if (jj < 0 || ii < 0 || jj > NZ || ii > NX) continue; s += Z(jj, ii); c++; } return 2.4 * s / c; };
    const lat = z => 22.9997 - z * 0.036, lon = x => 120.217 + x * 0.039;
    const L15 = M(lo + (hi - lo) * 15 / LV);
    let best = null, worst = null, iso = null;
    for (let j = 3; j <= NZ - 3; j += 3) for (let i = 3; i <= NX - 3; i += 3) {
      const p = grid[j][i];
      const gx = (grid[j][i + 1][1] - grid[j][i - 1][1]) / 2, gz = (grid[j + 1][i][1] - grid[j - 1][i][1]) / 2;
      const k = 420 / (hi - lo) / cell, slope = Math.atan(Math.hypot(gx, gz) * k) * 180 / Math.PI, asp = Math.atan2(-gx, gz) * 180 / Math.PI;
      let lag = 0, c = 0; for (const [b, a] of [[-3, -3], [-3, 0], [-3, 3], [0, -3], [0, 3], [3, -3], [3, 0], [3, 3]]) { lag += Z(j + b, i + a); c++; } lag /= c;
      const zi = Z(j, i), I = zi * lag, cls = zi > 0 ? (lag > 0 ? 'High\u2013High' : 'High\u2013Low') : (lag < 0 ? 'Low\u2013Low' : 'Low\u2013High');
      const g = gi(j, i, 6);
      probes.push({ p, j, i, rows: [`${fx(lat(p[2]), 4)}\u00b0 N, ${fx(lon(p[0]), 4)}\u00b0 E`, `elevation ${Math.round(M(p[1]))} m`, `slope ${fx(slope)}\u00b0, aspect ${compass(asp)}`, `local Moran's I ${fx(I, 2)}, ${cls}`, `Getis\u2013Ord Gi* z = ${fx(g, 2)}`] });
      if (!best || g > best.g) best = { p, g };
      if (!worst || g < worst.g) worst = { p, g };
      if (p[0] > 0.6 && Math.abs(M(p[1]) - L15) < 6 && (!iso || p[2] > iso.p[2])) iso = { p };
    }
    anchors.push({ p: best.p, label: `Gi* hotspot, z = ${fx(best.g, 2)}` });
    anchors.push({ p: worst.p, label: `Cold spot, z = ${fx(worst.g, 2)}` });
    if (iso) anchors.push({ p: iso.p, label: `Isoline ${Math.round(L15)} m` });
    const cellM = 2000 * (X1 - X0) / NX;
    const detail = q => {
      const { j, i } = q, paths = [], ring = [];
      for (const [b, a] of [[-3, -3], [-3, 0], [-3, 3], [0, -3], [0, 3], [3, -3], [3, 0], [3, 3]]) paths.push({ pts: [q.p, grid[j + b][i + a]], style: 'ink' });
      for (let k = 0; k <= 48; k++) { const th = k / 48 * Math.PI * 2, jj = Math.max(0, Math.min(NZ, Math.round(j + 6 * Math.sin(th)))), ii = Math.max(0, Math.min(NX, Math.round(i + 6 * Math.cos(th)))); ring.push(grid[jj][ii]); }
      paths.push({ pts: ring, style: 'amber' });
      const a0 = Math.max(0, i - 24), a1 = Math.min(NX, i + 24), tr = [], vals = [];
      for (let ii = a0; ii <= a1; ii++) { tr.push(grid[j][ii]); vals.push(M(grid[j][ii][1])); }
      paths.push({ pts: tr, style: 'dash' });
      return { paths, dots: [grid[j][a0], grid[j][a1]], spark: { vals, mark: i - a0, label: `transect W\u2013E, ${fx((a1 - a0) * cellM / 1000)} km, elevation`, fmt: v => Math.round(v) + ' m' } };
    };
    for (let j = 4; j < NZ - 3; j += 4) for (let i = 4; i < NX - 3; i += 4) {
      const p = grid[j][i];
      const peak = p[1] > grid[j][i - 4][1] && p[1] > grid[j][i + 4][1] && p[1] > grid[j - 4][i][1] && p[1] > grid[j + 4][i][1];
      if (peak || (i + j) % 16 === 0) pts.push([p[0], p[1], p[2], 1, peak ? 1 : 0]);
    }
    return { segs, pts, probes, anchors, detail };
  }

  // ---- 03 neural: a rolled data manifold unrolled layer by layer, joined by fibre bundles ----
  function network() {
    const segs = [], pts = [], probes = [], anchors = [];
    const L = 7, NT = small ? 22 : 40, NV = small ? 9 : 14;
    const X0 = -2.0, X1 = 1.55, W = 1.5, HV = 0.58;
    const TU = 0.62, TV = 0.18;          // the traced sample (t, v)
    const BETA = 0.9, cb = Math.cos(BETA), sb = Math.sin(BETA);
    // centre line of layer l as a function of arc length t in [0,1]
    const curves = [], bend = [], ratio = [];
    for (let l = 0; l < L; l++) {
      const s = l / (L - 1), c = 10.5 * Math.pow(1 - s, 1.35), M = 400, g0 = -0.75 + 0.5 * (1 - s);
      bend.push(c);
      const P = [[0, 0]]; let x = 0, z = 0;
      for (let k = 1; k <= M; k++) { const t = (k - 0.5) / M, th = g0 + c * Math.pow(1 - t, 2); x += Math.sin(th) * W / M; z += Math.cos(th) * W / M; P.push([x, z]); }
      let mx = 0, mz = 0; for (const p of P) { mx += p[0]; mz += p[1]; } mx /= P.length; mz /= P.length;
      ratio.push(W / Math.hypot(P[M][0] - P[0][0], P[M][1] - P[0][1]));
      curves.push(t => { const f = t * M, i = Math.min(M - 1, Math.floor(f)), r = f - i, a = P[i], b = P[i + 1]; return [a[0] + (b[0] - a[0]) * r - mx, a[1] + (b[1] - a[1]) * r - mz]; });
    }
    const size = [0.78, 0.86, 0.94, 1.0, 1.0, 1.0, 1.0];
    const prune = Array.from({ length: L - 1 }, (_, l) => 0.22 + 0.5 * l / (L - 2));   // magnitude pruning, deeper layers sparser
    const place = (l, t, v) => {
      const s = l / (L - 1), q = curves[l](t), h = HV * size[l] * (1 + 0.14 * Math.sin(Math.PI * 2 * t + l * 0.8) * v);
      const X = X0 + (X1 - X0) * s + q[0], Y = -0.08 + v * h + 0.05 * Math.sin(4.2 * t + l * 0.9), Z = q[1];
      return [X * cb - Z * sb, Y, X * sb + Z * cb];
    };
    for (let l = 0; l < L; l++) {
      const rows = [];
      for (let j = 0; j <= NV; j++) { rows[j] = []; for (let i = 0; i <= NT * 2; i++) rows[j][i] = place(l, i / (NT * 2), -1 + 2 * j / NV); }
      for (let j = 0; j <= NV; j++) for (let i = 0; i < NT * 2; i++) seg(segs, rows[j][i], rows[j][i + 1]);
      for (let i = 0; i <= NT * 2; i += 2) for (let j = 0; j < NV; j++) seg(segs, rows[j][i], rows[j + 1][i]);
      for (let j = 0; j <= NV; j++) for (let i = 0; i <= NT * 2; i++) {
        const t = i / (NT * 2), v = -1 + 2 * j / NV, d2 = ((t - TU) * 2) ** 2 + (v - TV) ** 2;
        const edge = j === 0 || j === NV;
        if (!edge && i % 2) continue;
        pts.push([...rows[j][i], (edge && i % 10 === 0) ? 1 : 0, Math.exp(-d2 / 0.05) * 0.85]);
        if (i % 4 === 0 && j % 2 === 0) probes.push({ p: rows[j][i], l, t, v, rows: [`Layer ${l + 1} of ${L}, unit (${i / 2}, ${j})`, `activation ${fx(Math.exp(-d2 / 0.05), 3)}`,
          `curvature \u03ba ${fx(2 * bend[l] * (1 - t) / W, 2)}`, `geodesic / Euclidean ${fx(ratio[l], 2)}`, l ? `weights pruned ${Math.round(prune[l - 1] * 100)}%, |w| < \u03c4` : 'input manifold, unpruned'] });
      }
    }
    // fibre bundles carrying the same sample from layer to layer
    const curve = (a, b, hi, n) => {
      const dx = [(b[0] - a[0]) * 0.5, 0, (b[2] - a[2]) * 0.5];
      let prev = a;
      for (let k = 1; k <= n; k++) {
        const t = k / n, mt = 1 - t;
        const p = [0, 1, 2].map(c => mt * mt * mt * a[c] + 3 * mt * mt * t * (a[c] + dx[c] * 0.9) + 3 * mt * t * t * (b[c] - dx[c] * 0.9) + t * t * t * b[c]);
        seg(segs, prev, p, hi);
        if (k % 4 === 2 && rnd() < (hi ? 1 : 0.45)) pts.push([...p, 0, hi]);
        prev = p;
      }
    };
    const FT = small ? 6 : 3, FV = small ? 3 : 2;
    for (let l = 0; l < L - 1; l++) for (let j = 1; j < NV; j += FV) for (let i = 1; i < NT; i += FT) {
      if (rnd() < prune[l]) continue;
      const t = (i + 0.5 * (j % 2)) / NT, v = -1 + 2 * j / NV;
      curve(place(l, t, v), place(l + 1, t, v), 0, 12);
    }
    for (let l = 0; l < L - 1; l++) curve(place(l, TU, TV), place(l + 1, TU, TV), 1, 24);
    for (let l = 0; l < L; l++) pts.push([...place(l, TU, TV), 1, 1]);
    anchors.push({ p: place(0, 0.5, 1), label: `Rolled input, geodesic / Euclidean ${fx(ratio[0], 2)}` });
    anchors.push({ p: place(3, TU, TV), label: 'Traced sample x\u2080' });
    anchors.push({ p: place(L - 1, 0.1, 1), label: `Unrolled, ${fx(ratio[L - 1], 2)}, linearly separable` });
    for (let k = 0; k < (small ? 700 : 2000); k++) {
      const l = Math.floor(rnd() * (L - 1)), t = rnd(), v = rnd() * 2 - 1, f = rnd();
      const a = place(l, t, v), b = place(l + 1, t, v);
      pts.push([a[0] + (b[0] - a[0]) * f + gauss() * 0.015, a[1] + (b[1] - a[1]) * f + gauss() * 0.02, a[2] + (b[2] - a[2]) * f + gauss() * 0.015, 0, 0]);
    }
    const bez = (a, b, n) => { const dx = [(b[0] - a[0]) * 0.5, 0, (b[2] - a[2]) * 0.5], out = []; for (let k = 0; k <= n; k++) { const t = k / n, mt = 1 - t; out.push([0, 1, 2].map(c => mt * mt * mt * a[c] + 3 * mt * mt * t * (a[c] + dx[c] * 0.9) + 3 * mt * t * t * (b[c] - dx[c] * 0.9) + t * t * t * b[c])); } return out; };
    const detail = q => {
      const path = [], nodes = [];
      for (let k = 0; k < L; k++) { nodes.push(place(k, q.t, q.v)); if (k < L - 1) path.push(...bez(place(k, q.t, q.v), place(k + 1, q.t, q.v), 20)); }
      return { paths: [{ pts: path, style: 'amber' }], dots: nodes, spark: { vals: ratio, mark: q.l, bars: true, label: 'geodesic / Euclidean by layer, 1.00 is flat', fmt: v => fx(v, 2) } };
    };
    return { segs, pts, probes, anchors, detail };
  }

  // halve chains of connected segments until the model fits the shared budget
  function fit(segs) {
    for (let pass = 0; pass < 6 && segs.length > NS; pass++) {
      const out = []; let odd = false;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i], n = segs[i + 1];
        if (n && !odd && s[3] === n[0] && s[4] === n[1] && s[5] === n[2] && s[6] === n[6]) { out.push([s[0], s[1], s[2], n[3], n[4], n[5], s[6]]); i++; odd = true; }
        else { out.push(s); odd = false; }
      }
      segs = out;
    }
    return segs;
  }
  function resample(model) {
    model.segs = fit(model.segs);
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
    if (out.length > NS) { for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } out.length = NS; }
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
  const RAW = [terrain(), building(), network()];
  const MODELS = RAW.map(resample);
  const PROBES = RAW.map(r => { const q = r.probes, step = Math.max(1, Math.ceil(q.length / 2600)); return q.filter((_, i) => i % step === 0); });
  const ANCHORS = RAW.map(r => r.anchors);
  const DETAIL = RAW.map(r => r.detail);
  // the probe nearest to each anchor, so a tag or the tour can open a full reading
  const near3 = (list, p) => { let b = null, bd = 1e9; for (const q of list) { const d = (q.p[0] - p[0]) ** 2 + (q.p[1] - p[1]) ** 2 + (q.p[2] - p[2]) ** 2; if (d < bd) { bd = d; b = q; } } return b; };
  const ANCHOR_PROBE = RAW.map(r => r.anchors.map(a => near3(r.probes, a.p)));

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
  // ---- analysis overlay ----------------------------------------------------------------
  // Numbered tags tell each model's story; a probe snaps to the nearest computed sample and draws
  // the analysis behind its reading (spatial weights and Gi* window, a traced streamline or sun
  // ray, one unit followed through every layer). Idle, the overlay tours the tags by itself.
  const layer = hero.querySelector('.probe-layer');
  const project = q => {
    const Y = yaw + yawO, cy = Math.cos(Y), sy = Math.sin(Y), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const sc = narrow ? 0.5 : Math.min(1.02, 0.56 * (w / h) / 1.6 + 0.4), f = 1 / Math.tan(0.36);
    let x = cy * q[0] + sy * q[2], y = q[1], z = -sy * q[0] + cy * q[2];
    [y, z] = [cp * y - sp * z, sp * y + cp * z]; x *= sc; y *= sc; z *= sc;
    const dist = 4.6 - z, X = (x * f / (w / h)) / dist + (narrow ? 0 : 0.2), Yc = (y * f) / dist + (narrow ? 0.42 : 0.22);
    return [(X * 0.5 + 0.5) * w, (0.5 - Yc * 0.5) * h];
  };
  const IDLE = 4200, STEP = 3600;
  let tagEls = [], probeEl = null, cardEl = null, octx = null, ocv = null, lastModel = -1;
  let hover = null, pinned = null, tour = null, tourIdx = -1, tourAt = 0, lastInput = -1e9, ptr = null;
  let shown = null, shownAt = 0, det = null, touched = false;
  const storyEl = hero.querySelector('.story'), hintEl = hero.querySelector('.hero-hint');
  if (layer) {
    ocv = document.createElement('canvas'); ocv.className = 'probe-canvas'; layer.appendChild(ocv); octx = ocv.getContext('2d');
    probeEl = document.createElement('div'); probeEl.className = 'probe';
    probeEl.innerHTML = '<i class="probe-mark"></i><div class="probe-card" role="status"></div>';
    layer.appendChild(probeEl); cardEl = probeEl.querySelector('.probe-card');
  }
  const sizeOverlay = () => { if (!ocv) return; if (cardEl) { (narrow ? layer : probeEl).appendChild(cardEl); cardEl.classList.toggle('docked', narrow); } ocv.width = Math.round(w * dpr); ocv.height = Math.round(h * dpr); ocv.style.width = w + 'px'; ocv.style.height = h + 'px'; };
  const spark = s => {
    const W = 236, H = 44, n = s.vals.length, lo = Math.min(...s.vals), hi = Math.max(...s.vals), k = v => H - 4 - (hi - lo ? (v - lo) / (hi - lo) : 0.5) * (H - 10);
    let body = '';
    if (s.bars) {
      const bw = W / n;
      s.vals.forEach((v, i) => { const y = k(v); body += `<rect x="${(i * bw + 2).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${(H - y).toFixed(1)}" class="${i === s.mark ? 'sp-hi' : 'sp-bar'}"/>`; });
    } else {
      const X = i => (n > 1 ? i / (n - 1) : 0) * W;
      body += `<polyline class="sp-line" points="${s.vals.map((v, i) => `${X(i).toFixed(1)},${k(v).toFixed(1)}`).join(' ')}"/>`;
      const m = Math.max(0, Math.min(n - 1, s.mark));
      body += `<line class="sp-rule" x1="${X(m).toFixed(1)}" x2="${X(m).toFixed(1)}" y1="0" y2="${H}"/><circle class="sp-dot" cx="${X(m).toFixed(1)}" cy="${k(s.vals[m]).toFixed(1)}" r="2.6"/>`;
    }
    const m = Math.max(0, Math.min(n - 1, s.mark));
    return `<div class="probe-spark"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${body}</svg><p><span>${s.label}</span><b>${s.fmt(s.vals[m])}</b></p></div>`;
  };
  function card(q) {
    det = DETAIL[to] ? DETAIL[to](q) : null;
    const k = ANCHOR_PROBE[to].indexOf(q);
    const state = q === pinned ? (narrow ? 'Pinned. Tap empty space to release.' : 'Pinned. Click the model to release it.') : q === tour ? `Tour ${tourIdx + 1} of ${ANCHORS[to].length}. ${narrow ? 'Tap a point to take over.' : 'Move the pointer to take over.'}` : (narrow ? 'Tap again to pin.' : 'Click to pin this reading.');
    cardEl.innerHTML = `<b>${k >= 0 ? `<em>${k + 1}</em>` : ''}${q.rows[0]}</b>` + q.rows.slice(1).map(r => `<span>${r}</span>`).join('') + (det && det.spark ? spark(det.spark) : '') + `<small>${state}</small>`;
    tagEls.forEach((t, i) => t.classList.toggle('is-active', ANCHOR_PROBE[to][i] === q));
  }
  function buildTags(m) {
    if (!layer || m === lastModel) return;
    lastModel = m; tagEls.forEach(t => t.remove());
    tagEls = ANCHORS[m].map((a, i) => {
      const el = document.createElement('button'); el.type = 'button'; el.className = 'tag'; el.tabIndex = -1;
      el.innerHTML = `<i>${i + 1}</i><span>${a.label}</span>`;
      el.addEventListener('click', ev => { ev.stopPropagation(); const q = ANCHOR_PROBE[m][i]; pinned = pinned === q ? null : q; tour = null; lastInput = performance.now(); touched = true; refresh(); });
      layer.appendChild(el); return el;
    });
  }
  function pick() {
    hover = null;
    if (!ptr || phase !== 'hold') return;
    let bd = (narrow ? 56 : 26) ** 2;
    for (const q of PROBES[to]) { const s = project(q.p), d = (s[0] - ptr[0]) ** 2 + (s[1] - ptr[1]) ** 2; if (d < bd) { bd = d; hover = q; } }
  }
  function refresh() {
    const q = phase === 'hold' ? (pinned || hover || tour) : null;
    if (q !== shown) { shown = q; shownAt = performance.now(); if (q) card(q); else det = null; }
    else if (q && (q === pinned || q === tour)) card(q);
    if (hintEl) hintEl.classList.toggle('is-quiet', touched);
    if (!running) overlay();
  }
  function stepTour(now) {
    if (reduce || pinned || phase !== 'hold' || now - lastInput < IDLE) { if (tour && now - lastInput < IDLE) { tour = null; refresh(); } return; }
    if (!tour || now - tourAt > STEP) { tourIdx = (tourIdx + 1) % ANCHORS[to].length; tour = ANCHOR_PROBE[to][tourIdx]; tourAt = now; refresh(); }
  }
  function drawPaths(now) {
    octx.setTransform(dpr, 0, 0, dpr, 0, 0); octx.clearRect(0, 0, w, h);
    if (!shown || !det) return;
    const prog = reduce ? 1 : Math.min(1, (now - shownAt) / 700), e = 1 - Math.pow(1 - prog, 3);
    for (const path of det.paths || []) {
      const P = path.pts.map(project), n = Math.max(2, Math.ceil(P.length * e));
      octx.beginPath(); octx.moveTo(P[0][0], P[0][1]);
      for (let i = 1; i < n && i < P.length; i++) octx.lineTo(P[i][0], P[i][1]);
      octx.setLineDash(path.style === 'dash' ? [3, 4] : path.style === 'ray' ? [2, 5] : []);
      octx.lineWidth = path.style === 'amber' ? 1.6 : 1;
      octx.strokeStyle = path.style === 'ink' ? 'rgba(244,244,240,.6)' : path.style === 'dash' ? 'rgba(244,244,240,.75)' : '#E5A93C';
      octx.stroke();
    }
    octx.setLineDash([]);
    for (const d of det.dots || []) { const s = project(d); octx.fillStyle = '#070709'; octx.strokeStyle = '#E5A93C'; octx.lineWidth = 1.2; octx.beginPath(); octx.rect(s[0] - 3, s[1] - 3, 6, 6); octx.fill(); octx.stroke(); }
  }
  function overlay() {
    if (!layer) return;
    const now = performance.now(), show = phase === 'hold';
    stepTour(now);
    if (show !== layer.classList.contains('is-on')) layer.classList.toggle('is-on', show);
    buildTags(to);
    ANCHORS[to].forEach((a, k) => { const s = project(a.p), el = tagEls[k]; if (!el) return; el.style.transform = `translate3d(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px, 0)`; el.classList.toggle('flip', s[0] > w * 0.74); });
    layer.classList.toggle('probing', !!shown && show);
    if (shown && show) {
      const s = project(shown.p);
      probeEl.style.transform = `translate3d(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px, 0)`;
      probeEl.classList.toggle('flip', s[0] > w * 0.62); probeEl.classList.toggle('up', s[1] > h * 0.42);
      probeEl.classList.toggle('pinned', shown === pinned);
      probeEl.classList.add('is-on');
    } else if (probeEl) probeEl.classList.remove('is-on');
    drawPaths(now);
  }
  function setActive(i) {
    tabs.forEach((b, k) => b.setAttribute('aria-pressed', k === i ? 'true' : 'false'));
    if (storyEl && tabs[i]) { storyEl.classList.remove('in'); void storyEl.offsetWidth; storyEl.textContent = tabs[i].dataset.story || ''; storyEl.classList.add('in'); }
  }
  function go(i) { if (i === to && phase === 'hold') return; from = phase === 'morph' && p < 0.5 ? from : to; to = i; p = 0; phase = 'morph'; clock = 0; setActive(i); }
  tabs.forEach((b, i) => b.addEventListener('click', () => { go(i); pinned = hover = tour = null; tourIdx = -1; lastInput = performance.now() - IDLE + 1800; refresh(); if (reduce) { p = 1; phase = 'hold'; from = to; draw(); refresh(); overlay(); } }));

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
    t += dt; clock += dt;
    if (phase === 'morph') { p = Math.min(1, clock / MORPH); if (p >= 1) { phase = 'hold'; clock = 0; from = to; } }
    else if (clock > HOLD + (pinned || performance.now() - lastInput < IDLE * 2 ? 1e9 : ANCHORS[to].length * STEP / 1000)) { pinned = hover = tour = null; tourIdx = -1; go((to + 1) % 3); }
    const pv = phase === 'hold' ? Math.min(1, clock / HOLD) : 0;
    tabs.forEach((b, k) => b.style.setProperty('--p', k === to ? pv.toFixed(3) : '0'));
    yaw = 0.6 + 0.32 * Math.sin(t * 0.09);
    yawO += (yawT - yawO) * 0.035; pitch += (pitchT - pitch) * 0.035;
    draw(); overlay();
    requestAnimationFrame(frame);
  }
  const startLoop = () => { if (!running && visible && !document.hidden && !reduce) { running = true; last = 0; requestAnimationFrame(frame); } };
  const stop = () => { running = false; };

  resize(); sizeOverlay(); setActive(0); draw(); overlay();
  const ready = () => requestAnimationFrame(() => hero.classList.add('is-ready'));
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(ready);
  setTimeout(ready, 900);

  let rt, lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - lastW) < 2) return;
    lastW = window.innerWidth; clearTimeout(rt); rt = setTimeout(() => { resize(); sizeOverlay(); draw(); overlay(); }, 120);
  });
  const mainEl = hero.querySelector('.hero-main'), modesEl = hero.querySelector('.modes');
  const inside = (el, x, y) => { if (!el) return false; const b = el.getBoundingClientRect(); return x > b.left - 8 && x < b.right + 8 && y > b.top - 8 && y < b.bottom + 8; };
  const aim = ev => {
    const r = hero.getBoundingClientRect();
    ptr = (inside(mainEl, ev.clientX, ev.clientY) || inside(modesEl, ev.clientX, ev.clientY) || ev.target.closest('.tag, a, button')) ? null : [ev.clientX - r.left, ev.clientY - r.top];
    pick();
    if (hover) { lastInput = performance.now(); tour = null; if (!touched) { touched = true; } }
    hero.classList.toggle('is-probing', !!hover);
    refresh();
  };
  hero.addEventListener('pointerdown', ev => { if (ev.pointerType !== 'mouse') aim(ev); });
  hero.addEventListener('click', ev => {
    if (ev.target.closest('a, button')) return;
    lastInput = performance.now();
    if (hover) { pinned = pinned === hover ? null : hover; touched = true; tour = null; }
    else if (pinned) pinned = null;
    refresh();
  });
  hero.addEventListener('pointermove', ev => {
    if (ev.pointerType !== 'mouse') return;
    aim(ev);
    const r = hero.getBoundingClientRect();
    yawT = ((ev.clientX - r.left) / r.width - 0.5) * 0.4;
    pitchT = 0.42 + ((ev.clientY - r.top) / r.height - 0.5) * 0.2;
  });
  hero.addEventListener('pointerleave', ev => { if (ev.pointerType !== 'mouse') return; yawT = 0; pitchT = 0.42; ptr = null; hover = null; hero.classList.remove('is-probing'); refresh(); });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? startLoop() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : startLoop()));
  startLoop();
})();
