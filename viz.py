"""Inline SVG visuals for the software projects, drawn from each repo's real numbers.
Colours come from CSS classes (see .viz in site.css), so they follow the theme."""
import math

W, H = 640, 400


def _svg(body, label):
    return (f'<svg class="viz" viewBox="0 0 {W} {H}" role="img" aria-label="{label}" '
            f'xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">{body}</svg>')


def bench():
    """Wall-clock time of the two pipelines, LEAD dataset, Kaggle container."""
    x0, wmax = 150, 400
    rows = [("iterative", 26.6, "bar-muted"), ("vectorised", 7.3, "bar-accent")]
    b = '<text class="v-cap" x="40" y="56">wall-clock time, minutes</text>'
    for i, (name, v, cls) in enumerate(rows):
        y = 92 + i * 64
        w = wmax * v / 26.6
        b += (f'<text class="v-lab" x="40" y="{y + 25}">{name}</text>'
              f'<rect class="{cls}" x="{x0}" y="{y}" width="{w:.1f}" height="38" rx="5"/>'
              f'<text class="v-num" x="{x0 + w + 14:.1f}" y="{y + 26}">{v}</text>')
    b += '<line class="v-rule" x1="40" x2="600" y1="262" y2="262"/>'
    stats = [("72%", "faster"), ("−1.4 GB", "peak memory"), ("0.952", "private score")]
    for i, (big, small) in enumerate(stats):
        x = 40 + i * 190
        b += (f'<text class="v-big{" v-accent" if i == 0 else ""}" x="{x}" y="326">{big}</text>'
              f'<text class="v-cap" x="{x}" y="356">{small}</text>')
    return _svg(b, "Bar chart: iterative pipeline 26.6 minutes, vectorised 7.3 minutes; 72% faster, 1.4 GB less peak memory, private score 0.952")


def spread():
    """Schematic of the trading rule: a spread z-score with entry, exit and stop."""
    x0, x1, yc, s = 40, 600, 205, 40
    b = '<text class="v-cap" x="40" y="44">schematic: spread z-score and trading rule</text>'
    for k, cls, lab in [(3, "v-band3", "±3σ stop-loss"), (2, "v-band2", "±2σ entry")]:
        b += f'<rect class="{cls}" x="{x0}" y="{yc - k * s}" width="{x1 - x0}" height="{2 * k * s}"/>'
        b += f'<text class="v-cap" x="{x0 + 10}" y="{yc + k * s - 10}">{lab}</text>'
    b += f'<line class="v-rule" x1="{x0}" x2="{x1}" y1="{yc}" y2="{yc}"/>'
    pts = []
    for i in range(0, 281):
        u = i / 280
        z = 0.55 * math.sin(u * 9) + 0.25 * math.sin(u * 23 + 1.0) + 0.1 * math.sin(u * 51)
        z += 2.3 * math.exp(-((u - 0.28) / 0.06) ** 2) + 3.7 * math.exp(-((u - 0.76) / 0.07) ** 2)
        pts.append((x0 + i * 2, yc - z * s))
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    b += f'<path class="v-line" d="{d}"/>'
    def up(level, start=1):
        for i in range(start, len(pts)):
            if pts[i - 1][1] > yc - level * s >= pts[i][1]:
                return i
    def down(level, start):
        for i in range(start, len(pts)):
            if pts[i - 1][1] < yc - level * s <= pts[i][1]:
                return i
    marks = []
    a = up(2)
    if a:
        marks.append((a, "v-dot", "short"))
        x = down(0, a)
        if x:
            marks.append((x, "v-dot-ok", "exit"))
            a2 = up(2, x)
            if a2:
                marks.append((a2, "v-dot", "short"))
                st = up(3, a2)
                if st:
                    marks.append((st, "v-dot-warm", "stop"))
    for k, (i, cls, lab) in enumerate(marks):
        px, py = pts[i]
        left = k >= 2
        tx = px - 12 if left else px + 12
        b += (f'<circle class="{cls}" cx="{px:.1f}" cy="{py:.1f}" r="6"/>'
              f'<text class="v-lab" x="{tx:.1f}" y="{py + 5:.1f}"{" text-anchor=\"end\"" if left else ""}>{lab}</text>')
    b += '<text class="v-cap" x="40" y="372">LightGBM + XGBoost forecast the spread; the rule acts on its z-score</text>'
    return _svg(b, "Schematic line chart of a spread z-score: a short is entered at two sigma and exited at the mean; a second short is stopped out at three sigma")


