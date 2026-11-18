"""Static site generator. Run: python3 build.py  -> writes HTML into this folder."""
import json, html
from pathlib import Path
from PIL import Image
from content import (SITE, GROUPS, PROJECTS, REPOS, VENTURES, ABOUT, EXPERIENCE,
                     EDUCATION, TOOLKIT, CREDENTIALS, SERVICE)

ROOT = Path(__file__).parent
IMG = ROOT / "assets" / "img"
e = html.escape
YEAR = 2026
VERSION = "3"  # bump to bust caches when CSS/JS change


def size(path):
    with Image.open(ROOT / path.lstrip("/")) as im:
        return im.size


def sheets(slug):
    return sorted(p.name for p in (IMG / slug).glob("sheet-*-sm.webp"))


def head(title, desc, path, og, extra=""):
    url = SITE["url"] + path
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
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
<meta name="theme-color" content="#EDF0EE">
<meta name="color-scheme" content="light">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/archivo-latin-wdth-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v={VERSION}">
<script>document.documentElement.classList.add('js');setTimeout(function(){{var h=document.querySelector('.hero');h&&h.classList.add('is-ready')}},3000)</script>
{extra}</head>"""


NAV = [("Work", "/#work"), ("Experience", "/#experience"), ("Code", "/#code"), ("About", "/#about"), ("CV", "/cv/")]


def nav(current=""):
    links = "".join(
        f'<a href="{h}"{" aria-current=\"page\"" if t == current else ""}>{t}</a>' for t, h in NAV)
    return f"""<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <a class="nav-name" href="/" aria-label="Ray Shi, home">Ray Shi</a>
  <nav aria-label="Primary">{links}</nav>
</header>"""


def footer():
    return f"""<footer class="foot" id="contact">
  <div class="foot-inner">
    <h2 class="foot-title">Let's talk</h2>
    <p class="foot-lede">Open to conversations about building performance, spatial data science and urban projects.</p>
    <ul class="foot-links">
      <li><a href="mailto:{SITE['email']}">{SITE['email']}</a></li>
      <li><a href="{SITE['linkedin']}" rel="me">LinkedIn</a></li>
      <li><a href="{SITE['github']}" rel="me">GitHub</a></li>
      <li><a href="/cv/">CV</a></li>
    </ul>
    <p class="foot-small"><span>© {YEAR} Ray Shi</span><span>Taiwan</span></p>
  </div>
</footer>"""


def img_tag(slug, alt, cls="", sizes="100vw", eager=False):
    big = f"/assets/img/{slug}/cover.webp"
    sm = f"/assets/img/{slug}/cover-sm.webp"
    w, h = size(big)
    ws, _ = size(sm)
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<img src="{sm}" srcset="{sm} {ws}w, {big} {w}w" sizes="{sizes}" width="{w}" height="{h}" '
            f'alt="{e(alt)}" {load} decoding="async"{f" class={chr(34)}{cls}{chr(34)}" if cls else ""}>')


def facts_block(facts):
    rows = "".join(f"<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>" for k, v in facts)
    return f'<dl class="facts">{rows}</dl>'


def project_row(p):
    loc = dict(p["facts"]).get("Location", "")
    return f"""<li class="row">
  <a class="row-link" href="/work/{p['slug']}/">
    <figure class="row-img">{img_tag(p['slug'], p['cover_alt'], sizes="(max-width: 900px) 100vw, 58vw")}</figure>
    <div class="row-text">
      <h3 class="row-title">{e(p['title'])}</h3>
      <p class="row-sum">{e(p['summary'])}</p>
      <dl class="row-meta"><div><dt>Location</dt><dd>{e(loc)}</dd></div><div><dt>Methods</dt><dd>{e(p['tags'])}</dd></div></dl>
    </div>
  </a>
</li>"""


def timeline(items):
    return "".join(f"""<li class="tl">
  <p class="tl-years">{e(x['years'])}</p>
  <div class="tl-main"><h4>{e(x['role'])}</h4><p class="tl-org">{e(x['org'])}</p></div>
  <p class="tl-text">{e(x['text'])}</p>
</li>""" for x in items)


def pairs(items):
    return "".join(f"<li><span class='a'>{e(a)}</span><span class='b'>{e(b)}</span></li>" for a, b in items)


def jsonld():
    data = {
        "@context": "https://schema.org", "@type": "Person", "name": "Ray Shi",
        "alternateName": "Chun-Rui Shi", "jobTitle": SITE["role"], "url": SITE["url"],
        "email": f"mailto:{SITE['email']}", "image": SITE["url"] + "/assets/img/ray-shi.webp",
        "sameAs": [SITE["linkedin"], SITE["github"]],
        "alumniOf": [{"@type": "CollegeOrUniversity", "name": n} for n in
                     ["The University of Manchester", "National Cheng Kung University", "National University of Kaohsiung"]],
        "knowsAbout": ["Building energy simulation", "Building physics", "Data science", "GIS", "Urban design", "Urban heat island mitigation"],
    }
    return f'<script type="application/ld+json">{json.dumps(data)}</script>\n'


def home():
    groups_html = ""
    for key, label, lede in GROUPS:
        rows = "".join(project_row(p) for p in PROJECTS if p["group"] == key)
        groups_html += f"""<section class="group" aria-labelledby="g-{key}">
  <header class="group-head"><h3 id="g-{key}" class="group-title">{e(label)}</h3><p>{e(lede)}</p></header>
  <ul class="rows">{rows}</ul>
