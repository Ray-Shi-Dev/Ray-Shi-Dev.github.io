"""Static site generator. Run: python3 build.py  -> writes HTML into this folder."""
import json, html, re, os, sys
from pathlib import Path
from PIL import Image
from content import (SITE, GROUPS, PROJECTS, VENTURES, ABOUT, EXPERIENCE,
                     EDUCATION, TOOLKIT, CREDENTIALS, SERVICE)
from viz import VIZ, bench, DEFS
from art import ART, CAPTIONS
from cases import CASES
from posts import POSTS
from pygments import highlight
from pygments.lexers import PythonLexer
from pygments.formatters import HtmlFormatter

ROOT = Path(os.environ.get("SITE_OUT") or Path(__file__).parent)
DRAFTS = "--drafts" in sys.argv
BUILD_DATE = __import__("datetime").date.today().isoformat()
IMG = ROOT / "assets" / "img"
e = html.escape
YEAR = 2026
VERSION="21"

ICON_OUT = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5 11L11 5M6 5h5v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
ICON_CODE = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
ICON_DOWN = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'


def size(path):
    with Image.open(ROOT / path.lstrip("/")) as im:
        return im.size


def sheets(slug):
    return sorted(p.name for p in (IMG / slug).glob("sheet-*-sm.webp"))


def chips(text, n=6):
    parts = [x.strip() for x in text.split(",") if x.strip()]
    return "".join(f'<li class="chip">{e(x)}</li>' for x in parts[:n])


def head(title, desc, path, og, extra=""):
    url = SITE["url"] + path
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="author" content="Ray Shi">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ray Shi">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE['url']}{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#070709">
<meta name="color-scheme" content="dark">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/instrument-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v={VERSION}">
{feed_link()}{verify_tag()}{analytics_tag()}
<script>document.documentElement.classList.add('js');setTimeout(function(){{var h=document.querySelector('.hero');h&&h.classList.add('is-ready')}},3000)</script>
{extra}</head>"""


def feed_link():
    return '\n<link rel="alternate" type="application/atom+xml" title="Ray Shi, writing" href="/feed.xml">' if LIVE_POSTS else ""


def verify_tag():
    v = SITE.get("google_site_verification")
    return f'\n<meta name="google-site-verification" content="{e(v)}">' if v else ""


def analytics_tag():
    g = SITE.get("goatcounter")
    return f'\n<script data-goatcounter="https://{e(g)}.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>' if g else ""


LIVE_POSTS = sorted((p for p in POSTS if DRAFTS or not p.get("draft")), key=lambda p: p["date"], reverse=True)
NAV = [("Work", "/#work")] + ([("Writing", "/writing/")] if LIVE_POSTS else []) + [("Experience", "/#experience"), ("About", "/#about"), ("CV", "/cv/")]


def nav(current="", clear=False):
    links = "".join(
        f'<a href="{h}"{" aria-current=\"page\"" if t == current else ""}>{t}</a>' for t, h in NAV)
    return f"""{DEFS}
<div class="guides" aria-hidden="true"></div>
<a class="skip" href="#main">Skip to content</a>
<header class="nav{' nav--clear' if clear else ''}">
  <div class="container nav-inner">
    {'' if clear else '<a class="nav-home" href="/">Index</a>'}
    <nav class="nav-links" aria-label="Primary">{links}<a class="nav-cta" href="mailto:{SITE['email']}">Contact</a></nav>
  </div>
</header>"""


def contact_block():
    cta = f"""<p class="plate-text">Open to conversations about data science, machine learning and software engineering roles.</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="mailto:{SITE['email']}">Email me</a>
      <a class="btn" href="{SITE['linkedin']}" rel="me">LinkedIn {ICON_OUT}</a>
      <a class="btn" href="{SITE['github']}" rel="me">GitHub {ICON_OUT}</a>
    </div>"""
    return f"""<section class="contact" id="contact" aria-labelledby="contact-title">
  {plate("moire", "04", "Contact", "contact-title", "Let's work on something with data.", "Interference. Two ring fields, one fixed on Tainan, one following you.", cta)}
</section>
<script src="/assets/plates.js?v={VERSION}" defer></script>"""


def footer():
    return f"""<footer class="foot">
  <div class="container foot-inner">
    <span>© {YEAR} Ray Shi, Tainan</span>
    <nav aria-label="Footer"><a href="/#work">Work</a><a href="/cv/">CV</a><a href="{SITE['github']}">GitHub</a><a href="{SITE['linkedin']}">LinkedIn</a><a href="mailto:{SITE['email']}">Email</a></nav>
  </div>
