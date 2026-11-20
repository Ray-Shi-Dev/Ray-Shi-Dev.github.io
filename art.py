"""Line artworks for the software catalogue, drawn in the hero's fine-line language.
Each returns an inline SVG (1200 x 750) of hairlines on obsidian with one amber accent.
They illustrate what each tool does; captions on the page say which are schematic."""
import math
import random

W, H = 1200, 750
INK = "#F4F4F0"
AMBER = "#E5A93C"


def _svg(body, label):
    return (f'<svg class="art" viewBox="0 0 {W} {H}" role="img" aria-label="{label}" '
            f'xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">{body}</svg>')


def _t(x, y, s, cls="a-t", anchor="start"):
    return f'<text class="{cls}" x="{x:.0f}" y="{y:.0f}" text-anchor="{anchor}">{s}</text>'


# ---- 02 window-to-wall ratio: an elevation drawn floor by floor --------------------------
WWR = [(1, 39.42), (2, 42.74), (3, 50.84), (4, 63.56), (5, 45.87), (6, 65.29), (7, 64.64), (8, 63.90)]


def facade():
    b = []
    x0, x1, ground, fh, bays = 300, 820, 668, 64, 8
    bw = (x1 - x0) / bays
    top = ground - fh * len(WWR)
    # ground line with section hatch
    b.append(f'<line class="a-l3" x1="70" y1="{ground}" x2="1130" y2="{ground}"/>')
    for x in range(80, 1130, 14):
        b.append(f'<line class="a-l1" x1="{x}" y1="{ground + 1}" x2="{x - 10}" y2="{ground + 11}"/>')
    # floors
    for f, v in WWR:
        y1 = ground - (f - 1) * fh
        y0 = y1 - fh
        hi = f == 6
        b.append(f'<line class="a-l2" x1="{x0 - 14}" y1="{y0:.1f}" x2="{x1 + 14}" y2="{y0:.1f}"/>')
        wh = fh * 0.62
        ww = min(bw * 0.94, (v / 100) * bw * fh / wh)
        wy = y0 + (fh - wh) * 0.42
        for k in range(bays):
            cx = x0 + bw * (k + 0.5)
            wx = cx - ww / 2
            cls = "a-hi" if hi else "a-l3"
            b.append(f'<rect class="{cls} a-nofill" x="{wx:.1f}" y="{wy:.1f}" width="{ww:.1f}" height="{wh:.1f}"/>')
            n = int(ww // 5)
            for j in range(1, n):
                hx = wx + j * ww / n
                b.append(f'<line class="{"a-hi2" if hi else "a-l1"}" x1="{hx:.1f}" y1="{wy:.1f}" x2="{hx:.1f}" y2="{wy + wh:.1f}"/>')
        # label and leader
        ly = y0 + fh / 2
        b.append(f'<line class="{"a-hi" if hi else "a-l1"} a-dash" x1="{x1 + 22}" y1="{ly:.1f}" x2="{x1 + 92}" y2="{ly:.1f}"/>')
        b.append(_t(x1 + 104, ly + 5, f"F{f}", "a-t a-thi" if hi else "a-t"))
        b.append(_t(x1 + 150, ly + 5, f"{v:.1f}%", "a-t a-thi" if hi else "a-t"))
        b.append(f'<line class="a-l2" x1="{x1 + 214}" y1="{ly:.1f}" x2="{x1 + 214 + v * 0.9:.1f}" y2="{ly:.1f}"/>' if not hi else
                 f'<line class="a-hi" x1="{x1 + 214}" y1="{ly:.1f}" x2="{x1 + 214 + v * 0.9:.1f}" y2="{ly:.1f}" stroke-width="3"/>')
    # piers and parapet
    for k in range(bays + 1):
        x = x0 + bw * k
        b.append(f'<line class="a-l2" x1="{x:.1f}" y1="{top - 18}" x2="{x:.1f}" y2="{ground}"/>')
    b.append(f'<rect class="a-l3 a-nofill" x="{x0}" y="{top - 18}" width="{x1 - x0}" height="{ground - top + 18}"/>')
    # dimension line
    b.append(f'<line class="a-l2" x1="{x0 - 60}" y1="{top}" x2="{x0 - 60}" y2="{ground}"/>')
    for f in range(len(WWR) + 1):
        y = ground - f * fh
        b.append(f'<line class="a-l2" x1="{x0 - 66}" y1="{y}" x2="{x0 - 54}" y2="{y}"/>')
    b.append(_t(x0 - 74, (top + ground) / 2, "8 floors", "a-t", "end"))
    b.append(_t(70, 72, "South elevation, sample output", "a-t a-tcap"))
    b.append(_t(70, 96, "glass area / wall area, per floor", "a-t"))
    return _svg("".join(b), "Elevation of an eight-storey facade; window widths drawn to each floor's window-to-wall ratio, from 39.4% on floor 1 to a peak of 65.3% on floor 6, highlighted")


# ---- 03 YouTube engine: every video a ray, length = views over its channel median ---------
def bloom():
    rnd = random.Random(5)
    cx, cy, r0, k = 600, 382, 62, 118
    b = []
    R = lambda m: r0 + k * (math.log10(m) + 1.2)
    for m, lab in [(0.1, "0.1x"), (1, "1x median"), (10, "10x")]:
        r = R(m)
        cls = "a-hi a-dash" if m == 10 else "a-l2 a-dash"
        b.append(f'<circle class="{cls} a-nofill" cx="{cx}" cy="{cy}" r="{r:.1f}"/>')
        b.append(_t(cx + r * 0.71 + 8, cy - r * 0.71 - 4, lab, "a-t a-thi" if m == 10 else "a-t"))
    n = 340
    for i in range(n):
        a = -math.pi / 2 + 2 * math.pi * i / n + rnd.uniform(-0.004, 0.004)
        lm = rnd.gauss(0.0, 0.42)
        if rnd.random() < 0.022:
            lm = rnd.uniform(1.02, 1.3)
        m = 10 ** lm
        r1 = max(r0 * 0.6, R(m))
        hi = m >= 10
        xa, ya = cx + math.cos(a) * r0 * 0.55, cy + math.sin(a) * r0 * 0.55
        xb, yb = cx + math.cos(a) * r1, cy + math.sin(a) * r1
        b.append(f'<line class="{"a-hi" if hi else "a-l2"}" x1="{xa:.1f}" y1="{ya:.1f}" x2="{xb:.1f}" y2="{yb:.1f}"/>')
        b.append(f'<circle class="{"a-dhi" if hi else "a-d"}" cx="{xb:.1f}" cy="{yb:.1f}" r="{2.6 if hi else 1.3}"/>')
    b.append(f'<circle class="a-d" cx="{cx}" cy="{cy}" r="3"/>')
    b.append(_t(70, 72, "One channel, illustrative", "a-t a-tcap"))
    b.append(_t(70, 96, "ray length = views / channel median, log scale", "a-t"))
    b.append(_t(1130, 690, "outliers above 10x feed the niche score", "a-t a-thi", "end"))
    return _svg("".join(b), "Radial chart: each ray is one video, its length the video's views over the channel median on a log scale; the few rays past ten times the median are highlighted")


# ---- 04 pairs trading: a spread, its bands, the entries and the one the model vetoed -----
def spread_fan():
    rnd = random.Random(11)
    x0, x1, yc, s = 70, 1130, 400, 62
    n = 260
    xs = [x0 + (x1 - x0) * i / (n - 1) for i in range(n)]

    def path(seed, kick=True):
        r = random.Random(seed)
        v, out = 0.0, []
        for i in range(n):
            u = i / (n - 1)
            v += -0.06 * v + r.gauss(0, 0.32)
            bump = 0
            if kick:
                bump = (2.5 * math.exp(-((u - 0.16) / 0.04) ** 2) - 2.2 * math.exp(-((u - 0.4) / 0.045) ** 2)
                        + 4.4 * math.exp(-((u - 0.68) / 0.08) ** 2) * (1 if u < 0.68 else 1.0)
                        - 2.4 * math.exp(-((u - 0.9) / 0.035) ** 2))
            out.append(v * 0.55 + bump)
        return out

    b = []
    for k in (-2, -1, 0, 1, 2):
        cls = "a-l3 a-dash" if abs(k) == 2 else "a-l1"
        b.append(f'<line class="{cls}" x1="{x0}" y1="{yc - k * s}" x2="{x1}" y2="{yc - k * s}"/>')
    b.append(_t(x0, yc - 2 * s - 10, "+2σ entry", "a-t"))
    b.append(_t(x0, yc + 2 * s + 26, "−2σ entry", "a-t"))
    for j in range(46):
        p = path(100 + j, kick=False)
        d = "M" + " L".join(f"{x:.1f},{yc - v * s * 0.8:.1f}" for x, v in zip(xs, p))
        b.append(f'<path class="a-l1 a-nofill" d="{d}"/>')
    main = path(3)
    d = "M" + " L".join(f"{x:.1f},{yc - v * s:.1f}" for x, v in zip(xs, main))
    b.append(f'<path class="a-main a-nofill" d="{d}"/>')
    # entries where |z| first crosses 2
    for i in range(1, n):
        if abs(main[i - 1]) <= 2 < abs(main[i]):
            x, y = xs[i], yc - main[i] * s
            if 0.6 < (i / n) < 0.75:
                b.append(f'<path class="a-hi" d="M{x - 9:.1f},{y - 9:.1f} L{x + 9:.1f},{y + 9:.1f} M{x - 9:.1f},{y + 9:.1f} L{x + 9:.1f},{y - 9:.1f}" stroke-width="2"/>')
                b.append(_t(x - 22, y - 12, "vetoed: P(breakdown) ≥ 0.70", "a-t a-thi", "end"))
            else:
                b.append(f'<circle class="a-ring" cx="{x:.1f}" cy="{y:.1f}" r="6"/>')
    b.append(_t(70, 72, "Spread z-score, schematic", "a-t a-tcap"))
    b.append(_t(70, 96, "46 bootstrap paths behind the traded spread", "a-t"))
    return _svg("".join(b), "Schematic of a pairs-trading spread with plus and minus two sigma entry bands, trade entries marked, and one entry vetoed by the model where the spread broke away")


ART = {"rhino-wwr-automation": facade, "youtube-market-engine": bloom, "ml-stat-arb": spread_fan}
CAPTIONS = {
    "vectorized-timeseries-scaling": "Loop to vector. Left, one stroke per building, processed in turn; right, the same strokes aligned by a single group transform. Move across it.",
    "rhino-wwr-automation": "Elevation drawn from the tool's sample output: window width scaled to each floor's window-to-wall ratio.",
    "youtube-market-engine": "Each ray is one video. Length is views over the channel median, on a log scale. Illustrative data.",
    "ml-stat-arb": "Schematic of the strategy: spread bands, entries, and the trade the model vetoes when breakdown risk is high.",
}
