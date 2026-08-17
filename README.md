# vin-portfolio

Engineering portfolio for **Vinayak Manoj Nair**, Aerospace Engineering, Texas A&M University (May 2027).
Guidance, navigation & control · systems engineering · embedded flight software · autonomous robotics.

Plain HTML, CSS and JavaScript. **No framework, no build step, no dependencies.** Deployed via GitHub Pages
at [vinnair.me](https://vinnair.me/).

---

## Design intent

The site is built to read like a **mission dashboard crossed with an engineering report**, not like a
developer portfolio. Every project is documented the way an internal engineering report is written:
problem, requirements, constraints, system design, mathematical models, algorithms, implementation,
testing, validation, performance, results, tradeoffs, challenges, lessons learned, future work.

- Very dark graphite surfaces, hairline borders, no glassmorphism, no decorative shadows
- Electric blue and cyan accents; orange used sparingly for highlights and risk
- Space Grotesk (headings) / Inter (body) / JetBrains Mono (technical labels and code)
- Motion is purposeful only: one scroll-reveal, one counter, one orbit. All disabled under
  `prefers-reduced-motion`

---

## Structure

```
vin-portfolio/
├── index.html                      # Home, hero, stats, disciplines, stack, featured projects,
│                                   #        experience, live GitHub feed
├── projects.html                   # Project register + case-study summaries
├── projects/
│   ├── ghost.html                  # PRJ-01  GPS-denied dual-filter state estimation
│   ├── astrasim-fsw.html           # PRJ-02  Flight software HIL verification framework
│   ├── rocket-landing-gnc.html     # PRJ-03  6-DOF booster descent GNC + Monte Carlo
│   ├── md11-structures.html        # PRJ-04  CAD assembly + static/thermal/modal FEA
│   ├── aeroframe-dt.html           # PRJ-08  Pylon fitting parametric trade study + nonlinear FEA
│   ├── interceptor.html            # PRJ-05  Sub-100 ms perception-to-actuation loop
│   ├── spirit-iss.html             # PRJ-06  ISS payload systems engineering
│   └── kestrel.html                # PRJ-07  Archived programme closeout
├── experience.html                 # Timeline with measurable accomplishments
├── skills.html                     # Skills matrix, every skill linked to its project
├── resume.html                     # Interactive resume (prints to a clean 3-page PDF)
├── about.html                      # Short bio and working principles
├── contact.html                    # Contact channels, availability, recruiter quick-facts
├── 404.html                        # Custom not-found page
├── demos/
│   └── astrasim-fsw-hil-workstation.html   # Standalone HIL evidence replay workstation
├── assets/
│   ├── css/site.css                # Entire design system (single stylesheet)
│   ├── js/site.js                  # Nav, scroll reveal, counters, clock, TOC scroll-spy
│   ├── js/github.js                # Live GitHub repo + commit feed (2 API calls, cached, graceful)
│   ├── hero/*.svg                  # Project hero artwork (illustrations, not data plots)
│   ├── hero/generate.py            # Regenerates all hero art from one spec file
│   ├── diagrams/*.svg              # Technical block diagrams used inside case studies
│   ├── diagrams/generate.py        # Regenerates every diagram from one spec file
│   ├── headshot.jpg                # Portrait
│   ├── img/aeroframe-dt/*.png      # AeroFrame-DT geometry, mesh, result and correlation evidence
│   ├── og-image.png                # 1200×630 social preview
│   ├── og-image.src.html           # Source used to render the OG image
│   └── resume.pdf                  # Generated from resume.html via the print stylesheet
├── favicon.svg
├── robots.txt
├── sitemap.xml
└── CNAME
```

---

## Local preview

```bash
python3 -m http.server 8000
# http://localhost:8000
```

No build step. Edit the HTML/CSS/JS directly and reload.

---

## Regenerating assets

### Diagrams and hero art

Both sets of graphics are generated from a single script each, so they stay visually consistent:

```bash
python3 assets/diagrams/generate.py   # technical block diagrams
python3 assets/hero/generate.py       # project hero artwork
```

The hero artwork is **illustration, not measured data**. Nothing in it is presented as a result;
real numbers live in the case-study text and in the repositories.

Edit the box/arrow specs at the bottom of that file to change a diagram, then re-run.

### Resume PDF

The PDF is the print stylesheet, rendered. Regenerate after editing `resume.html`:

```bash
python3 -m http.server 8000 &
chromium --headless --no-pdf-header-footer \
  --print-to-pdf=assets/resume.pdf http://localhost:8000/resume.html
```

Or simply open `resume.html` and use **Print / Save as PDF**, the print stylesheet strips navigation,
converts to black on white, forces all reveal-animated content visible, and tightens spacing.

### Open Graph image

```bash
chromium --headless --window-size=1200,712 \
  --screenshot=/tmp/og.png assets/og-image.src.html
# then crop the top 1200×630 (headless reserves ~80px of chrome height)
```

---

## Things to fill in

These are deliberately visible as **pending-asset slots** on the live site rather than hidden, a slot is
honest, a missing figure is not. Replace them as media becomes available:

| Where | What to add |
|---|---|
| `assets/headshot.jpg` | A professional headshot (current image is a casual photo, 400×400) |
| GHOST → Gallery | Hardware rig photo, PX4 SITL capture, NIS plot, occlusion trace |
| Rocket GNC → Results | 500-run Monte Carlo dispersion scatter, 6-DOF trajectory traces |
| AeroFrame-MD11 → Gallery | SolidWorks render, Abaqus von Mises contours, convergence plot, drawing sheet |
| Interceptor → Gallery | Robot photo, annotated detection frame, latency histogram, demo video |
| AstraSim-FSW → Gallery | Bench photograph of the Pi target and ground station |

To replace a slot, swap the `<div class="slot">…</div>` block for:

```html
<figure class="fig">
  <div class="fig__body"><img src="../assets/img/your-figure.png" alt="Descriptive alt text" loading="lazy"></div>
  <figcaption><b>Fig. n</b>What the figure shows and what it proves.</figcaption>
</figure>
```

### Numbers to verify before sharing widely

Two homepage statistics are estimates and are flagged with an HTML comment in `index.html`:
**simulation hours** and **years engineering**. Every other figure on the site traces to a specific
project result.

---

## Adding a new project

1. Copy `projects/ghost.html` as the template, it has the full 16-section structure and TOC.
2. Update the `<title>`, meta description, canonical URL, JSON-LD, and breadcrumb.
3. Add a diagram spec to `assets/diagrams/generate.py` and re-run it.
4. Add a `<article class="case">` block to `projects.html` and a row to the project register table.
5. Add the URL to `sitemap.xml`.
6. Optionally feature it on `index.html`.

---

## GitHub feed

`assets/js/github.js` calls the public GitHub API twice (repositories, then public events) when the
GitHub section scrolls into view. Unauthenticated, so it is subject to a 60 requests/hour/IP limit; on
failure or rate limit it degrades to a static message with a profile link. Pinned repositories are listed
in the `PINNED` array at the top of that file.

---

## Deployment

GitHub Pages, `main` branch, `/ (root)`. `CNAME` points at `vinnair.me`.

## Accessibility & performance

- Semantic landmarks, skip link, visible focus rings, `aria-current` on the active nav item
- All motion suppressed under `prefers-reduced-motion: reduce`
- No render-blocking JavaScript; both scripts are `defer`
- Diagrams are SVG; the only raster assets are the headshot and the OG image
- Full metadata, Open Graph, Twitter cards and JSON-LD schema on every page