</footer>"""


def img_tag(slug, alt, sizes="100vw", eager=False):
    big = f"/assets/img/{slug}/cover.webp"
    sm = f"/assets/img/{slug}/cover-sm.webp"
    w, h = size(big)
    ws, _ = size(sm)
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<img src="{sm}" srcset="{sm} {ws}w, {big} {w}w" sizes="{sizes}" width="{w}" height="{h}" '
            f'alt="{e(alt)}" {load} decoding="async">')


def facts_block(facts):
    def val(k, v):
        return f'<a href="https://{e(v)}">{e(v.split("/")[-1])}</a>' if k == "Code" else e(v)
    rows = "".join(f"<div><dt>{e(k)}</dt><dd>{val(k, v)}</dd></div>" for k, v in facts)
    return f'<dl class="facts">{rows}</dl>'


def stack(text, n=8):
    parts = [x.strip() for x in text.split(",") if x.strip()][:n]
    return f'<p class="stack">{"".join(f"<span>{e(x)}</span>" for x in parts)}</p>'


def count_attr(val):
    """data attributes for the count-up animation, e.g. '72%' or '1.4 GB'."""
    m = re.match(r"^([^0-9]*)([0-9]+(?:\.[0-9]+)?)(.*)$", val)
    if not m:
        return ""
    pre, num, suf = m.groups()
    dec = len(num.split(".")[1]) if "." in num else 0
    return f' data-count="{num}" data-dec="{dec}" data-pre="{e(pre)}" data-suf="{e(suf)}"'


_FMT = HtmlFormatter(nowrap=True, classprefix="t-")


def hl_lines(code):
    return highlight(code, PythonLexer(), _FMT).rstrip("\n").split("\n")


def code_window(file, inner, label=""):
    return f"""<figure class="code-win">
  <figcaption class="code-bar"><span class="code-file">{e(file)}</span><span class="code-label">{e(label)}</span></figcaption>
  <pre tabindex="0"><code>{inner}</code></pre>
</figure>"""


def code_block(file, code):
    lines = hl_lines(code)
    inner = "".join(f'<span class="ln"><span class="ln-n" aria-hidden="true">{i}</span>{l or " "}</span>' for i, l in enumerate(lines, 1))
    return code_window(file, inner, "Python")


def _diff_inner(before, after):
    b, a = hl_lines(before), hl_lines(after)
    inner = "".join(f'<span class="ln del"><span class="ln-n" aria-hidden="true">−</span>{l or " "}</span>' for l in b)
    inner += "".join(f'<span class="ln add"><span class="ln-n" aria-hidden="true">+</span>{l or " "}</span>' for l in a)
    return inner, len(b), len(a)


def diff_block(file, before, after):
    inner, nb, na = _diff_inner(before, after)
    return code_window(file, inner, f"−{nb} +{na}")


def diff_switch(steps):
    tabs, panels = "", ""
    for i, st in enumerate(steps):
        inner, nb, na = _diff_inner(st["before"], st["after"])
        sel = "true" if i == 0 else "false"
        tabs += f'<button class="diff-tab" type="button" role="tab" id="dt-{i}" aria-selected="{sel}" aria-controls="dp-{i}" tabindex="{0 if i == 0 else -1}">{e(st["file"])}</button>'
        panels += f'<div class="diff-panel" role="tabpanel" id="dp-{i}" aria-labelledby="dt-{i}"{" hidden" if i else ""}><pre tabindex="0"><code>{inner}</code></pre></div>'
    return f"""<figure class="code-win diff-switch">
  <figcaption class="code-bar"><span class="diff-tabs" role="tablist" aria-label="Before and after">{tabs}</span><span class="code-label">diff, before and after</span></figcaption>
  {panels}
</figure>"""


def featured_card(p):
    f = dict(p["facts"])
    c = CASES[p["slug"]]
    diff_steps = [x for x in c["approach"] if x.get("before")]
    metrics = "".join(f'<div><dt>{e(lab)}</dt><dd{count_attr(val)}>{e(val)}</dd></div>' for val, lab in c["metrics"])
    return f"""<article class="lead">
  <p class="lead-top"><span class="idx"><b>01</b> / Featured case study</span><span class="idx">{e(p['repo'])}</span></p>
  <div class="lead-head">
    <h3><a href="/work/{p['slug']}/">{e(p['title'])}</a></h3>
    <div class="lead-side"><p class="lead-kind">{e(f['Type'])}</p><p class="lead-sum">{e(p['summary'])}</p>{stack(f['Stack'], 7)}
      <a class="ex-more" href="/work/{p['slug']}/">Read the case study {ICON_OUT}</a></div>
  </div>
  <figure class="lead-art">
    <div class="lead-frame" data-plate="molnar"><canvas class="plate-art" aria-hidden="true"></canvas></div>
    <figcaption><span class="idx">Fig. 01</span><span>{e(CAPTIONS[p['slug']])}</span></figcaption>
  </figure>
  <dl class="lead-metrics">{metrics}</dl>
  <div class="lead-evidence">
    {diff_switch(diff_steps)}
    <div class="viz-wrap">{bench(compact=True)}</div>
  </div>
</article>"""


def bento_card(p, n):
    f = dict(p["facts"])
    return f"""<li class="sw"><a href="/work/{p['slug']}/">
  <figure class="sw-art">{ART[p['slug']]()}</figure>
  <p class="sw-top"><span class="idx"><b>{n:02d}</b></span><span class="idx">{e(p['repo'])}</span></p>
  <h3>{e(p['title'])}</h3>
  <p class="sw-kind">{e(f['Type'])}</p>
  <p class="sw-sum">{e(p['summary'])}</p>
  {stack(f['Stack'], 5)}
  <p class="sw-cap"><span class="idx">Fig. {n:02d}</span> {e(CAPTIONS[p['slug']])}</p>