</section>"""

    repos = "".join(f"""<li class="repo"><a href="{SITE['github']}/{r['slug']}">
  <h3 class="repo-title">{e(r['title'])}</h3><p>{e(r['text'])}</p><p class="repo-meta"><span>{e(r['slug'])}</span><span>{e(r['lang'])}</span></p></a></li>""" for r in REPOS)

    if VENTURES:
        vitems = "".join(f"""<li class="venture"><a href="{e(v['url'])}"><h3>{e(v['name'])}</h3><p>{e(v['text'])}</p><p class="repo-meta"><span>{e(v.get('status', ''))}</span></p></a></li>""" for v in VENTURES)
        ventures = f'<ul class="ventures">{vitems}</ul>'
    else:
        ventures = '<p class="ventures-empty">Products I\'m building on my own will be listed here as they launch.</p>'

    now = "".join(f"<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>" for k, v in SITE["now"])
    bio = "".join(f"<p>{e(x)}</p>" for x in ABOUT["bio"])
    toolkit = "".join(f"<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>" for k, v in TOOLKIT)
    page = head("Ray Shi: building physics, data science and urban design", SITE["description"], "/", "/assets/og/home.jpg", jsonld())
    page += f"""
<body class="home">
{nav()}
<main id="main">
<section class="hero" aria-label="Introduction">
  <canvas class="field" aria-hidden="true"></canvas>
  <div class="hero-inner">
    <h1 class="hero-name"><span class="ln"><span>Ray</span></span><span class="ln"><span>Shi</span></span></h1>
    <p class="hero-intro">{e(SITE['intro'])}</p>
    <dl class="titleblock">{now}<div><dt>Contact</dt><dd><a href="mailto:{SITE['email']}">Email</a>, <a href="{SITE['linkedin']}">LinkedIn</a>, <a href="{SITE['github']}">GitHub</a></dd></div></dl>
    <div class="legend" aria-hidden="true"><span>Cooler</span><i></i><span>Warmer</span><em>Isotherms drift with time; your cursor adds heat.</em></div>
  </div>
</section>

<section class="section" id="work" aria-labelledby="work-title">
  <h2 id="work-title" class="section-title">Selected work</h2>
  {groups_html}
</section>

<section class="section" id="experience" aria-labelledby="exp-title">
  <h2 id="exp-title" class="section-title">Experience</h2>
  <div class="record">
    <h3 class="record-title">Work</h3>
    <ol class="timeline">{timeline(EXPERIENCE)}</ol>
    <h3 class="record-title">Education</h3>
    <ol class="timeline">{timeline(EDUCATION)}</ol>
    <h3 class="record-title">Toolkit</h3>
    <dl class="toolkit">{toolkit}</dl>
  </div>
  <p class="record-cv"><a class="btn" href="/cv/">View the full CV</a></p>
</section>

<section class="section" id="code" aria-labelledby="code-title">
  <h2 id="code-title" class="section-title">Code</h2>
  <p class="section-lede">Open-source tools and experiments on GitHub.</p>
  <ul class="repos">{repos}</ul>
</section>

<section class="section section--slim" id="ventures" aria-labelledby="ventures-title">
  <h2 id="ventures-title" class="section-title">Ventures</h2>
  {ventures}
</section>

<section class="section about" id="about" aria-labelledby="about-title">
  <h2 id="about-title" class="section-title">About</h2>
  <div class="about-grid">
    <div class="about-bio">
      <img class="portrait" src="/assets/img/ray-shi.webp" alt="Portrait of Ray Shi" width="600" height="600" loading="lazy">
      {bio}
    </div>
    <div class="about-lists">
      <h3>Certificates and membership</h3><ul class="pairs">{pairs(CREDENTIALS)}</ul>
      <h3>Service</h3><ul class="pairs">{pairs(SERVICE)}</ul>
    </div>
  </div>
