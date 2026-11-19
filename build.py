"""Static site generator. Run: python3 build.py  -> writes HTML into this folder."""
import json, html
from pathlib import Path
from PIL import Image
from content import (SITE, GROUPS, PROJECTS, VENTURES, ABOUT, EXPERIENCE,
                     EDUCATION, TOOLKIT, CREDENTIALS, SERVICE)
from viz import VIZ, bench
from cases import CASES
from pygments import highlight
from pygments.lexers import PythonLexer
from pygments.formatters import HtmlFormatter

ROOT = Path(__file__).parent
IMG = ROOT / "assets" / "img"
e = html.escape
YEAR = 2026
VERSION = "7"

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
<meta name="theme-color" content="#0D1218">
<meta name="color-scheme" content="dark">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v={VERSION}">
<script>document.documentElement.classList.add('js');setTimeout(function(){{var h=document.querySelector('.hero');h&&h.classList.add('is-ready')}},3000)</script>
{extra}</head>"""


NAV = [("Work", "/#work"), ("Experience", "/#experience"), ("About", "/#about"), ("CV", "/cv/")]


def nav(current="", clear=False):
    links = "".join(
        f'<a href="{h}"{" aria-current=\"page\"" if t == current else ""}>{t}</a>' for t, h in NAV)
    return f"""<a class="skip" href="#main">Skip to content</a>
<header class="nav{' nav--clear' if clear else ''}">
  <div class="container nav-inner">
    <a class="brand" href="/" aria-label="Ray Shi, home"><span class="brand-mark" aria-hidden="true"></span>Ray Shi</a>
    <nav class="nav-links" aria-label="Primary">{links}<a class="nav-cta" href="mailto:{SITE['email']}">Contact</a></nav>
  </div>
</header>"""


def contact_block():
    return f"""<section class="container contact" id="contact" aria-labelledby="contact-title">
  <div class="contact-card">
    <h2 id="contact-title">Let's work on something with data.</h2>
    <p>Open to conversations about data science, machine learning and software engineering roles.</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="mailto:{SITE['email']}">Email me</a>
      <a class="btn" href="{SITE['linkedin']}" rel="me">LinkedIn {ICON_OUT}</a>
      <a class="btn" href="{SITE['github']}" rel="me">GitHub {ICON_OUT}</a>
    </div>
  </div>
</section>"""


def footer():
    return f"""<footer class="foot">
  <div class="container foot-inner">
    <span>© {YEAR} Ray Shi</span>
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


_FMT = HtmlFormatter(nowrap=True, classprefix="t-")


def hl_lines(code):
    return highlight(code, PythonLexer(), _FMT).rstrip("\n").split("\n")


def code_window(file, inner, label=""):
    return f"""<figure class="code-win">
  <figcaption class="code-bar"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="code-file">{e(file)}</span><span class="code-label">{e(label)}</span></figcaption>
  <pre tabindex="0"><code>{inner}</code></pre>
</figure>"""


def code_block(file, code):
    lines = hl_lines(code)
    inner = "".join(f'<span class="ln"><span class="ln-n" aria-hidden="true">{i}</span>{l or " "}</span>' for i, l in enumerate(lines, 1))
    return code_window(file, inner, "Python")


def diff_block(file, before, after):
    b, a = hl_lines(before), hl_lines(after)
    inner = "".join(f'<span class="ln del"><span class="ln-n" aria-hidden="true">−</span>{l or " "}</span>' for l in b)
    inner += "".join(f'<span class="ln add"><span class="ln-n" aria-hidden="true">+</span>{l or " "}</span>' for l in a)
    return code_window(file, inner, f"−{len(b)} +{len(a)}")


def featured_card(p):
    f = dict(p["facts"])
    c = CASES[p["slug"]]
    step = next(x for x in c["approach"] if x.get("before"))
    metrics = "".join(f'<div class="fm"><dt>{e(lab)}</dt><dd>{e(val)}</dd></div>' for val, lab in c["metrics"])
    return f"""<article class="feature spot">
  <div class="feature-text">
    <p class="bcard-top"><span class="gh">{ICON_CODE}{e(p['repo'])}</span><span>Featured case study</span></p>
    <h3><a class="stretch" href="/work/{p['slug']}/">{e(p['title'])}</a></h3>
    <p class="sum">{e(p['summary'])}</p>
    <dl class="feature-metrics">{metrics}</dl>
    <ul class="chips" aria-label="Stack">{chips(f['Stack'], 6)}</ul>
    <p class="feature-more" aria-hidden="true">Read the case study {ICON_OUT}</p>
  </div>
  <div class="feature-vis">
    {diff_block(step['file'], step['before'], step['after'])}
    <div class="viz-wrap">{bench(compact=True)}</div>
  </div>
</article>"""