</a></li>"""


FOCUS = {"sme-spatial-analysis-taipei": "50% 62%", "remote-sensing-west-coast": "50% 38%", "arup-energy-climate-modelling": "50% 30%"}


def plate_item(p, n, sizes, cls=""):
    loc = dict(p["facts"]).get("Location", "")
    return f"""<li class="pl{cls}"><a href="/work/{p['slug']}/">
  <figure class="pl-fig" style="--pos:{FOCUS.get(p['slug'], '50% 50%')}">{img_tag(p['slug'], p['cover_alt'], sizes=sizes)}</figure>
  <div class="pl-cap">
    <p class="pl-meta"><span class="idx"><b>Fig. {n:02d}</b></span><span class="idx">{e(loc)}</span></p>
    <h3>{e(p['title'])}</h3>
    {f'<p class="pl-sum">{e(p["summary"])}</p>' + stack(p['tags']) if not cls else ''}
  </div>
</a></li>"""


def timeline(items, now_first=False):
    out = ""
    for k, x in enumerate(items):
        tag = '<span class="now-tag">Now</span>' if now_first and k == 0 and "now" in x["years"] else ""
        a, _, b = x["years"].partition("–")
        s0 = float(a.strip()); s1 = 2026.95 if "now" in b else float(b.strip()) + 0.5
        pa = (s0 + 0.5 - 2016) / 11 * 100 if "now" not in b else (2026.75 - 2016) / 11 * 100
        pb = (s1 - 2016) / 11 * 100
        span = f'<span class="tl-span{" is-now" if "now" in b else ""}" aria-hidden="true"><i style="left:{pa:.1f}%;width:{max(1.2, pb - pa):.1f}%"></i></span>'
        out += f"""<li class="tl">
  <p class="tl-years">{e(x['years'])}{span}</p>
  <div><h4>{e(x['role'])}{tag}</h4><p class="tl-org">{e(x['org'])}</p></div>
  <p class="tl-text">{e(x['text'])}</p>
</li>"""
    return out


def pairs(items):
    return "".join(f"<li><span class='a'>{e(a)}</span><span class='b'>{e(b)}</span></li>" for a, b in items)


PERSON_ID = SITE["url"] + "/#person"


def jsonld():
    person = {
        "@type": "Person", "@id": PERSON_ID, "name": "Ray Shi",
        "alternateName": "Chun-Rui Shi", "jobTitle": SITE["role"], "url": SITE["url"],
        "email": f"mailto:{SITE['email']}", "image": SITE["url"] + "/assets/img/ray-shi-cut.webp",
        "sameAs": [SITE["linkedin"], SITE["github"]],
        "affiliation": {"@type": "CollegeOrUniversity", "name": "National Cheng Kung University"},
        "alumniOf": [{"@type": "CollegeOrUniversity", "name": n} for n in
                     ["The University of Manchester", "National Cheng Kung University", "National University of Kaohsiung"]],
        "knowsAbout": ["Data science", "Machine learning", "Python", "Time-series analysis", "Spatial statistics",
                       "GIS", "Building energy simulation", "Computational geometry"],
        "description": SITE["description"],
    }
    data = {"@context": "https://schema.org", "@type": "ProfilePage", "url": SITE["url"] + "/", "name": SITE["title"],
            "dateModified": BUILD_DATE, "mainEntity": person}
    return f'<script type="application/ld+json">{json.dumps(data)}</script>\n'


MODES = [
    ("01", "Spatial Data Science", "Is the surface clustered, and where? Every point is a 2 km cell tested with local Moran's I and Getis–Ord Gi*."),
    ("02", "Physics-Based Simulation", "Wind and sun on a twisted tower in Tainan at the summer solstice: pressure from potential flow, irradiance from the sun path."),
    ("03", "Representation Learning", "A network untangles a rolled manifold layer by layer, keeping only the strongest weights as it goes."),
]


def sec_head(n, label, title_id, title, lede="", link=""):
    return f"""<header class="sec-head">
    <p class="idx"><b>{n}</b> / {e(label)}</p>
    <h2 id="{title_id}" class="sec-title">{e(title)}</h2>
    {f'<p class="sec-lede">{e(lede)}</p>' if lede else ''}
    {link}
  </header>"""


def sub_head(n, title, lede, hid=""):
    return f"""<header class="sub-head"{f' id="{hid}"' if hid else ''}><p class="idx">{n}</p><h3 class="sub-title">{e(title)}</h3><p>{e(lede)}</p></header>"""


# Career events for the Experience plate's year ruler: (start, end, label, current)
CAREER = [
    (2016.7, 2020.5, "Bachelor of Architecture, Kaohsiung", False),
    (2020.7, 2023.5, "MSc Urban Planning, NCKU", False),
    (2021.0, 2022.9, "Research assistant, urban planning, NCKU", False),
    (2022.7, 2023.7, "MSc Urban Design, Manchester", False),
    (2024.45, 2026.55, "Graduate consultant, Arup", False),
    (2024.45, 2025.45, "AI trainer, Outlier", False),
    (2026.75, 2027.0, "Research assistant, computer science, NCKU", True),
]


def plate(kind, n, label, hid, title, caption, extra="", data=""):
    return f"""<div class="plate plate--{kind}" data-plate="{kind}"{data}>
  <canvas class="plate-art" aria-hidden="true"></canvas>
  <div class="container plate-inner">
    <p class="idx plate-idx"><b>{n}</b> / {e(label)}</p>
    <div class="plate-foot"><h2 id="{hid}" class="plate-title">{e(title)}</h2>{extra}</div>
    <p class="plate-cap">{caption}</p>
  </div>
