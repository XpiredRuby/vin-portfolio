# Assets

## Evidence figures

`evidence/` contains source-backed plots and diagrams displayed in the project
case studies. `evidence/manifest.json` pins each group to a repository commit,
records the upstream path or generation basis, and states the claim boundary.
These figures are engineering evidence, not decorative concept art.

| Path | What it is | Regenerate with |
|---|---|---|
| `css/site.css` | Stylesheet entrypoint for the report, profile, and technical-product layers | hand-edited |
| `css/portfolio-refresh.css` | Cohesive layouts for Home, About, Projects, Experience, Skills, and Contact | hand-edited |
| `css/technical-product.css` | Command palette, project filtering, technical-diagram presentation, and View Transition enhancements | hand-edited |
| `js/site.js` | Core progressive-enhancement loader, nav, reveal, counters, clock, and TOC scroll-spy | hand-edited |
| `js/command-palette.js` | Accessible Cmd/Ctrl-K quick navigation backed by the local search index | hand-edited |
| `js/project-filter.js` | URL-synced search and domain filtering for `projects.html` | hand-edited |
| `js/github.js` | Live public GitHub repository feed (one unauthenticated API call, lazy, graceful fallback) | hand-edited |
| `data/search-index.json` | Local command-palette index for pages, projects, and public repositories | hand-edited |
| `diagrams/*.svg` | Primary technical visuals used across the case studies | `python3 assets/diagrams/generate.py` |
| `diagrams/generate.py` | Single source of truth for generated technical diagrams | hand-edited |
| `headshot.png` | Full-resolution professional portrait used on Home and About | replace only from the approved source photo |
| `hero/*-ai.jpg` | Optional concept artwork retained as decorative assets, not technical evidence and not the default project visual | image source + manual optimization |
| `og-image.png` | 1200×630 social preview card for the current portfolio identity | generated from the approved portfolio social-card brief |
| `og-image.src.html` | Historical code-rendered preview retained for reference | hand-edited |

## Visual hierarchy

Technical diagrams, plots, real screenshots, and test evidence are the primary project visuals. Concept artwork may be retained as decorative material, but it should never replace or be presented as engineering evidence.

## Adding project media

Put figures in `assets/img/` and reference them from the case studies. Prefer real engineering media: hardware photos, plots, architecture diagrams, FEA contours with context, test screenshots, or annotated results.

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
