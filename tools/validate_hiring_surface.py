#!/usr/bin/env python3
"""Guard the recruiter-facing information architecture and contact surface."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


index = read("index.html")
about = read("about.html")
projects = read("projects.html")
experience = read("experience.html")
skills = read("skills.html")
contact = read("contact.html")
ghost = read("projects/ghost.html")
aeroframe = read("projects/md11-structures.html")
site_css = read("assets/css/site.css")
github_js = read("assets/js/github.js")

public_pages = sorted(ROOT.rglob("*.html"))
public_html = "\n".join(
    page.read_text(encoding="utf-8")
    for page in public_pages
    if page != ROOT / "assets" / "og-image.src.html"
)

project_keys = re.findall(r'data-project-key="([^"]+)"', projects)
expected_keys = {
    "ghost", "astra", "aeroframe", "f16", "rocket",
    "spirit", "interceptor", "kestrel", "chaser",
}

checks = {
    "About owns the professional headshot": about.count('<img src="assets/headshot-about.webp"') == 1 and '<img src="assets/headshot-about.webp"' not in index,
    "About owns education": "Fast Track BS/MS" in about and "Expected May 2027" in about,
    "Experience does not duplicate education": "Fast Track BS/MS" not in experience and "Expected May 2027" not in experience,
    "homepage is a section directory": all(f'href="{page}.html"' in index for page in ("about", "projects", "experience", "skills", "contact")),
    "homepage does not duplicate project cards": "data-project-key=" not in index and "case--conversion" not in index,
    "all nine projects appear once": set(project_keys) == expected_keys and len(project_keys) == len(expected_keys),
    "GHOST live project site promoted": "https://xpiredruby.github.io/ghost-vins-eskf/" in projects and "https://xpiredruby.github.io/ghost-vins-eskf/" in ghost,
    "GHOST project evidence shown": "assets/evidence/ghost/estimator-rmse.png" in projects,
    "ASTRA project evidence shown": "assets/evidence/astra/architecture.svg" in projects,
    "AeroFrame project evidence shown": "assets/evidence/aeroframe/fe-response.png" in projects,
    "F16 project evidence shown": "assets/evidence/f16/monte-carlo-altitude.png" in projects,
    "AeroFrame current claims retained": "+0.151" in aeroframe and "18 / 18" in aeroframe,
    "Experience uses accessible role disclosure": experience.count("<details") == 3 and experience.count("<summary") == 3,
    "Skills use six concrete icon cards": skills.count('class="skill-card panel"') == 6 and skills.count('class="skill-card__icon"') == 6,
    "Skills mount a live GitHub feed": 'id="gh-list"' in skills and 'id="gh-count"' in skills and 'assets/js/github.js' in skills,
    "GitHub feed uses the public API with fallback": "https://api.github.com/users/" in github_js and "fallbackMarkup" in github_js,
    "correct email is public": "Vin.manoj.nair@gmail.com" in contact and "mailto:Vin.manoj.nair@gmail.com" in public_html,
    "old email removed": "vinhoustontexas@gmail.com" not in public_html.lower(),
    "resume surface removed": not (ROOT / "resume.html").exists() and not (ROOT / "assets" / "resume.pdf").exists() and "resume.html" not in public_html.lower() and "resume.pdf" not in public_html.lower(),
    "new visual layer active": "portfolio-refresh.css" in site_css,
    "project cards keep evidence boundaries": projects.count("Evidence boundary:") == 9,
}

failed = [name for name, ok in checks.items() if not ok]
if failed:
    print("Hiring-surface validation FAILED:")
    for name in failed:
        print(f" - {name}")
    sys.exit(1)

print(f"Hiring-surface validation PASS: {len(checks)} recruiter-facing checks.")
