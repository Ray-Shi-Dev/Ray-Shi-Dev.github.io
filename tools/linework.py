"""Derive fine-line studies from the simulation output images, in the site's language:
hairline edges, contour lines traced from each colour field, hatched hotspots, one amber level.
Writes assets/img/<slug>/line.webp and line-sm.webp next to each cover.
Usage: python3 linework.py [slug ...]"""
import sys
import cv2
import numpy as np
from skimage import measure

ROOT = str(__import__("pathlib").Path(__file__).resolve().parents[1] / "assets/img")
BG = np.array([10, 8, 8], np.float32)          # BGR of #08080A
INK = np.array([240, 244, 244], np.float32)     # BGR of #F4F4F0
AMBER = np.array([60, 169, 229], np.float32)    # BGR of #E5A93C
S = 2                                            # supersample


def canvas(h, w):
    return np.zeros((h * S, w * S, 3), np.float32), np.zeros((h * S, w * S), np.float32)


def comp(base, layer_alpha, color, alpha):
    a = np.clip(layer_alpha * alpha, 0, 1)[..., None]
    return base * (1 - a) + color * a


def poly_layer(h, w, contours, thick=1):
    m = np.zeros((h * S, w * S), np.uint8)
    for c in contours:
        if len(c) < 3:
            continue
        pts = np.round(c[:, ::-1] * S * 4).astype(np.int32)
        cv2.polylines(m, [pts], False, 255, thick * S, cv2.LINE_AA, shift=2)
    return m.astype(np.float32) / 255


def edge_layer(gray, lo, hi, blur=5):
    g = cv2.bilateralFilter(gray, 9, 40, 9) if blur else gray
    e = cv2.Canny(g, lo, hi)
    e = cv2.resize(e, None, fx=S, fy=S, interpolation=cv2.INTER_LINEAR)
    return cv2.GaussianBlur(e.astype(np.float32) / 255, (3, 3), 0.6)


def hatch(h, w, mask, gap=7, angle=45):
    yy, xx = np.mgrid[0:h * S, 0:w * S]
    t = np.deg2rad(angle)
    d = (xx * np.cos(t) + yy * np.sin(t)) / S
    lines = (np.abs(((d % gap) - gap / 2)) < 0.55).astype(np.float32)
    lines = cv2.GaussianBlur(lines, (3, 3), 0.7)
    m = cv2.resize(mask.astype(np.float32), (w * S, h * S), interpolation=cv2.INTER_LINEAR)
    return lines * m