</div>"""


def sec_intro(lede, link=""):
    return f"""<div class="sec-intro">{f'<p class="sec-lede">{e(lede)}</p>' if lede else ''}{link}</div>"""


def home():
    soft = [p for p in PROJECTS if p["group"] == "software"]
    sim = [p for p in PROJECTS if p["group"] == "simulation"]
    des = [p for p in PROJECTS if p["group"] == "design"]
    g = {k: (l, d) for k, l, d in GROUPS}

    if VENTURES:
        vitems = "".join(f"""<li class="venture"><a href="{e(v['url'])}"><h3>{e(v['name'])}</h3><p>{e(v['text'])}</p></a></li>""" for v in VENTURES)
        ventures = f'<ul class="ventures">{vitems}</ul>'
    else:
        ventures = '<p class="ventures-empty">Products I\'m building on my own will be listed here as they launch.</p>'

    cred = "".join(f'<li{" class=\"now\"" if k == 0 else ""}><span class="org">{e(a)}</span><span class="what">{e(b)}</span><span class="yrs">{e(c)}</span></li>' for k, (a, b, c) in enumerate(SITE["affiliations"]))
    modes = "".join(f'<button class="morph-tab" type="button" aria-pressed="{"true" if i == 0 else "false"}" data-story="{e(s)}"><span class="idx">{n}</span><span class="lab">{e(t)}</span></button>' for i, (n, t, s) in enumerate(MODES))
    bio = "".join(f"<p>{e(x)}</p>" for x in ABOUT["bio"])
    toolkit = "".join(f"""<li class="tk"><h4>{e(k)}</h4>{stack(v, 20)}</li>""" for k, v in TOOLKIT)
    proof = "".join(f"<li><b>{e(a)}</b> {e(t)}</li>" for a, t in SITE["proof"])
    career = e(json.dumps([{"s": s, "e": en, "t": t, "now": now} for s, en, t, now in CAREER]))

    page = head(SITE["title"], SITE["description"], "/", "/assets/og/home.jpg", jsonld())
    page += f"""
<body class="home">
{nav(clear=True)}
<main id="main">
<section class="hero" aria-label="Introduction">
  <canvas class="gl" aria-hidden="true"></canvas>
  <div class="probe-layer" aria-hidden="true"></div>
  <p class="hero-hint" aria-hidden="true"><i></i><span class="on-hover">The model is live. Hover any point for its reading, click to pin it, or open a numbered tag.</span><span class="on-touch">The model is live. Tap any point for its reading.</span></p>
  <div class="container hero-inner">
    <div class="hero-main">
      <h1 class="hero-title reveal">Ray Shi</h1>
      <div class="hero-row reveal">
        <div class="hero-copy">
          <p class="hero-sub">{e(SITE['hero_sub'])}</p>
          <ul class="hero-proof">{proof}</ul>
        </div>
        <div class="hero-cta">
          <a class="btn btn-primary" href="mailto:{SITE['email']}" data-goatcounter-click="hero-email">Email me</a>
          <a class="btn" href="/cv/" data-goatcounter-click="hero-cv">CV</a>
          <a class="btn" href="{SITE['github']}" data-goatcounter-click="hero-github">GitHub {ICON_OUT}</a>
          <p class="hero-open"><i aria-hidden="true"></i>{e(SITE['open_to'])}</p>
        </div>
      </div>
    </div>
    <div class="modes reveal">
      <p class="story" aria-live="polite"></p>
      <div class="mode-list" role="group" aria-label="3D scene">{modes}</div>
      <p class="coord">22.9997° N, 120.2170° E</p>
    </div>
  </div>
</section>
<section class="container cred-band" aria-label="Experience and education">
  <ul class="cred">{cred}</ul>
</section>

<section class="section" id="work" aria-labelledby="work-title">
  {plate("ridge", "01", "Work", "work-title", g['software'][0], "Meter field. 72 hourly load traces over one year, one carrying an injected anomaly. Move across it to scan.")}
  <div class="paper">
  <div class="container">
  {sec_intro(g['software'][1], f'<a class="btn sec-link" href="{SITE["github"]}">All repositories {ICON_OUT}</a>')}
  {featured_card(soft[0])}
  <ol class="sw-list">{''.join(bento_card(p, n) for n, p in enumerate(soft[1:], 2))}</ol>

  {sub_head("01.2", g['simulation'][0], g['simulation'][1])}
  <ol class="pl-grid">{''.join(plate_item(p, 5 + k, "(max-width: 860px) 100vw, 50vw") for k, p in enumerate(sim))}</ol>

  {sub_head("01.3", g['design'][0], g['design'][1])}
  <ol class="pl-grid pl-grid--3">{''.join(plate_item(p, 9 + k, "(max-width: 860px) 100vw, 33vw", " pl--sm") for k, p in enumerate(des))}</ol>
  </div>
  </div>
