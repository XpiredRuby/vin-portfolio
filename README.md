# vin-portfolio

Personal portfolio site for Vinayak Nair — aerospace engineering student focused on GNC, autonomy, and structures.

Built with plain HTML, CSS, and JavaScript. No build step, no framework. Deployed via GitHub Pages.

**Live site:** `https://vinnair.me/` (after Pages is enabled)

## Structure

```
vin-portfolio/
├── index.html       # Home — hero, featured GHOST project, skills, stats
├── projects.html    # Full project spec sheets
├── resume.html      # HTML resume (SEO-friendly, links to PDF)
├── about.html       # Bio, education, interests
├── contact.html     # Email, LinkedIn, GitHub, resume
├── 404.html         # Custom not-found page (GitHub Pages)
├── robots.txt       # Crawler directives
├── sitemap.xml      # Site index for search engines
├── favicon.svg      # Site favicon
├── styles.css       # Source stylesheet (edit this)
├── styles.min.css   # Minified stylesheet (referenced by HTML)
├── main.js          # Source JS (edit this)
├── main.min.js      # Minified JS (referenced by HTML)
├── assets/          # Resume PDF, videos, images, og-image
│   └── README.md    # Asset placement guide
└── README.md
```

After editing `styles.css` or `main.js`, regenerate the minified files before deploying. The HTML pages reference `styles.min.css` and `main.min.js`.

## Local preview

Open any HTML file directly in a browser, or serve locally:

```bash
# Python 3
python -m http.server 8000

# Then visit http://localhost:8000
```

## Updating projects

Each project lives as an `<article class="project-card">` block in `projects.html`. Follow this template:

```html
<article id="project-slug" class="project-card fade-in">
  <div class="project-header">
    <h2 class="project-title">Project Name</h2>
    <span class="status-tag status-complete">Complete</span>
  </div>

  <ul class="tag-list" aria-label="Technologies">
    <li>Tag one</li>
    <li>Tag two</li>
  </ul>

  <div class="project-spec">
    <h3>Problem</h3>
    <p>...</p>
  </div>

  <div class="project-spec">
    <h3>Approach</h3>
    <p>...</p>
  </div>

  <div class="project-spec">
    <h3>Result</h3>
    <p>...</p>
  </div>

  <div class="project-actions">
    <a href="https://github.com/..." class="btn btn-external" target="_blank" rel="noopener noreferrer">GitHub</a>
  </div>
</article>
```

**Status tag classes:**

- `status-active` — amber, for in-progress work
- `status-complete` — teal, for finished projects
- `status-archived` — muted, for shelved work

To feature a project on the home page, copy a condensed version into the featured section in `index.html`.

## Adding assets

See `assets/README.md` for where to place `resume.pdf`, demo videos, and images.

## GitHub Pages deployment

1. Push this repo to `XpiredRuby/vin-portfolio` on the `main` branch
2. Go to **Settings → Pages**
3. Under **Build and deployment**, set Source to **Deploy from a branch**
4. Select branch `main` and folder **`/ (root)`**
5. Save — the site will be live at `https://xpiredruby.github.io/vin-portfolio/` within a few minutes

## Design notes

- Dark mission-briefing aesthetic: charcoal background, amber accents, monospace headings
- Fonts: JetBrains Mono (headings/labels), IBM Plex Sans (body) via Google Fonts CDN
- Mobile-first, keyboard-navigable, minimal JS