def jet_scalar(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hue = hsv[..., 0] * 2
    v = np.clip((240 - hue) / 240, 0, 1)
    v[hue > 255] = 0.0
    return v, hsv[..., 1] / 255, hsv[..., 2] / 255


def masked_blur(v, m, sigma):
    num = cv2.GaussianBlur(v * m, (0, 0), sigma)
    den = cv2.GaussianBlur(m.astype(np.float32), (0, 0), sigma)
    return np.where(den > 1e-3, num / np.maximum(den, 1e-3), 0), den


def finish(base, slug, w, h):
    out = cv2.resize(base, (w, h), interpolation=cv2.INTER_AREA)
    out = np.clip(out, 0, 255).astype(np.uint8)
    cv2.imwrite(f"{ROOT}/{slug}/line.webp", out, [cv2.IMWRITE_WEBP_QUALITY, 86])
    sm = cv2.resize(out, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    cv2.imwrite(f"{ROOT}/{slug}/line-sm.webp", sm, [cv2.IMWRITE_WEBP_QUALITY, 86])


def load(slug):
    img = cv2.imread(f"{ROOT}/{slug}/cover.webp")
    h, w = img.shape[:2]
    return img, h, w


def arup(slug="arup-energy-climate-modelling"):
    img, h, w = load(slug)
    hole = np.zeros((h, w), np.uint8); hole[:, int(w * 0.872):] = 255
    img = cv2.inpaint(img, hole, 9, cv2.INPAINT_TELEA)
    base, _ = canvas(h, w); base[:] = BG
    v, s, val = jet_scalar(img)
    # coolwarm field: red high, blue low; only where the field is saturated
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hue = hsv[..., 0] * 2
    redness = np.where(hue < 60, 1 - hue / 60, np.where(hue > 300, (hue - 300) / 60, 0))
    blueness = np.clip(1 - np.abs(hue - 225) / 45, 0, 1)
    field = 0.5 + 0.5 * (redness - blueness) * np.clip(s * 1.6, 0, 1)
    sm, den = masked_blur(field, np.ones_like(field), 6)
    lv = np.linspace(0.32, 0.86, 16)
    for i, L in enumerate(lv):
        cs = [c for c in measure.find_contours(sm, L) if len(c) > 40]
        lay = poly_layer(h, w, cs)
        base = comp(base, lay, AMBER if i == len(lv) - 3 else INK, 1.0 if i == len(lv) - 3 else 0.3 + 0.35 * i / len(lv))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    g = cv2.GaussianBlur(gray, (0, 0), 2.2)
    e = edge_layer(g, 22, 60, blur=0)
    keep = np.ones((h * S, w * S), np.float32); keep[:, int(w * 0.868) * S:] = 0
    base = comp(base, np.clip(e * keep * 1.4, 0, 1), INK, 1.0)
    finish(base, slug, w, h)


def coast(slug="remote-sensing-west-coast"):
    img, h, w = load(slug)
    base, _ = canvas(h, w); base[:] = BG
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hue, s, val = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
    # heat field: vivid jet colours
    heat = (s > 0.55) & (val > 0.45) & ~((hue > 190) & (hue < 235) & (val < 0.75))
    heat = cv2.morphologyEx(heat.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)).astype(bool)
    v, _, _ = jet_scalar(img)
    v = np.where((hue > 255) & heat, 0.02, v)
    sm, den = masked_blur(v, heat.astype(np.float32), 5)
    inside = den > 0.5
    # ocean: deep blue, low-mid value
    ocean = ((hue > 195) & (hue < 250) & (s > 0.25) & (val < 0.62) & ~heat).astype(np.uint8)
    ocean = cv2.morphologyEx(ocean, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    ocean = cv2.morphologyEx(ocean, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    land = 1 - ocean
    # terrain relief as faint edges on land
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    e = edge_layer(gray, 40, 110) * cv2.resize(land.astype(np.float32), (w * S, h * S))
    base = comp(base, e, INK, 0.22)
    # bathymetry-like hatch over the sea, very faint
    base = comp(base, hatch(h, w, ocean, gap=9, angle=0), INK, 0.07)
    # coastline
    cs = measure.find_contours(cv2.GaussianBlur(ocean.astype(np.float32), (0, 0), 3), 0.5)
    cs = [c for c in cs if len(c) > 400]
    base = comp(base, poly_layer(h, w, cs, 1), INK, 0.85)
    # contour bands of the concentration field
    lv = np.linspace(0.08, 0.94, 18)
    for i, L in enumerate(lv):
        cs = [c for c in measure.find_contours(np.where(inside, sm, -1), L) if len(c) > 30]
        a = 0.25 + 0.6 * i / len(lv)
        hi = i >= len(lv) - 3
        base = comp(base, poly_layer(h, w, cs), AMBER if hi else INK, 1.0 if hi else a)
    finish(base, slug, w, h)


def lisa(slug="sme-spatial-analysis-taipei"):
    img, h, w = load(slug)
    base, _ = canvas(h, w); base[:] = BG
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hue, s, val = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
    red = ((hue < 15) | (hue > 345)) & (s > 0.5) & (val > 0.4)
    blue = (hue > 215) & (hue < 255) & (s > 0.6) & (val > 0.3)
    pale = (hue > 215) & (hue < 270) & (s > 0.18) & (s <= 0.6) & (val > 0.5)
    k = np.ones((3, 3), np.uint8)
    red = cv2.morphologyEx(red.astype(np.uint8), cv2.MORPH_OPEN, k)
    blue = cv2.morphologyEx(blue.astype(np.uint8), cv2.MORPH_OPEN, k)
    pale = cv2.morphologyEx(pale.astype(np.uint8), cv2.MORPH_OPEN, k)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # district boundaries: thin darker lines on the light map
    lines = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 15, 9)
    lines[(red > 0) | (blue > 0)] = 0
    grid = cv2.morphologyEx(lines, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (61, 1))) | \
        cv2.morphologyEx(lines, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 61)))
    grid = cv2.dilate(grid, np.ones((3, 3), np.uint8))
    lines[grid > 0] = 0
    lines = cv2.morphologyEx(lines, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    ln = cv2.resize(lines, (w * S, h * S), interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255
    base = comp(base, cv2.GaussianBlur(ln, (3, 3), 0.6), INK, 0.42)
    base = comp(base, hatch(h, w, blue, gap=6, angle=-45), INK, 0.5)
    base = comp(base, hatch(h, w, pale, gap=10, angle=-45), INK, 0.35)
    base = comp(base, hatch(h, w, red, gap=4, angle=45), AMBER, 1.0)
    for m, col, a in [(blue, INK, 0.8), (red, AMBER, 1.0), (pale, INK, 0.5)]:
        cs = measure.find_contours(cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.2), 0.5)
        base = comp(base, poly_layer(h, w, cs), col, a)
    finish(base, slug, w, h)


def oasis(slug="urban-oasis-uhi"):
    img, h, w = load(slug)
    base, _ = canvas(h, w); base[:] = BG
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hue, s, val = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
    heat = ((hue < 62) | (hue > 340)) & (s > 0.45) & (val > 0.45)
    heat[int(h * 0.9):] = False                    # leave out the legend bar
    heat = cv2.morphologyEx(heat.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray[int(h * 0.9):] = 235
    e = edge_layer(gray, 22, 70, blur=0)
    e[int(h * 0.885) * S:] = 0
    base = comp(base, e, INK, 0.7)
    # faces in shadow get a faint hatch, so the massing reads as volume
    shade = ((gray < 200) & (gray > 120) & (heat == 0)).astype(np.uint8)
    shade = cv2.morphologyEx(shade, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    base = comp(base, hatch(h, w, shade, gap=6, angle=60), INK, 0.22)
    base = comp(base, hatch(h, w, heat, gap=4, angle=45), AMBER, 0.95)
    cs = measure.find_contours(cv2.GaussianBlur(heat.astype(np.float32), (0, 0), 1.2), 0.5)
    base = comp(base, poly_layer(h, w, cs), AMBER, 1.0)
    finish(base, slug, w, h)


JOBS = {"arup-energy-climate-modelling": arup, "remote-sensing-west-coast": coast,
        "sme-spatial-analysis-taipei": lisa, "urban-oasis-uhi": oasis}
if __name__ == "__main__":
    for k in (sys.argv[1:] or JOBS):
        JOBS[k](); print("done", k)