</section>

{writing_home()}
<section class="section" id="experience" aria-labelledby="exp-title">
  {plate("braid", "02", "Experience", "exp-title", "From building physics to computer science.", "Braid, 2016 to 2026. Strands of practice carried through each role and drawn together into one point. Hover to read the year.", data=f" data-events='{career}'")}
  <div class="container">
  {sec_intro("Ten years across architecture, urban planning and building-energy consulting, now spent on computer science research at NCKU.", '<a class="btn sec-link" href="/cv/">Full CV</a>')}
  <div class="xp-group"><h3>Work</h3><ol>{timeline(EXPERIENCE, now_first=True)}</ol></div>
  <div class="xp-group"><h3>Education</h3><ol>{timeline(EDUCATION)}</ol></div>
  {sub_head("02.3", "Toolkit", "Languages, libraries and tools I use in practice.")}
  <ul class="toolkit">{toolkit}</ul>
  </div>
</section>

<section class="section container" id="about" aria-labelledby="about-title">
  {sec_head("03", "About", "about-title", "Trained to design. Now I write the code.")}
  <div class="about">
    <figure class="portrait-card"><img src="/assets/img/ray-shi-cut.webp" alt="Portrait of Ray Shi" width="820" height="820" loading="lazy" decoding="async"><figcaption>Tainan, Taiwan</figcaption></figure>
    <div class="about-body">{bio}</div>
    <div class="about-side">
      <div><h3>Certificates and membership</h3><ul class="pairs">{pairs(CREDENTIALS)}</ul></div>
      <div><h3>Service</h3><ul class="pairs">{pairs(SERVICE)}</ul></div>
    </div>
  </div>
  {sub_head("03.2", "Ventures", "Independent products.", "ventures")}
  {ventures}
</section>
</main>
{contact_block()}
{footer()}
<script src="/assets/site.js?v={VERSION}" defer></script>
<script src="/assets/hero-gl.js?v={VERSION}" defer></script>
</body></html>"""
    (ROOT / "index.html").write_text(page)


def project_page(i, p):
    slug = p["slug"]
    nxt = PROJECTS[(i + 1) % len(PROJECTS)]
    prv = PROJECTS[i - 1]
    software = p.get("kind") == "software"
    if software:
        items = [(f"/assets/img/{g.removesuffix('.webp')}.webp", f"/assets/img/{g.removesuffix('.webp')}-sm.webp", cap) for g, cap in p.get("gallery", [])]
    else:
        items = [(f"/assets/img/{slug}/{s.replace('-sm', '')}", f"/assets/img/{slug}/{s}", None) for s in sheets(slug)]

    def thumb(n, full, sm, cap):
        w, hh = size(sm)
        alt = cap or f"Portfolio sheet {n} of {len(items)} for {p['title']}"
        capt = f"<figcaption>{e(cap)}</figcaption>" if cap else ""
        return f"""<li><figure><button class="sheet" type="button" data-full="{full}" aria-label="Open image {n} of {len(items)} full size"><img src="{sm}" alt="{e(alt)}" loading="lazy" decoding="async" width="{w}" height="{hh}"></button>{capt}</figure></li>"""

    if items:
        gtitle = "Screenshots" if software else "Portfolio sheets"
        glede = ("Select an image to view it full size." if software else
                 f"{len(items)} original presentation boards. Select one to view it full size.")
        gallery_section = f"""<section class="container p-gallery" aria-labelledby="sheets-title">
    <div class="p-gallery-head"><h2 id="sheets-title">{gtitle}</h2><p>{glede}</p></div>
    <ul class="sheets{' sheets--shots' if software else ''}">{''.join(thumb(n, *it) for n, it in enumerate(items, 1))}</ul>
  </section>"""
    else:
        gallery_section = ""

    results = ""
    if p.get("results"):
        hd = "".join(f'<th scope="col">{e(x)}</th>' for x in p["results_head"])
        rows = "".join("<tr>" + f'<th scope="row">{e(r[0])}</th>' + "".join(f"<td>{e(c)}</td>" for c in r[1:]) + "</tr>" for r in p["results"])
        results = f'<figure class="results"><figcaption>Benchmark results</figcaption><div class="tbl"><table><thead><tr>{hd}</tr></thead><tbody>{rows}</tbody></table></div></figure>'
    body = ""
    for h, t in p["body"]:
        body += (f"<h3>{e(h)}</h3>" if h else "") + f"<p>{e(t)}</p>"
    if p.get("code"):
        body += f'<figure class="code"><figcaption>Google Earth Engine: water mask and turbidity</figcaption><pre tabindex="0"><code>{e(p["code"])}</code></pre></figure>'
    rel = ""
    for r in p.get("related", []):
        other = next(x for x in PROJECTS if x["slug"] == r)
        rel += f'<p class="related">Related tool: <a href="/work/{r}/">{e(other["title"])}</a></p>'
    hl = "".join(f"<li>{e(x)}</li>" for x in p["highlights"])
    group_label = dict((k, l) for k, l, _ in GROUPS)[p["group"]]
    if software:
        visual = f'<div class="viz-wrap">{bench(compact=True) if slug == "vectorized-timeseries-scaling" else VIZ[slug]()}</div>'
        actions = f'<div class="p-actions"><a class="btn btn-primary" href="{SITE["github"]}/{p["repo"]}">View the code {ICON_OUT}</a></div>'
    else:
        visual = f'<figure>{img_tag(slug, p["cover_alt"], sizes="(max-width: 1200px) 100vw, 1200px", eager=True)}</figure>'
        actions = ""
    if software:
        c = CASES[slug]
        metrics_band = '<dl class="metrics-band">' + "".join(f'<div><dt>{e(lab)}</dt><dd{count_attr(val)}>{e(val)}</dd></div>' for val, lab in c["metrics"]) + "</dl>"
        steps = ""
        for n, st in enumerate(c["approach"], 1):
            code = ""
            if st.get("before"):
                code = diff_block(st["file"], st["before"], st["after"])
            elif st.get("code"):
                code = code_block(st["file"], st["code"])
            steps += f"""<li class="step"><p class="step-n">{n:02d}</p><div><h3>{e(st['title'])}</h3><p>{e(st['text'])}</p>{code}</div></li>"""
        toc = "".join(f'<li><a href="#{a}">{t}</a></li>' for a, t in [("problem", "Problem"), ("approach", "Approach"), ("results", "Results"), ("role", "My role")])
        main_body = f"""<div class="container case">
    <nav class="case-toc" aria-label="On this page"><p>On this page</p><ol>{toc}</ol></nav>
    <div class="case-main">
      <section id="problem" class="case-sec"><h2>Problem</h2>{''.join(f'<p>{e(x)}</p>' for x in c['problem'])}</section>
      <section id="approach" class="case-sec"><h2>Approach</h2><ol class="steps">{steps}</ol></section>
      <section id="results" class="case-sec"><h2>Results</h2>{''.join(f'<p>{e(x)}</p>' for x in c['results'])}{results}</section>
      <section id="role" class="case-sec"><h2>My role</h2><p>{e(c['role'])}</p></section>
    </div>
  </div>"""
    else:
        metrics_band = ""
        main_body = f"""<div class="container p-body">
    <aside class="p-high"><h2>Highlights</h2><ul>{hl}</ul>{rel}</aside>
    <div class="prose">{body}{results}</div>
  </div>"""
    page = head(f"{p['title']} | Ray Shi", p["summary"], f"/work/{slug}/", f"/assets/og/{slug}.jpg")
    page += f"""
