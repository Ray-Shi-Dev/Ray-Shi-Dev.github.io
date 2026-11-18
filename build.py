"""Static site generator. Run: python3 build.py  -> writes HTML into this folder."""
import json, os, html
from pathlib import Path
from content import SITE, GROUPS, PROJECTS, REPOS, VENTURES, ABOUT

ROOT = Path(__file__).parent
IMG = ROOT / "assets" / "img"
e = html.escape
YEAR = 2026


def sheets(slug):
    return sorted(p.name for p in (IMG / slug).glob("sheet-*-sm.webp"))


def head(title, desc, path, og_image):
    url = SITE["url"] + path
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE['url']}{og_image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#EDF0EE">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/archivo-latin-wdth-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
</head>"""


def nav(current=""):
    items = [("Work", "/#work"), ("Code", "/#code"), ("About", "/#about"), ("Contact", "/#contact")]
    links = "".join(f'<a href="{h}">{t}</a>' for t, h in items)
    return f"""<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <a class="nav-name" href="/">Ray Shi</a>
  <nav aria-label="Primary">{links}</nav>
</header>"""


def footer():
    return f"""<footer class="foot" id="contact">
  <div class="foot-inner">
    <h2 class="foot-title">Let's talk</h2>
    <p class="foot-lede">Open to conversations about building performance, spatial data and urban projects.</p>
    <ul class="foot-links">
      <li><a href="mailto:{SITE['email']}">{SITE['email']}</a></li>
      <li><a href="{SITE['linkedin']}" rel="me">LinkedIn</a></li>
      <li><a href="{SITE['github']}" rel="me">GitHub</a></li>
    </ul>
    <p class="foot-small">© {YEAR} Ray Shi</p>
  </div>
</footer>"""


def facts_block(facts, cls="facts"):
    rows = "".join(f"<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>" for k, v in facts)
    return f'<dl class="{cls}">{rows}</dl>'


def project_row(p):
    loc = dict(p["facts"]).get("Location", "")
    return f"""<li class="row">
  <a class="row-link" href="/work/{p['slug']}/">
    <figure class="row-img"><img src="/assets/img/{p['slug']}/cover-sm.webp" alt="{e(p['cover_alt'])}" loading="lazy" decoding="async"></figure>
    <div class="row-text">
      <h3 class="row-title">{e(p['title'])}</h3>
      <p class="row-sum">{e(p['summary'])}</p>
      <p class="row-loc">{e(loc)}</p>
    </div>
  </a>
</li>"""


def home():
    groups_html = ""
    for key, label, lede in GROUPS:
        rows = "".join(project_row(p) for p in PROJECTS if p["group"] == key)
        groups_html += f"""<section class="group" aria-labelledby="g-{key}">
  <header class="group-head"><h3 id="g-{key}" class="group-title">{e(label)}</h3><p>{e(lede)}</p></header>
  <ul class="rows">{rows}</ul>
</section>"""

    repos = "".join(f"""<li class="repo"><a href="{SITE['github']}/{r['slug']}">
  <h3 class="repo-title">{e(r['title'])}</h3><p>{e(r['text'])}</p><p class="repo-meta">{e(r['slug'])}<span>{e(r['lang'])}</span></p></a></li>""" for r in REPOS)

    if VENTURES:
        vitems = "".join(f"""<li class="venture"><a href="{e(v['url'])}"><h3>{e(v['name'])}</h3><p>{e(v['text'])}</p><p class="repo-meta">{e(v.get('status',''))}</p></a></li>""" for v in VENTURES)
        ventures = f'<ul class="ventures">{vitems}</ul>'
    else:
        ventures = '<p class="ventures-empty">Products I\'m building on my own will be listed here as they launch.</p>'

    def pairs(items):
        return "".join(f"<li><span class='a'>{e(a)}</span><span class='b'>{e(b)}</span></li>" for a, b in items)

    now = "".join(f"<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>" for k, v in SITE["now"])
    bio = "".join(f"<p>{e(x)}</p>" for x in ABOUT["bio"])
    page = head("Ray Shi: data, simulation and urban design", SITE["description"], "/", "/assets/img/arup-energy-climate-modelling/cover-sm.webp")
    page += f"""
<body class="home">
{nav()}
<main id="main">
<section class="hero" aria-label="Introduction">
  <canvas class="field" aria-hidden="true"></canvas>
  <div class="hero-inner">
    <h1 class="hero-name"><span>Ray</span><span>Shi</span></h1>
    <p class="hero-intro">{e(SITE['intro'])}</p>
    <dl class="titleblock">{now}<div><dt>Contact</dt><dd><a href="mailto:{SITE['email']}">Email</a>, <a href="{SITE['linkedin']}">LinkedIn</a>, <a href="{SITE['github']}">GitHub</a></dd></div></dl>
    <div class="legend" aria-hidden="true"><span>Cooler</span><i></i><span>Warmer</span><em>Isotherms drift with time; your cursor adds heat.</em></div>
  </div>
</section>

<section class="section" id="work" aria-labelledby="work-title">
  <h2 id="work-title" class="section-title">Selected work</h2>
  {groups_html}
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
      <img class="portrait" src="/assets/img/ray-shi.webp" alt="Portrait of Ray Shi" width="300" height="300" loading="lazy">
      {bio}
    </div>
    <div class="about-lists">
      <h3>Experience</h3><ul class="pairs">{pairs(ABOUT['experience'])}</ul>
      <h3>Education</h3><ul class="pairs">{pairs(ABOUT['education'])}</ul>
      <h3>Recognition and credentials</h3><ul class="pairs">{pairs(ABOUT['recognition'])}</ul>
    </div>
  </div>
</section>
</main>
{footer()}
<script src="/assets/field.js" defer></script>
</body></html>"""
    (ROOT / "index.html").write_text(page)


def project_page(i, p):
    slug = p["slug"]
    nxt = PROJECTS[(i + 1) % len(PROJECTS)]
    sh = sheets(slug)
    gallery = "".join(
        f"""<li><button class="sheet" type="button" data-full="/assets/img/{slug}/{s.replace('-sm', '')}" aria-label="Open sheet {n} of {len(sh)}"><img src="/assets/img/{slug}/{s}" alt="Portfolio sheet {n} of {len(sh)} for {e(p['title'])}" loading="lazy" decoding="async" width="900" height="650"></button></li>"""
        for n, s in enumerate(sh, 1))
    body = ""
    for h, t in p["body"]:
        body += (f"<h3>{e(h)}</h3>" if h else "") + f"<p>{e(t)}</p>"
    if p.get("code"):
        body += f'<figure class="code"><figcaption>Google Earth Engine, water mask and turbidity</figcaption><pre><code>{e(p["code"])}</code></pre></figure>'
    rel = ""
    for r in p.get("related", []):
        repo = next(x for x in REPOS if x["slug"] == r)
        rel += f'<p class="related">Related code: <a href="{SITE["github"]}/{r}">{e(repo["title"])}</a></p>'
    hl = "".join(f"<li>{e(x)}</li>" for x in p["highlights"])
    group_label = dict((k, l) for k, l, _ in GROUPS)[p["group"]]
    page = head(f"{p['title']} | Ray Shi", p["summary"], f"/work/{slug}/", f"/assets/img/{slug}/cover-sm.webp")
    page += f"""
<body class="project">
{nav()}
<main id="main">
<article>
  <header class="p-head">
    <p class="crumb"><a href="/#work">Selected work</a> / {e(group_label)}</p>
    <h1 class="p-title">{e(p['title'])}</h1>
    <p class="p-sum">{e(p['summary'])}</p>
    {facts_block(p['facts'])}
  </header>
  <figure class="p-cover"><img src="/assets/img/{slug}/cover.webp" alt="{e(p['cover_alt'])}" decoding="async"></figure>
  <div class="p-body">
    <aside class="p-high"><h2>Highlights</h2><ul>{hl}</ul>{rel}</aside>
    <div class="prose">{body}</div>
  </div>
  <section class="p-sheets" aria-labelledby="sheets-title">
    <h2 id="sheets-title">Portfolio sheets</h2>
    <p class="section-lede">The original presentation boards. Select one to view it full size.</p>
    <ul class="sheets">{gallery}</ul>
  </section>
  <nav class="p-next" aria-label="Next project"><a href="/work/{nxt['slug']}/"><span>Next project</span><strong>{e(nxt['title'])}</strong></a></nav>
</article>
</main>
<dialog class="viewer" aria-label="Sheet viewer">
  <img alt="">
  <div class="viewer-bar">
    <button type="button" data-act="prev">Previous</button>
    <span class="viewer-count"></span>
    <button type="button" data-act="next">Next</button>
    <button type="button" data-act="close">Close</button>
  </div>
</dialog>
{footer()}
<script src="/assets/viewer.js" defer></script>
</body></html>"""
    d = ROOT / "work" / slug
    d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(page)


def extras():
    urls = ["/"] + [f"/work/{p['slug']}/" for p in PROJECTS]
    sm = "".join(f"<url><loc>{SITE['url']}{u}</loc></url>" for u in urls)
    (ROOT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{sm}</urlset>')
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE['url']}/sitemap.xml\n")
    page = head("Page not found | Ray Shi", "This page doesn't exist.", "/404.html", "/assets/img/arup-energy-climate-modelling/cover-sm.webp")
    page += f"""<body class="project">{nav()}<main id="main" class="nf"><h1 class="p-title">This page doesn't exist</h1><p class="p-sum">The link may be out of date. <a href="/">Go to the home page</a> or see <a href="/#work">selected work</a>.</p></main>{footer()}</body></html>"""
    (ROOT / "404.html").write_text(page)
    (ROOT / ".nojekyll").write_text("")


if __name__ == "__main__":
    home()
    for i, p in enumerate(PROJECTS):
        project_page(i, p)
    extras()
    print("built", len(PROJECTS), "projects")