def bento_card(p):
    f = dict(p["facts"])
    return f"""<li class="bcard spot"><a href="/work/{p['slug']}/">
  <div class="bcard-top"><span class="gh">{ICON_CODE}{e(p['repo'])}</span><span>{e(f['Type'].split(',')[0])}</span></div>
  <h3>{e(p['title'])}</h3>
  <p class="sum">{e(p['summary'])}</p>
  <div class="viz-wrap">{VIZ[p['slug']]()}</div>
  <ul class="chips" aria-label="Stack">{chips(f['Stack'], 5)}</ul>
</a></li>"""


def image_card(p):
    loc = dict(p["facts"]).get("Location", "")
    return f"""<li class="icard"><a href="/work/{p['slug']}/">
  <figure>{img_tag(p['slug'], p['cover_alt'], sizes="(max-width: 860px) 100vw, 50vw")}</figure>
  <div class="body"><p class="meta">{e(loc)}</p><h3>{e(p['title'])}</h3><p class="sum">{e(p['summary'])}</p>
  <ul class="chips" aria-label="Methods">{chips(p['tags'])}</ul></div>
</a></li>"""


def mini_card(p):
    loc = dict(p["facts"]).get("Location", "")
    return f"""<li class="mcard"><a href="/work/{p['slug']}/">
  <figure>{img_tag(p['slug'], p['cover_alt'], sizes="(max-width: 860px) 50vw, 33vw")}</figure>
  <h4>{e(p['title'])}</h4><p>{e(loc)}</p></a></li>"""


def timeline(items, now_first=False):
    out = ""
    for k, x in enumerate(items):
        tag = '<span class="now-tag">Now</span>' if now_first and k == 0 and "now" in x["years"] else ""
        out += f"""<li class="tl">
  <p class="tl-years">{e(x['years'])}</p>
  <div><h4>{e(x['role'])}{tag}</h4><p class="tl-org">{e(x['org'])}</p></div>
  <p class="tl-text">{e(x['text'])}</p>
</li>"""
    return out


def pairs(items):
    return "".join(f"<li><span class='a'>{e(a)}</span><span class='b'>{e(b)}</span></li>" for a, b in items)