<body class="project">
{nav("Work")}
<main id="main">
<article>
  <header class="container p-head">
    <p class="crumb"><a href="/#work">Work</a><span aria-hidden="true">/</span>{e(group_label)}</p>
    <h1 class="p-title">{e(p['title'])}</h1>
    <p class="p-sum">{e(p['summary'])}</p>
    {facts_block(p['facts'])}
    {actions}
    {metrics_band}
    <div class="p-visual">{visual}</div>
  </header>
  {main_body}
  {gallery_section}
  <nav class="container p-next" aria-label="More projects">
    <a class="prev" href="/work/{prv['slug']}/"><span>Previous</span><strong>{e(prv['title'])}</strong></a>
    <a class="next" href="/work/{nxt['slug']}/"><span>Next</span><strong>{e(nxt['title'])}</strong></a>
  </nav>
</article>
</main>
<dialog class="viewer" aria-label="Image viewer">
  <img alt="">
  <div class="viewer-bar">
    <button type="button" data-act="prev">Previous</button>
    <span class="viewer-count" aria-live="polite"></span>
    <button type="button" data-act="next">Next</button>
    <button type="button" data-act="close">Close</button>
  </div>
</dialog>
{contact_block()}
{footer()}
<script src="/assets/site.js?v={VERSION}" defer></script>
<script src="/assets/viewer.js?v={VERSION}" defer></script>
</body></html>"""
    d = ROOT / "work" / slug
    d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(page)


def cv_page():
    def block(items):
        return "".join(f"""<li><div class="cv-row"><h3>{e(x['role'])}</h3><p class="cv-years">{e(x['years'])}</p></div><p class="cv-org">{e(x['org'])}</p><p class="cv-text">{e(x['text'])}</p></li>""" for x in items)
    projects = "".join(f"""<li><div class="cv-row"><h3><a href="/work/{p['slug']}/">{e(p['title'])}</a></h3><p class="cv-years">{e(dict(p['facts']).get('Location', 'GitHub'))}</p></div><p class="cv-text">{e(p['summary'])}</p></li>""" for p in PROJECTS)
    tk = "".join(f"<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>" for k, v in TOOLKIT)
    page = head("CV | Ray Shi", f"Curriculum vitae of Ray Shi, {SITE['role']}.", "/cv/", "/assets/og/home.jpg")
    page += f"""
