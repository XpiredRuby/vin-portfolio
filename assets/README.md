# Assets

| Path | What it is | Regenerate with |
|---|---|---|
| `css/site.css` | The entire design system, tokens, components, print stylesheet | hand-edited |
| `js/site.js` | Nav toggle, scroll reveal, stat counters, UTC clock, TOC scroll-spy | hand-edited |
| `js/github.js` | Live GitHub repository + commit feed (2 unauthenticated API calls, lazy, graceful fallback) | hand-edited |
| `diagrams/*.svg` | Technical block diagrams used across the case studies | `python3 assets/diagrams/generate.py` |
| `diagrams/generate.py` | The single source of truth for every diagram | hand-edited |
| `headshot.jpg` | Portrait, 400×400 | **replace with a professional headshot** |
| `og-image.png` | 1200×630 social preview card | render `og-image.src.html` (see below) |
| `og-image.src.html` | Source page for the OG image | hand-edited |
| `resume.pdf` | Generated from `resume.html` via the print stylesheet | see below |

## Regenerating the resume PDF

```bash
python3 -m http.server 8000 &
chromium --headless --no-pdf-header-footer \
  --print-to-pdf=assets/resume.pdf http://localhost:8000/resume.html
```

The print stylesheet in `css/site.css` strips navigation and footers, converts to black on white,
forces reveal-animated content visible, and tightens spacing to three pages.

## Regenerating the OG image

```bash
chromium --headless --window-size=1200,712 --hide-scrollbars \
  --screenshot=/tmp/og_raw.png assets/og-image.src.html
# crop the top 1200×630, headless reserves ~80px for window chrome
```

## Adding project media

Put figures in `assets/img/` and reference them from the case studies. Replace a
`<div class="slot">…</div>` placeholder with:

```html
<figure class="fig">
  <div class="fig__body">
    <img src="../assets/img/your-figure.png" alt="Descriptive alt text" loading="lazy">
  </div>
  <figcaption><b>Fig. n</b>What this shows and what it demonstrates.</figcaption>
</figure>
```

For video:

```html
<video class="fig" controls preload="metadata" width="880" aria-label="GHOST tracking demo">
  <source src="../assets/img/ghost-demo.mp4" type="video/mp4">
</video>
```