WWR_ROWS = [(1, 39.42), (2, 42.74), (3, 50.84), (4, 63.56), (5, 45.87), (6, 65.29), (7, 64.64), (8, 63.90)]


def wwr():
    """Per-floor window-to-wall ratio from the tool's sample output, stacked like a tower."""
    b = '<text class="v-cap" x="40" y="44">window-to-wall ratio by floor, sample output</text>'
    x0, scale, fh = 120, 4.6, 34
    top = 70
    for i, (fl, v) in enumerate(reversed(WWR_ROWS)):
        y = top + i * (fh + 4)
        w = v * scale
        b += (f'<text class="v-lab" x="{x0 - 16}" y="{y + 23}" text-anchor="end">F{fl}</text>'
              f'<rect class="bar-muted" x="{x0}" y="{y}" width="{100 * scale}" height="{fh}" rx="3"/>'
              f'<rect class="bar-accent" x="{x0}" y="{y}" width="{w:.1f}" height="{fh}" rx="3"/>'
              f'<text class="v-num v-small" x="{x0 + 100 * scale + 14}" y="{y + 23}">{v:.1f}%</text>')
    return _svg(b, "Horizontal bars of window-to-wall ratio for floors 1 to 8, from 39.4% to 65.3%")


def gauge():
    """Niche score gauge with the example value from the app (topic: Robotic, 63)."""
    cx, cy, r = 210, 262, 140
    def arc(a0, a1):
        p0 = (cx + r * math.cos(math.pi * (1 - a0)), cy - r * math.sin(math.pi * (1 - a0)))
        p1 = (cx + r * math.cos(math.pi * (1 - a1)), cy - r * math.sin(math.pi * (1 - a1)))
        return f"M{p0[0]:.1f},{p0[1]:.1f} A{r},{r} 0 0 1 {p1[0]:.1f},{p1[1]:.1f}"
    b = '<text class="v-cap" x="40" y="44">niche opportunity score, example topic</text>'
    b += f'<path class="v-track" d="{arc(0, 0.5)}"/><path class="v-track" d="{arc(0.5, 1)}"/>'
    b += f'<path class="v-arc" d="{arc(0, 0.63)}"/>'
    b += f'<text class="v-gauge" x="{cx}" y="{cy - 10}" text-anchor="middle">63</text>'
    b += f'<text class="v-cap" x="{cx}" y="{cy + 28}" text-anchor="middle">of 100</text>'
    x = 430
    b += f'<text class="v-cap" x="{x}" y="120">score =</text>'
    for i, (sign, name, cls) in enumerate([("+", "depth", "v-lab"), ("+", "intensity", "v-lab"), ("−", "saturation", "v-lab v-warm")]):
        b += f'<text class="{cls}" x="{x}" y="{160 + i * 36}">{sign} {name}</text>'
    b += '<line class="v-rule" x1="40" x2="600" y1="318" y2="318"/>'
    b += '<text class="v-mono" x="40" y="362">m = views(video) / median views(channel)</text>'
    return _svg(b, "Gauge showing a niche score of 63 out of 100, with the score built from depth, intensity and a saturation penalty")


VIZ = {"vectorized-timeseries-scaling": bench, "ml-stat-arb": spread,
       "rhino-wwr-automation": wwr, "youtube-market-engine": gauge}