<body class="cvpage">
{nav("CV")}
<main id="main" class="container cv">
  <header class="cv-head">
    <div>
      <h1 class="cv-name">Ray (Chun-Rui) Shi</h1>
      <p class="cv-role">{e(SITE['role'])}</p>
    </div>
    <ul class="cv-contact">
      <li><a href="mailto:{SITE['email']}">{SITE['email']}</a></li>
      <li><a href="{SITE['linkedin']}">linkedin.com/in/ray-shi-b633302a8</a></li>
      <li><a href="{SITE['github']}">github.com/Ray-Shi-Dev</a></li>
      <li><a href="{SITE['url']}">ray-shi-dev.github.io</a></li>
    </ul>
    <button class="btn cv-print" type="button" onclick="window.print()">{ICON_DOWN} Print or save as PDF</button>
  </header>
  <section class="cv-sec"><h2>Experience</h2><ol>{block(EXPERIENCE)}</ol></section>
  <section class="cv-sec"><h2>Education</h2><ol>{block(EDUCATION)}</ol></section>
  <section class="cv-sec cv-projects"><h2>Selected projects</h2><ol>{projects}</ol></section>
  <section class="cv-sec"><h2>Toolkit</h2><dl class="cv-tk">{tk}</dl></section>
  <section class="cv-sec cv-two">
    <div><h2>Certificates and membership</h2><ul class="pairs">{pairs(CREDENTIALS)}</ul></div>
    <div><h2>Service</h2><ul class="pairs">{pairs(SERVICE)}</ul></div>
  </section>
</main>
{footer()}
<script src="/assets/site.js?v={VERSION}" defer></script>
</body></html>"""
    d = ROOT / "cv"
    d.mkdir(exist_ok=True)
    (d / "index.html").write_text(page)


def extras():
    urls = [("/", BUILD_DATE), ("/cv/", BUILD_DATE)] + [(f"/work/{p['slug']}/", BUILD_DATE) for p in PROJECTS]
    if LIVE_POSTS:
        urls += [("/writing/", LIVE_POSTS[0]["date"])] + [(f"/writing/{p['slug']}/", p.get("updated", p["date"])) for p in LIVE_POSTS if not p.get("draft")]
    sm = "".join(f"<url><loc>{SITE['url']}{u}</loc><lastmod>{d}</lastmod></url>" for u, d in urls)
    (ROOT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{sm}</urlset>')
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE['url']}/sitemap.xml\n")
    page = head("Page not found | Ray Shi", "This page doesn't exist.", "/404.html", "/assets/og/home.jpg")
    page += f"""<body class="project">{nav()}<main id="main" class="container nf"><h1 class="p-title">This page doesn't exist</h1><p class="p-sum">The link may be out of date. Go to the <a href="/">home page</a> or see <a href="/#work">selected work</a>.</p></main>{footer()}</body></html>"""
    (ROOT / "404.html").write_text(page)
    (ROOT / ".nojekyll").write_text("")


# ---- writing ------------------------------------------------------------------------------
def inline(t):
    """Escape, then allow `code` spans and [label](url) links."""
    t = e(t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    return re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+|/[^)\s]*)\)", r'<a href="\2">\1</a>', t)


def fmt_date(d):
    import datetime
    return datetime.date.fromisoformat(d).strftime("%-d %B %Y")


def read_min(p):
    words = 0
    for blk in p["body"]:
        for x in blk[1:]:
            if isinstance(x, str): words += len(x.split())
            elif isinstance(x, list): words += sum(len(str(y).split()) for y in x)
    return max(1, round(words / 230))


def post_body(p):
    out, toc = "", []
    for blk in p["body"]:
        k = blk[0]
        if k == "p": out += f"<p>{inline(blk[1])}</p>"
        elif k == "h2":
            hid = re.sub(r"[^a-z0-9]+", "-", blk[1].lower()).strip("-")
            toc.append((hid, blk[1])); out += f'<h2 id="{hid}">{e(blk[1])}</h2>'
        elif k == "ul": out += "<ul>" + "".join(f"<li>{inline(x)}</li>" for x in blk[1]) + "</ul>"
        elif k == "diff": out += diff_block(blk[1], blk[2], blk[3])
        elif k == "code": out += code_block(blk[1], blk[2])
        elif k == "bench": out += f'<div class="viz-wrap">{bench(compact=True)}</div>'
        elif k == "note": out += f'<p class="post-note">{inline(blk[1])}</p>'
        elif k == "table":
            hd = "".join(f'<th scope="col">{e(x)}</th>' for x in blk[1])
            rows = "".join("<tr>" + f'<th scope="row">{e(r[0])}</th>' + "".join(f"<td>{e(c)}</td>" for c in r[1:]) + "</tr>" for r in blk[2])
            out += f'<figure class="results"><figcaption>{e(blk[3])}</figcaption><div class="tbl"><table><thead><tr>{hd}</tr></thead><tbody>{rows}</tbody></table></div></figure>'
    return out, toc