</section>
</main>
{footer()}
<script src="/assets/site.js?v={VERSION}" defer></script>
<script src="/assets/field.js?v={VERSION}" defer></script>
</body></html>"""
    (ROOT / "index.html").write_text(page)


def project_page(i, p):
    slug = p["slug"]
    nxt = PROJECTS[(i + 1) % len(PROJECTS)]
    prv = PROJECTS[i - 1]
    sh = sheets(slug)
    gallery = "".join(
        f"""<li><button class="sheet" type="button" data-full="/assets/img/{slug}/{s.replace('-sm', '')}" aria-label="Open sheet {n} of {len(sh)} full size"><img src="/assets/img/{slug}/{s}" alt="Portfolio sheet {n} of {len(sh)} for {e(p['title'])}" loading="lazy" decoding="async" width="900" height="650"></button></li>"""
        for n, s in enumerate(sh, 1))
    body = ""
    for h, t in p["body"]:
        body += (f"<h3>{e(h)}</h3>" if h else "") + f"<p>{e(t)}</p>"
    if p.get("code"):
        body += f'<figure class="code"><figcaption>Google Earth Engine: water mask and turbidity</figcaption><pre tabindex="0"><code>{e(p["code"])}</code></pre></figure>'
    rel = ""
    for r in p.get("related", []):
        repo = next(x for x in REPOS if x["slug"] == r)
        rel += f'<p class="related">Related code: <a href="{SITE["github"]}/{r}">{e(repo["title"])}</a></p>'
    hl = "".join(f"<li>{e(x)}</li>" for x in p["highlights"])
    group_label = dict((k, l) for k, l, _ in GROUPS)[p["group"]]
    page = head(f"{p['title']} | Ray Shi", p["summary"], f"/work/{slug}/", f"/assets/og/{slug}.jpg")
    page += f"""
<body class="project">
{nav("Work")}
<main id="main">
<article>
  <header class="p-head">
    <p class="crumb"><a href="/#work">Selected work</a> <span aria-hidden="true">/</span> {e(group_label)}</p>
    <h1 class="p-title">{e(p['title'])}</h1>
    <p class="p-sum">{e(p['summary'])}</p>
    {facts_block(p['facts'])}
  </header>
  <figure class="p-cover">{img_tag(slug, p['cover_alt'], sizes="(max-width: 1440px) 100vw, 1440px", eager=True)}</figure>
  <div class="p-body">
    <aside class="p-high"><h2>Highlights</h2><ul>{hl}</ul>{rel}</aside>
    <div class="prose">{body}</div>
  </div>
  <section class="p-sheets" aria-labelledby="sheets-title">
    <div class="p-sheets-head"><h2 id="sheets-title">Portfolio sheets</h2><p>{len(sh)} original presentation boards. Select one to view it full size.</p></div>
    <ul class="sheets">{gallery}</ul>
  </section>
  <nav class="p-next" aria-label="More projects">
    <a class="prev" href="/work/{prv['slug']}/"><span>Previous project</span><strong>{e(prv['title'])}</strong></a>
    <a class="next" href="/work/{nxt['slug']}/"><span>Next project</span><strong>{e(nxt['title'])}</strong></a>
  </nav>
</article>
</main>
<dialog class="viewer" aria-label="Sheet viewer">
  <img alt="">
  <div class="viewer-bar">
    <button type="button" data-act="prev">Previous</button>
    <span class="viewer-count" aria-live="polite"></span>
    <button type="button" data-act="next">Next</button>
    <button type="button" data-act="close">Close</button>
  </div>
</dialog>
{footer()}
<script src="/assets/site.js?v={VERSION}" defer></script>
<script src="/assets/viewer.js?v={VERSION}" defer></script>
</body></html>"""
    d = ROOT / "work" / slug
    d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(page)


def cv_page():
    def block(items):
        return "".join(f"""<li><div class="cv-row"><h3>{e(x['role'])}</h3><p class="cv-years">{e(x['years'])}</p></div><p class="cv-org">{e(x['org'])}</p><p>{e(x['text'])}</p></li>""" for x in items)
    projects = "".join(f"""<li><div class="cv-row"><h3><a href="/work/{p['slug']}/">{e(p['title'])}</a></h3><p class="cv-years">{e(dict(p['facts']).get('Location', ''))}</p></div><p>{e(p['summary'])}</p></li>""" for p in PROJECTS)
    tk = "".join(f"<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>" for k, v in TOOLKIT)
    page = head("CV | Ray Shi", f"Curriculum vitae of Ray Shi, {SITE['role']}.", "/cv/", "/assets/og/home.jpg")
    page += f"""
<body class="cvpage">
{nav("CV")}
<main id="main" class="cv">
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
    <button class="btn cv-print" type="button" onclick="window.print()">Print or save as PDF</button>
  </header>
  <section class="cv-sec"><h2>Experience</h2><ol>{block(EXPERIENCE)}</ol></section>
  <section class="cv-sec"><h2>Education</h2><ol>{block(EDUCATION)}</ol></section>
  <section class="cv-sec cv-projects"><h2>Selected projects</h2><ol>{projects}</ol></section>
  <section class="cv-sec"><h2>Toolkit</h2><dl class="toolkit">{tk}</dl></section>
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
    page += f"""<body class="project">{nav()}<main id="main" class="nf"><h1 class="p-title">This page doesn't exist</h1><p class="p-sum">The link may be out of date. Go to the <a href="/">home page</a> or see <a href="/#work">selected work</a>.</p></main>{footer()}</body></html>"""
    (ROOT / "404.html").write_text(page)
    (ROOT / ".nojekyll").write_text("")


if __name__ == "__main__":
    home()
    for i, p in enumerate(PROJECTS):
        project_page(i, p)
    cv_page()
    extras()
    print("built", len(PROJECTS), "projects")
