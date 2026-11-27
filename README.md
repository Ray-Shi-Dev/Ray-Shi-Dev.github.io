# ray-shi-dev.github.io

Personal portfolio of Ray Shi, served by GitHub Pages at https://ray-shi-dev.github.io.

## How it works

- `content.py` holds every word on the site: intro, projects, code repos, ventures, about.
- `build.py` turns that content into static HTML (`index.html`, `work/<slug>/index.html`, `404.html`, `sitemap.xml`).
- `assets/` holds the stylesheet, scripts, self-hosted Archivo font and images.

## Update the site

1. Edit `content.py`.
2. Run `python3 build.py`.
3. Commit and push. GitHub Pages republishes in about a minute.

### Add a venture

Append to `VENTURES` in `content.py`:

```python
{"name": "Product name", "text": "One sentence on what it does.", "url": "https://...", "status": "Live"}
```

### Add a project

Add a dict to `PROJECTS` (copy an existing one), and put its images in
`assets/img/<slug>/`: `cover.webp`, `cover-sm.webp`, and `sheet-01.webp` + `sheet-01-sm.webp` for each board.

## Writing

Posts live in `posts.py` as lists of blocks (paragraphs, headings, lists, code diffs, tables, the benchmark chart).
A post with `"draft": True` is never published. To preview drafts without touching the live site:

```
cp -r . /tmp/preview && SITE_OUT=/tmp/preview python3 build.py --drafts
```

Setting `"draft": False` and running `python3 build.py` publishes it: the Writing page, a Writing section on the home page,
the nav link, `feed.xml` and sitemap entries all appear automatically once at least one post is published.

## Search and analytics

- `SITE["google_site_verification"]` in `content.py`: the content value from Google Search Console's HTML-tag method (URL-prefix property).
- `SITE["goatcounter"]`: your GoatCounter site code. When set, page views are counted and email, CV and outbound clicks are recorded as events.

## Tools: EnergyPlus pre-review (`/tools/eplus-prereview/`)

A browser version of [eplus-prereview](https://github.com/Ray-Shi-Dev/eplus-prereview). The page, its
`app.js`, `worker.js` and `tool.css` live in `tools/eplus-prereview/`; `build.py` (`tool_page()`) writes
`index.html`. Python runs in a Web Worker through Pyodide, self-hosted in `assets/pyodide/0.27.7/` (only the
core runtime and the `sqlite3` package, MPL-2.0). Run files are read in the tab and never uploaded; the page's
Content-Security-Policy only allows connections to this site.

To ship a new checker version, keep a checkout of eplus-prereview next to this folder (or set
`PREREVIEW_SRC=/path/to/eplus-prereview/src/prereview`) and run `python3 build.py`: it zips the package into
`tools/eplus-prereview/prereview-<hash>.zip` and records it in `bundle.json`. Without a checkout the committed
bundle is kept.
