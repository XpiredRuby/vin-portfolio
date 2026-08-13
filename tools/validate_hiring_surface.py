#!/usr/bin/env python3
"""Guard the recruiter-facing surface against visual and positioning regressions."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
index = (ROOT / "index.html").read_text(encoding="utf-8")
projects = (ROOT / "projects.html").read_text(encoding="utf-8")
site_css = (ROOT / "assets" / "css" / "site.css").read_text(encoding="utf-8")
public_html = "\n".join(
    page.read_text(encoding="utf-8")
    for page in sorted(ROOT.rglob("*.html"))
    if page != ROOT / "assets" / "og-image.src.html"
)
no_repo_pages = "\n".join(
    (ROOT / "projects" / name).read_text(encoding="utf-8")
    for name in ("rocket-landing-gnc.html", "interceptor.html", "spirit-iss.html")
)

stale_availability = (
    "Fall 2026",
    "Spring 2027",
    "full-time roles",
    "Open to opportunities",
)

checks = {
    "homepage professional headshot": 'assets/headshot-about.webp' in index,
    "GHOST real evidence shown": 'assets/evidence/ghost/estimator-rmse.png' in index and 'assets/evidence/ghost/estimator-rmse.png' in projects,
    "ASTRA architecture shown": 'assets/evidence/astra/architecture.svg' in index and 'assets/evidence/astra/architecture.svg' in projects,
    "AeroFrame FE evidence shown": 'assets/evidence/aeroframe/fe-response.png' in index and 'assets/evidence/aeroframe/fe-response.png' in projects,
    "F16 Monte Carlo evidence shown": 'assets/evidence/f16/monte-carlo-altitude.png' in index and 'assets/evidence/f16/monte-carlo-altitude.png' in projects,
    "SPIRIT concept banner": 'assets/hero/spirit.svg' in projects,
    "plain-English project framing": '<strong>Problem:</strong>' in projects,
    "primary GNC positioning": 'focused on GNC, state estimation and flight software' in index,
    "availability windows removed": not any(term.lower() in public_html.lower() for term in stale_availability),
    "canonical LinkedIn profile": "https://www.linkedin.com/in/vinayakmnair/" in public_html and "Vin2005" not in public_html,
    "four homepage flagship cards": index.count('class="case case--conversion"') == 4,
    "four project flagship cards": projects.count('class="case case--conversion"') == 4,
    "Rocket Landing listed once": projects.count('data-project-key="rocket"') == 1,
    "AeroFrame claims are current": "+0.151" in index and "+0.151" in projects and "18/18" in index and "18/18" in projects,
    "F16 case study linked": 'projects/f16-flight-controls.html' in index and 'projects/f16-flight-controls.html' in projects,
    "Rocket prototype boundary visible": "Exploratory prototype" in projects and "500 runs" not in index,
    "evidence presentation layer active": 'evidence-first.css' in site_css,
    "unsupported repository claims removed": "GitHub repository" not in no_repo_pages and "full source, commit history" not in no_repo_pages,
    "legacy banner swap disabled": 'project-banners.css' not in site_css,
    "conversion layer active": 'hiring-conversion.css' in site_css,
}

old_low_res = (
    'assets/hero/ghost-ai.jpg',
    'assets/hero/astra-ai.jpg',
    'assets/hero/aeroframe-ai.jpg',
    'assets/hero/f16-ai.jpg',
)
checks["old low-resolution recruiter images removed"] = not any(
    old in index or old in projects for old in old_low_res
)

failed = [name for name, ok in checks.items() if not ok]
if failed:
    print("Hiring-surface validation FAILED:")
    for name in failed:
        print(f" - {name}")
    sys.exit(1)
print(f"Hiring-surface validation PASS: {len(checks)} recruiter-facing checks.")
