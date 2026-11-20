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

## Line studies for simulation work

`tools/linework.py` traces the line studies shown on the home page wall (`assets/img/<slug>/line.webp`) from each project's `cover.webp`. Run `python3 tools/linework.py` after replacing a cover; it needs `opencv-python`, `scikit-image` and `numpy`.
