# vin-portfolio

Recruiter-facing engineering portfolio for **Vinayak Manoj Nair**, B.S. Aerospace Engineering at Texas A&M University, expected May 2027.

**Focus:** guidance, navigation & control · flight software verification · structural analysis · systems engineering.

Live site: [vinnair.me](https://vinnair.me/)

## Portfolio rule

The site is not intended to prove that I know front-end frameworks. It is intended to let an aerospace reviewer answer, quickly:

1. What engineering problems has this candidate worked on?
2. What did they personally design or implement?
3. What evidence shows that it works?
4. What failed, changed, or remains unverified?
5. Where can I inspect the source or deeper technical record?

For that reason the site uses plain HTML, CSS and JavaScript with no framework or build step. Complexity is added only when it improves the engineering story, accessibility, reliability or reproducibility.

## Site structure

The homepage is a concise directory rather than a second copy of the portfolio. Each section owns one type of information:

1. About contains the personal introduction, headshot, education and engineering approach.
2. Projects contains one aligned card per project; exact methods and results live in the case studies.
3. Experience contains professional roles and outcomes in an expandable timeline.
4. Skills contains capability groups and live public GitHub repository data.
5. Contact contains the current email and external profiles.

## Flagship public work

| Project | Primary signal | Public evidence |
|---|---|---|
| **GHOST-X** | state estimation, uncertainty, dropout/reacquisition, GNC integration | [`XpiredRuby/ghost-vins-eskf`](https://github.com/XpiredRuby/ghost-vins-eskf) |
| **ASTRA-OS** | flight software architecture, FDIR, command/telemetry, assurance | [`XpiredRuby/AstraSim-FSW`](https://github.com/XpiredRuby/AstraSim-FSW) |
| **AeroFrame-DT** | stress substantiation, FE verification, fatigue/damage tolerance, configuration control | [`XpiredRuby/aeroframe-dt`](https://github.com/XpiredRuby/aeroframe-dt) |
| **F-16-inspired SIL** | flight dynamics, controls, seeded uncertainty and explicit model limits | [`XpiredRuby/f16-flight-sim`](https://github.com/XpiredRuby/f16-flight-sim) |

Case-study-only or program work is labeled as such rather than being presented as public source.

## Evidence discipline

Portfolio summaries should be downstream of the authoritative project repositories, not independent marketing claims.

- Do not add a metric because it sounds impressive.
- Do not turn a design target into an achieved result.
- Keep hardware evidence, controlled software truth and SIL results distinguishable.
- Preserve negative findings when they materially change the engineering conclusion.
- Link directly to the relevant repository or evidence page instead of a generic GitHub profile when public source exists.
- If a repository evolves, update the portfolio summary or make it less specific; stale precision is worse than a concise current description.

## Structure

```text
vin-portfolio/
├── index.html                  concise portfolio directory
├── about.html                  profile, headshot, education and approach
├── projects.html               one-card-per-project register
├── projects/                   detailed engineering case studies
├── experience.html             expandable engineering role archive
├── skills.html                 capability map + live GitHub repositories
├── contact.html
├── demos/                      recruiter-friendly demonstrations
├── assets/
│   ├── css/site.css
│   ├── js/site.js
│   ├── js/github.js            selected live public-repository feed
│   ├── evidence/               pinned source-backed plots + provenance manifest
│   ├── hero/                   generated project illustrations
│   └── diagrams/               generated technical diagrams
├── tools/validate_site.py      zero-dependency integrity gate
├── .github/workflows/site-check.yml
├── robots.txt
├── sitemap.xml
└── CNAME
```

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Validate before publishing

```bash
python tools/validate_site.py
node --check assets/js/site.js
node --check assets/js/github.js
python -m py_compile assets/hero/generate.py assets/diagrams/generate.py
```

GitHub Actions runs the same checks on pull requests. The validator fails on broken local links/assets, missing page metadata, malformed JSON-LD, and a small set of known presentation regressions.

## Graphics policy

Project hero graphics are **illustrations, not engineering data**. They remain only where they help explain a system that has no publishable media. Public repository-backed plots are copied from pinned source or rendered from pinned code/config into `assets/evidence/`, documented in the manifest, captioned with their evidence class, and displayed without cropping.

Regenerate project illustrations with:

```bash
python assets/hero/generate.py
python assets/diagrams/generate.py
```

## Accessibility and performance

The site intentionally keeps the delivery model small:

- semantic landmarks and a skip link;
- keyboard focus styles and active-navigation state;
- reduced-motion support;
- deferred JavaScript;
- SVG project illustrations;
- responsive CSS with no application framework;
- canonical URLs, Open Graph/Twitter metadata and JSON-LD;
- graceful fallback if the unauthenticated GitHub API feed is unavailable.

## Deployment

GitHub Pages from `main`, repository root. `CNAME` points to `vinnair.me`.

The repository settings should also keep the GitHub homepage field pointed to `https://vinnair.me/` and use topics that describe the actual engineering portfolio rather than front-end implementation details.
