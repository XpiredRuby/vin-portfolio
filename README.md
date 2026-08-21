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

Each case study also carries an interactive model, linked from the project card,
the project register and the command palette.

## Flagship public work

| Project | Primary signal | Public evidence |
|---|---|---|
| **GHOST-X** | state estimation, uncertainty, dropout/reacquisition, GNC integration | [`XpiredRuby/ghost-vins-eskf`](https://github.com/XpiredRuby/ghost-vins-eskf) |
| **ASTRA-OS** | flight software architecture, FDIR, command/telemetry, assurance | [`XpiredRuby/AstraSim-FSW`](https://github.com/XpiredRuby/AstraSim-FSW) |
| **AeroFrame-DT** | stress substantiation, FE verification, fatigue/damage tolerance, configuration control | [`XpiredRuby/aeroframe-dt`](https://github.com/XpiredRuby/aeroframe-dt) |
| **F-16-inspired SIL** | flight dynamics, controls, seeded uncertainty and explicit model limits | [`XpiredRuby/f16-flight-sim`](https://github.com/XpiredRuby/f16-flight-sim) |

Case-study-only or program work is labeled as such rather than being presented as public source.

## Design system

The site uses one token set and two complete themes: dark by default and warm
engineering paper in light. A small inline script in each `<head>` resolves the
stored or system preference before first paint, so the page never flashes the
wrong palette; a control in the header switches it.

Pages never hard-code a colour. A case study declares `data-discipline` on
`<html>` and inherits the accent for its field — copper for structures, blue
for controls, violet for systems, green for flight software — which gives each
project its own identity without leaving the system.

## Ambient interaction

Alongside the models, the site responds to presence rather than only to
clicks: a cursor spotlight tracks across cards, featured project cards lean
toward the pointer, primary actions drift a few pixels to meet it, the hero
portrait parallaxes on scroll, and grids assemble one item at a time.

None of it carries information. All of it is switched off under
`prefers-reduced-motion`, and on touch devices, where a hover state is a lie.
`assets/js/motion.js` gates every effect behind both checks and clears any
inline transforms if the preference changes mid-session.

Contact routes are icons rather than repeated text — email, LinkedIn, GitHub,
and a copy-to-clipboard control. Each keeps a real label in the DOM for screen
readers and surfaces it on hover, so nothing is guessable-only.

## The cursor

On a fine pointer with motion allowed, the cursor is three marks rather than
one: a dot pinned exactly to the pointer, a reticle that lags behind and
morphs to lock onto whatever it is over, and a dashed ghost showing where a
constant-velocity filter predicts the pointer will be one lead-time from now.

Move slowly and the ghost sits on the dot. Move fast and it runs ahead. Stop
and it converges. That convergence is the same behaviour the GHOST-X estimator
performs on a target, which is why the GHOST-X case study points at it.

`assets/js/cursor.js` never mounts on touch or under `prefers-reduced-motion`,
hands the native caret back over inputs and editable content, and switches the
dot to the surface ink colour on accent-filled controls where an accent dot
would otherwise disappear.

## Interactive models

Every case study carries a model a reviewer can drive in the browser. They are
mounted with `<div data-lab="NAME">`; `assets/js/labs/core.js` builds the
chrome and loads `assets/js/labs/NAME.js` on demand.

The models illustrate the engineering mechanism a case study describes. They
are not a rerun of the project's verified results, and each one states its own
boundary in its footer. Where a model reproduces a released number it does so
from the real method — the AeroFrame-DT lug sweep lands on the released
+0.151 governing margin and the e/D 1.35 mode crossover from MMPDS-class
allowables, and the ASTRA-OS console computes a real CRC-16/CCITT-FALSE — but
the repository remains the authority in every case.

The same discipline as the rest of the portfolio applies: a model must not
imply evidence the project does not have. The interceptor model is explicitly
framed as a latency budget of the reported shape rather than measurement,
because that project has no public timing data.

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
│   ├── css/site.css            design tokens and every component
│   ├── css/evidence-first.css  evidence components (defines no colours)
│   ├── css/labs.css            interactive-model chrome
│   ├── js/site.js              theme, reveal, lightbox, reading progress
│   ├── js/motion.js            spotlight, tilt, magnet, parallax, clipboard
│   ├── js/cursor.js            reticle and constant-velocity pointer prediction
│   ├── js/labs/core.js         plotting and control runtime for the models
│   ├── js/labs/<project>.js    one interactive model per case study
│   ├── js/github.js            selected live public-repository feed
│   ├── data/search-index.json  curated command-palette targets (hand-written)
│   ├── data/search-text.json   page text + tools, generated, loaded on demand
│   ├── og-card.src.html        social card template (never served)
│   ├── og/                     one rendered social card per case study
│   ├── evidence/               pinned source-backed plots + provenance manifest
│   ├── hero/                   generated project illustrations
│   └── diagrams/               generated technical diagrams
├── tools/validate_site.py      zero-dependency integrity gate
├── tools/validate_hiring_surface.py
├── tools/bump_assets.py        content-hash cache-busting version
├── tools/build_search_index.py full-text palette index (generated)
├── tools/render_og.js          social preview cards
├── tools/og-cards.json         one card definition per page
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
python tools/bump_assets.py --check
python tools/validate_site.py
python tools/validate_hiring_surface.py
for f in assets/js/*.js assets/js/labs/*.js; do node --check "$f"; done
python -m json.tool assets/data/search-index.json > /dev/null
python tools/build_search_index.py --check
node tools/render_og.js --check
python -m py_compile assets/hero/generate.py assets/diagrams/generate.py
```

After changing any CSS or JS, stamp a new cache-busting version, or returning
visitors keep the old files:

```bash
python tools/bump_assets.py
```

GitHub Actions runs the same checks on pull requests. The validators fail on broken local links/assets, missing page metadata, malformed JSON-LD, a case study that has lost its interactive model, a model module with no mount point or no declared scope, and a small set of known presentation regressions.

## Search

The command palette (Ctrl/Cmd-K) searches two tiers. `search-index.json` holds
the curated navigation targets and is edited by hand. `search-text.json` is
generated: it carries every page's text split at the same anchors the table of
contents uses, plus the skills-page tools, so a query like `damage tolerance`,
`CRC` or `Abaqus` lands on the section that discusses it rather than the top of
a page. Regenerate it whenever page copy changes:

```bash
python tools/build_search_index.py
```

It is ~110 KB, so it is fetched the first time the palette opens rather than on
every page load, and the palette still works from the curated tier alone if that
request fails.

## Social preview cards

Every page carries its own 1200x630 card so a pasted link previews the page it
opens, not a generic banner. Cards are generated — never hand-edited — from one
template plus a manifest:

```bash
node tools/render_og.js                  # all cards
node tools/render_og.js ghost            # just the matching card
node tools/render_og.js --check          # sizes only; no browser needed
```

Editing `tools/og-cards.json` means re-rendering. The validator fails on a card
that is missing, off-size, or referenced by a page that no longer matches, and
on any `og:image` that is not a raster a scraper will accept — an `.svg` there
previews as no image at all.

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
- a light/dark theme resolved before first paint, honouring the system setting;
- interactive models built from native range, checkbox and select controls, so
  they are keyboard- and screen-reader-navigable, and every plot carries a text
  readout beside it;
- reduced-motion support;
- deferred JavaScript;
- SVG project illustrations;
- responsive CSS with no application framework;
- canonical URLs, Open Graph/Twitter metadata and JSON-LD;
- graceful fallback if the unauthenticated GitHub API feed is unavailable.

## Deployment

GitHub Pages from `main`, repository root. `CNAME` points to `vinnair.me`.

The repository settings should also keep the GitHub homepage field pointed to `https://vinnair.me/` and use topics that describe the actual engineering portfolio rather than front-end implementation details.