def post_ld(p):
    url = f"{SITE['url']}/writing/{p['slug']}/"
    data = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["title"], "description": p["dek"],
            "datePublished": p["date"], "dateModified": p.get("updated", p["date"]), "url": url, "mainEntityOfPage": url,
            "author": {"@type": "Person", "@id": PERSON_ID, "name": "Ray Shi", "url": SITE["url"] + "/"},
            "keywords": ", ".join(p["tags"]), "image": SITE["url"] + f"/assets/og/{p.get('project', 'home')}.jpg"}
    return f'<script type="application/ld+json">{json.dumps(data)}</script>\n'


def post_page(p):
    body, toc = post_body(p)
    proj = next((x for x in PROJECTS if x["slug"] == p.get("project")), None)
    og = f"/assets/og/{proj['slug']}.jpg" if proj else "/assets/og/home.jpg"
    extra = post_ld(p) + '<meta property="article:published_time" content="' + p["date"] + '">\n' + ('<meta name="robots" content="noindex">\n' if p.get("draft") else "")
    page = head(f"{p['title']} | Ray Shi", p["dek"], f"/writing/{p['slug']}/", og, extra)
    toc_html = "".join(f'<li><a href="#{a}">{e(t)}</a></li>' for a, t in toc)
    related = f'<p class="post-rel">Project: <a href="/work/{proj["slug"]}/">{e(proj["title"])}</a></p>' if proj else ""
    page += f"""
<body class="project post">
{nav("Writing")}
<main id="main">
<article>
  <header class="container p-head">
    <p class="crumb"><a href="/writing/">Writing</a><span aria-hidden="true">/</span><time datetime="{p['date']}">{fmt_date(p['date'])}</time><span aria-hidden="true">/</span>{read_min(p)} min read</p>
    <h1 class="p-title">{e(p['title'])}</h1>
    <p class="p-sum">{e(p['dek'])}</p>
    {stack(", ".join(p['tags']))}
  </header>
  <div class="container case">
    <nav class="case-toc" aria-label="On this page"><p>On this page</p><ol>{toc_html}</ol></nav>
    <div class="case-main post-body">{body}{related}</div>
  </div>
</article>
</main>
{contact_block()}
{footer()}
<script src="/assets/site.js?v={VERSION}" defer></script>
</body></html>"""
    d = ROOT / "writing" / p["slug"]
    d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(page)


def post_card(p, n):
    return f"""<li class="wr"><a href="/writing/{p['slug']}/">
  <p class="wr-meta"><span class="idx"><b>{n:02d}</b></span><time datetime="{p['date']}">{fmt_date(p['date'])}</time><span>{read_min(p)} min</span></p>
  <h3>{e(p['title'])}</h3><p class="wr-dek">{e(p['dek'])}</p><span class="ex-more">Read {ICON_OUT}</span></a></li>"""


def writing_home():
    if not LIVE_POSTS:
        return ""
    items = "".join(post_card(p, i) for i, p in enumerate(LIVE_POSTS[:3], 1))
    return f"""<section class="section container writing" id="writing" aria-labelledby="writing-title">
  {sec_head("01.4", "Writing", "writing-title", "Notes from the work.", "Case studies with the numbers, the code and what I would change.", '<a class="btn sec-link" href="/writing/">All writing</a>')}
  <ol class="wr-list">{items}</ol>
</section>
"""


def writing_index():
    if not LIVE_POSTS:
        return
    items = "".join(post_card(p, i) for i, p in enumerate(LIVE_POSTS, 1))
    page = head("Writing | Ray Shi", "Case studies and notes on data pipelines, machine learning and spatial data by Ray Shi.", "/writing/", "/assets/og/home.jpg")
    page += f"""
<body class="project">
{nav("Writing")}
<main id="main" class="container">
  <header class="p-head"><h1 class="p-title">Writing</h1><p class="p-sum">Case studies and notes from the work: what I built, what it measured, and what I would change. Subscribe with the <a href="/feed.xml">Atom feed</a>.</p></header>
  <ol class="wr-list">{items}</ol>
</main>
{contact_block()}
{footer()}
<script src="/assets/site.js?v={VERSION}" defer></script>
</body></html>"""
    d = ROOT / "writing"
    d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(page)
    for p in LIVE_POSTS:
        post_page(p)
    ents = ""
    for p in LIVE_POSTS:
        url = f"{SITE['url']}/writing/{p['slug']}/"
        ents += f"""<entry><title>{e(p['title'])}</title><link href="{url}"/><id>{url}</id><published>{p['date']}T00:00:00Z</published><updated>{p.get('updated', p['date'])}T00:00:00Z</updated><summary>{e(p['dek'])}</summary></entry>"""
    (ROOT / "feed.xml").write_text(f"""<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Ray Shi, writing</title><link href="{SITE['url']}/writing/"/><link rel="self" href="{SITE['url']}/feed.xml"/><id>{SITE['url']}/writing/</id><updated>{LIVE_POSTS[0].get('updated', LIVE_POSTS[0]['date'])}T00:00:00Z</updated><author><name>Ray Shi</name><uri>{SITE['url']}/</uri></author>{ents}</feed>""")


if __name__ == "__main__":
    home()
    for i, p in enumerate(PROJECTS):
        project_page(i, p)
    cv_page()
    writing_index()
    extras()
    print("built", len(PROJECTS), "projects")
