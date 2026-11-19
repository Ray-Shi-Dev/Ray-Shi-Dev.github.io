"""Inline SVG charts for the software projects, drawn from each repo's real numbers.
Scientific style: 1px axes, dot-matrix fills for context, one amber highlight per chart.
Colours come from CSS classes (.viz in site.css); the dot pattern #p-dots is defined once per page."""
import math

W, H = 640, 400

DEFS = ('<svg class="svg-defs" aria-hidden="true" focusable="false"><defs>'
        '<pattern id="p-dots" width="4" height="4" patternUnits="userSpaceOnUse">'
        '<circle cx="1" cy="1" r=".75" fill="#8A8F98" fill-opacity=".55"/></pattern>'
        '</defs></svg>')


def _svg(body, label, h=H):
    return (f'<svg class="viz" viewBox="0 0 {W} {h}" role="img" aria-label="{label}" '
            f'xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">{body}</svg>')


def _xaxis(x0, x1, y, ticks, vmax, unit=""):
    b = f'<line class="v-axis" x1="{x0}" x2="{x1}" y1="{y}" y2="{y}"/>'
    for t in ticks:
        x = x0 + (x1 - x0) * t / vmax
        b += (f'<line class="v-axis" x1="{x:.1f}" x2="{x:.1f}" y1="{y}" y2="{y + 5}"/>'
              f'<text class="v-tick" x="{x:.1f}" y="{y + 20}" text-anchor="middle">{t}{unit}</text>')
    return b


def bench(compact=False):
    """Wall-clock time of the two pipelines, LEAD dataset, Kaggle container."""
    x0, x1 = 150, 590
    vmax = 30
    b = '<text class="v-cap" x="40" y="48">Wall-clock time, minutes</text>'
    rows = [("iterative", 26.6, False), ("vectorised", 7.3, True)]
    for i, (name, v, hi) in enumerate(rows):
        y = 78 + i * 58
        w = (x1 - x0) * v / vmax
        cls = "bar-hi" if hi else "bar-dots"
        b += (f'<text class="v-lab{" v-hi" if hi else ""}" x="40" y="{y + 24}">{name}</text>'
              f'<rect class="{cls}" x="{x0}" y="{y}" width="{w:.1f}" height="36"/>'
              f'<text class="v-num{" v-hi" if hi else ""}" x="{x0 + w + 12:.1f}" y="{y + 24}">{v}</text>')
    b += f'<line class="v-axis" x1="{x0}" x2="{x0}" y1="66" y2="{78 + 2 * 58}"/>'
    b += _xaxis(x0, x1, 78 + 2 * 58 - 8, [0, 10, 20, 30], vmax)
    if compact:
        b += '<text class="v-cap" x="40" y="262">Same Kaggle container, end to end, accuracy parity checked</text>'
        return _svg(b, "Bar chart: iterative pipeline 26.6 minutes, vectorised 7.3 minutes", 280)
    b += '<line class="v-rule" x1="40" x2="600" y1="282" y2="282"/>'
    for i, (big, small) in enumerate([("72%", "faster"), ("−1.4 GB", "peak memory"), ("0.952", "private score")]):
        x = 40 + i * 190
        b += (f'<text class="v-big{" v-hi" if i == 0 else ""}" x="{x}" y="336">{big}</text>'
              f'<text class="v-cap" x="{x}" y="362">{small}</text>')
    return _svg(b, "Bar chart: iterative pipeline 26.6 minutes, vectorised 7.3 minutes; 72% faster, 1.4 GB less peak memory, private score 0.952")


def spread():
    """Schematic of the veto overlay: baseline entries at |z| > 2, one vetoed before a breakdown."""
    x0, x1, yc, s = 40, 600, 196, 34
    b = '<text class="v-cap" x="40" y="40">Schematic: baseline signals and the ML veto</text>'
    for k in (2, -2):
        b += f'<line class="v-band" x1="{x0}" x2="{x1}" y1="{yc - k * s}" y2="{yc - k * s}"/>'
    for k in (3, -3):
        b += f'<line class="v-band3" x1="{x0}" x2="{x1}" y1="{yc - k * s}" y2="{yc - k * s}"/>'
    b += f'<text class="v-tick" x="{x1}" y="{yc - 2 * s - 6}" text-anchor="end">+2σ entry</text>'
    b += f'<text class="v-tick" x="{x1}" y="{yc - 3 * s - 6}" text-anchor="end">+3σ breakdown</text>'
    b += f'<line class="v-axis" x1="{x0}" x2="{x1}" y1="{yc}" y2="{yc}"/>'
    b += f'<line class="v-axis" x1="{x0}" x2="{x0}" y1="{yc - 3.6 * s}" y2="{yc + 3.6 * s}"/>'
    bumps = [(0.15, 2.45, 0.045), (0.40, -2.05, 0.05), (0.66, 4.1, 0.075), (0.90, -2.3, 0.04)]
    pts = []
    for i in range(0, 281):
        u = i / 280
        z = 0.45 * math.sin(u * 11) + 0.2 * math.sin(u * 29 + 1.0) + 0.08 * math.sin(u * 61)
        for c, a, wdt in bumps:
            z += a * math.exp(-((u - c) / wdt) ** 2)
        pts.append((x0 + i * 2, yc - z * s))
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    b += f'<path class="v-line" pathLength="1" d="{d}"/>'
    sig = [i for i in range(1, len(pts)) if abs((yc - pts[i - 1][1]) / s) <= 2 < abs((yc - pts[i][1]) / s)]
    for n, i in enumerate(sig):
        px, py = pts[i]
        if n == 2:
            b += (f'<g class="v-veto"><line x1="{px - 6:.1f}" y1="{py - 6:.1f}" x2="{px + 6:.1f}" y2="{py + 6:.1f}"/>'
                  f'<line x1="{px - 6:.1f}" y1="{py + 6:.1f}" x2="{px + 6:.1f}" y2="{py - 6:.1f}"/></g>'
                  f'<text class="v-lab v-hi" x="{px - 14:.1f}" y="{py + 5:.1f}" text-anchor="end">vetoed</text>')
        else:
            b += f'<circle class="v-dot" cx="{px:.1f}" cy="{py:.1f}" r="4"/>'
    b += '<circle class="v-dot" cx="44" cy="356" r="4"/><text class="v-cap" x="56" y="361">trade taken</text>'
    b += ('<g class="v-veto"><line x1="186" y1="350" x2="198" y2="362"/><line x1="186" y1="362" x2="198" y2="350"/></g>'
          '<text class="v-cap" x="208" y="361">vetoed when P(breakdown) ≥ 0.70</text>')
    return _svg(b, "Schematic of a spread z-score: three baseline entries at two sigma are taken; one is vetoed by the model just before the spread breaks past three sigma")