def jsonld():
    data = {
        "@context": "https://schema.org", "@type": "Person", "name": "Ray Shi",
        "alternateName": "Chun-Rui Shi", "jobTitle": SITE["role"], "url": SITE["url"],
        "email": f"mailto:{SITE['email']}", "image": SITE["url"] + "/assets/img/ray-shi-cut.webp",
        "sameAs": [SITE["linkedin"], SITE["github"]],
        "affiliation": {"@type": "CollegeOrUniversity", "name": "National Cheng Kung University"},
        "alumniOf": [{"@type": "CollegeOrUniversity", "name": n} for n in
                     ["The University of Manchester", "National Cheng Kung University", "National University of Kaohsiung"]],
        "knowsAbout": ["Data science", "Machine learning", "Python", "Time-series analysis", "Spatial statistics",
                       "GIS", "Building energy simulation", "Computational geometry"],
    }
    return f'<script type="application/ld+json">{json.dumps(data)}</script>\n'


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

    aff = "".join(f"<li>{e(a)}</li>" for a in SITE["affiliations"])
    bio = "".join(f"<p>{e(x)}</p>" for x in ABOUT["bio"])
    toolkit = "".join(f"""<li class="tk"><h4>{e(k)}</h4><ul class="chips">{chips(v, 20)}</ul></li>""" for k, v in TOOLKIT)

    page = head("Ray Shi: data science and computational engineering", SITE["description"], "/", "/assets/og/home.jpg", jsonld())
    page += f"""
<body class="home">
{nav(clear=True)}
<main id="main">
<section class="hero" aria-label="Introduction">
  <canvas class="gl" aria-hidden="true"></canvas>
  <div class="container hero-inner">
    <p class="status reveal"><span class="dot" aria-hidden="true"></span>{e(SITE['status'])}</p>
    <h1 class="hero-title reveal">Ray Shi</h1>
    <p class="hero-sub reveal">{e(SITE['hero_sub'])}</p>
    <div class="hero-cta reveal">
      <a class="btn btn-primary" href="#work">View work</a>
      <a class="btn" href="{SITE['github']}">GitHub {ICON_OUT}</a>
      <a class="btn" href="/cv/">CV</a>
    </div>
  </div>
  <div class="container hero-foot">
    <div><p class="aff-label">Experience and education</p><ul class="aff">{aff}</ul></div>
    <div class="morph">
      <div class="morph-tabs" role="group" aria-label="Point cloud form">
        <button class="morph-tab" type="button" aria-pressed="true">Buildings</button>
        <button class="morph-tab" type="button" aria-pressed="false">Spatial data</button>
        <button class="morph-tab" type="button" aria-pressed="false">Machine learning</button>
        <span class="morph-track" aria-hidden="true"><span class="morph-progress"></span></span>
      </div>
      <p class="readout" aria-hidden="true"><span class="readout-live">webgl point cloud</span></p>
    </div>
  </div>
</section>

<section class="section container" id="work" aria-labelledby="work-title">
  <header class="sec-head">
    <h2 id="work-title" class="sec-title">{e(g['software'][0])}</h2>
    <p class="sec-lede">{e(g['software'][1])}</p>
    <a class="btn sec-link" href="{SITE['github']}">All repositories {ICON_OUT}</a>
  </header>
  {featured_card(soft[0])}
  <ul class="bento">{''.join(bento_card(p) for p in soft[1:])}</ul>

  <header class="sub-head"><h3 class="sub-title">{e(g['simulation'][0])}</h3><p>{e(g['simulation'][1])}</p></header>
  <ul class="grid2">{''.join(image_card(p) for p in sim)}</ul>

  <header class="sub-head"><h3 class="sub-title">{e(g['design'][0])}</h3><p>{e(g['design'][1])}</p></header>
  <ul class="grid3">{''.join(mini_card(p) for p in des)}</ul>
</section>

<section class="section container" id="experience" aria-labelledby="exp-title">
  <div class="xp">
    <div class="xp-side">
      <h2 id="exp-title" class="sec-title">Experience</h2>
      <p class="sec-lede">From building physics and spatial statistics to computer-science research.</p>
      <a class="btn" href="/cv/">Full CV</a>
    </div>
    <div class="xp-main">
      <div class="xp-group"><h3>Work</h3><ol>{timeline(EXPERIENCE, now_first=True)}</ol></div>
      <div class="xp-group"><h3>Education</h3><ol>{timeline(EDUCATION)}</ol></div>
    </div>
  </div>
  <header class="sub-head"><h3 class="sub-title">Toolkit</h3><p>Languages, libraries and tools I use in practice.</p></header>
  <ul class="toolkit">{toolkit}</ul>
</section>

<section class="section container" id="about" aria-labelledby="about-title">
  <header class="sec-head"><h2 id="about-title" class="sec-title">About</h2></header>
  <div class="about">
    <figure class="portrait-card"><img src="/assets/img/ray-shi-cut.webp" alt="Portrait of Ray Shi" width="820" height="820" loading="lazy" decoding="async"><figcaption>Tainan, Taiwan</figcaption></figure>
    <div class="about-body">{bio}</div>
    <div class="about-side">
      <div><h3>Certificates and membership</h3><ul class="pairs">{pairs(CREDENTIALS)}</ul></div>
      <div><h3>Service</h3><ul class="pairs">{pairs(SERVICE)}</ul></div>
    </div>
  </div>
  <header class="sub-head" id="ventures"><h3 class="sub-title">Ventures</h3><p>Independent products.</p></header>
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
        metrics_band = '<dl class="metrics-band">' + "".join(f'<div><dt>{e(lab)}</dt><dd>{e(val)}</dd></div>' for val, lab in c["metrics"]) + "</dl>"
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
    urls = ["/", "/cv/"] + [f"/work/{p['slug']}/" for p in PROJECTS]
    sm = "".join(f"<url><loc>{SITE['url']}{u}</loc></url>" for u in urls)
    (ROOT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{sm}</urlset>')
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE['url']}/sitemap.xml\n")
    page = head("Page not found | Ray Shi", "This page doesn't exist.", "/404.html", "/assets/og/home.jpg")
    page += f"""<body class="project">{nav()}<main id="main" class="container nf"><h1 class="p-title">This page doesn't exist</h1><p class="p-sum">The link may be out of date. Go to the <a href="/">home page</a> or see <a href="/#work">selected work</a>.</p></main>{footer()}</body></html>"""
    (ROOT / "404.html").write_text(page)
    (ROOT / ".nojekyll").write_text("")


if __name__ == "__main__":
    home()
    for i, p in enumerate(PROJECTS):
        project_page(i, p)
    cv_page()
    extras()
    print("built", len(PROJECTS), "projects")