WWR_ROWS = [(1, 39.42), (2, 42.74), (3, 50.84), (4, 63.56), (5, 45.87), (6, 65.29), (7, 64.64), (8, 63.90)]


def wwr():
    """Per-floor window-to-wall ratio from the tool's sample output, stacked like a tower."""
    b = '<text class="v-cap" x="40" y="40">Window-to-wall ratio by floor, sample output</text>'
    x0, x1, fh, top = 96, 560, 30, 62
    peak = max(v for _, v in WWR_ROWS)
    for i, (fl, v) in enumerate(reversed(WWR_ROWS)):
        y = top + i * (fh + 6)
        w = (x1 - x0) * v / 100
        hi = v == peak
        b += (f'<text class="v-lab{" v-hi" if hi else ""}" x="{x0 - 14}" y="{y + 20}" text-anchor="end">F{fl}</text>'
              f'<rect class="{"bar-hi" if hi else "bar-dots"}" x="{x0}" y="{y}" width="{w:.1f}" height="{fh}"/>'
              f'<text class="v-num v-small{" v-hi" if hi else ""}" x="{x0 + w + 10:.1f}" y="{y + 20}">{v:.1f}</text>')
    yb = top + 8 * (fh + 6)
    b += f'<line class="v-axis" x1="{x0}" x2="{x0}" y1="{top - 6}" y2="{yb}"/>'
    b += _xaxis(x0, x1, yb, [0, 25, 50, 75, 100], 100, "%")
    return _svg(b, "Horizontal bars of window-to-wall ratio for floors 1 to 8, from 39.4% to a peak of 65.3% on floor 6")


def gauge():
    """Niche score dial with the example value from the app (topic: Robotic, 63)."""
    cx, cy, r = 200, 250, 140
    def pt(a, rr):
        return cx + rr * math.cos(math.pi * (1 - a)), cy - rr * math.sin(math.pi * (1 - a))
    def arc(a0, a1, rr):
        p0, p1 = pt(a0, rr), pt(a1, rr)
        return f"M{p0[0]:.1f},{p0[1]:.1f} A{rr},{rr} 0 0 1 {p1[0]:.1f},{p1[1]:.1f}"
    b = '<text class="v-cap" x="40" y="40">Niche opportunity score, example topic</text>'
    b += f'<path class="v-track" d="{arc(0, 0.5, r)}"/><path class="v-track" d="{arc(0.5, 1, r)}"/>'
    for t in range(0, 101, 5):
        a = t / 100
        p0, p1 = pt(a, r + 8), pt(a, r + (18 if t % 25 == 0 else 13))
        b += f'<line class="v-axis{" v-tickhi" if t <= 63 else ""}" x1="{p0[0]:.1f}" y1="{p0[1]:.1f}" x2="{p1[0]:.1f}" y2="{p1[1]:.1f}"/>'
    for t in (0, 50, 100):
        p = pt(t / 100, r + 34)
        b += f'<text class="v-tick" x="{p[0]:.1f}" y="{p[1] + 4:.1f}" text-anchor="middle">{t}</text>'
    b += f'<path class="v-arc" pathLength="1" d="{arc(0, 0.63, r)}"/>'
    e = pt(0.63, r)
    b += f'<circle class="v-dot-hi" cx="{e[0]:.1f}" cy="{e[1]:.1f}" r="5"/>'
    b += f'<text class="v-gauge" x="{cx}" y="{cy - 16}" text-anchor="middle">63</text>'
    b += f'<text class="v-cap" x="{cx}" y="{cy + 12}" text-anchor="middle">of 100</text>'
    x = 420
    b += f'<text class="v-cap" x="{x}" y="118">score =</text>'
    for i, (sign, name, hi) in enumerate([("+", "depth", False), ("+", "intensity", False), ("×", "0.7 if sharks > 50%", True)]):
        b += f'<text class="v-lab{" v-hi" if hi else ""}" x="{x}" y="{154 + i * 32}">{sign} {name}</text>'
    b += '<line class="v-rule" x1="40" x2="600" y1="314" y2="314"/>'
    b += '<text class="v-mono" x="40" y="356">m = views(video) / median views(channel)</text>'
    return _svg(b, "Dial showing a niche score of 63 out of 100, built from depth and intensity with a saturation penalty")


VIZ = {"vectorized-timeseries-scaling": bench, "ml-stat-arb": spread,
       "rhino-wwr-automation": wwr, "youtube-market-engine": gauge}
