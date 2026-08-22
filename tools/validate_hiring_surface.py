#!/usr/bin/env python3
"""Guard the warm, cross-disciplinary recruiter-facing portfolio surface."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


index = read("index.html")
about = read("about.html")
projects = read("projects.html")
contact = read("contact.html")
skills = read("skills.html")
ghost = read("projects/ghost.html")
astra = read("projects/astrasim-fsw.html")
aeroframe = read("projects/aeroframe-dt.html")
f16 = read("projects/f16-flight-controls.html")
site_css = read("assets/css/site.css")
github_js = read("assets/js/github.js")

public_pages = sorted(ROOT.rglob("*.html"))
public_html = "\n".join(
    page.read_text(encoding="utf-8")
    for page in public_pages
    if not page.name.endswith(".src.html")
)

labs_dir = ROOT / "assets" / "js" / "labs"
lab_modules = {path.stem for path in labs_dir.glob("*.js")} - {"core"}
mounted_labs = set(re.findall(r'data-lab="([a-z0-9]+)"', public_html))
case_studies = sorted(
    path for path in (ROOT / "projects").glob("*.html")
    if "http-equiv=\"refresh\"" not in path.read_text(encoding="utf-8")
)
interactive_case_studies = [
    path for path in case_studies
    if 'id="interactive"' in path.read_text(encoding="utf-8")
]

checks = {
    "professional cross-disciplinary hero is active": "portfolio-hero" in index and "structure to software" in index.lower(),
    "homepage represents four engineering areas": all(
        area in index for area in ("Mechanical", "Controls", "Systems", "Software")
    ),
    "homepage routes to core recruiter sections": all(
        f'href="{page}.html"' in index
        for page in ("about", "projects", "experience", "skills", "contact")
    ),
    "education remains available without GPA": "Fast Track BS/MS" in about and "May 2027" in about,
    "M.S. focus remains undecided": "focus yet to be decided" in about.lower(),
    "stale internship date is removed": "Summer 2026" not in public_html,
    "project catalog remains substantial": projects.count('<article class="case"') >= 7,
    "Kestrel is removed from the portfolio": not (ROOT / "projects" / "kestrel.html").exists() and "kestrel" not in public_html.lower(),
    "skills use recognizable tool icons": all(
        f"assets/icons/tools/{name}.svg" in skills
        for name in ("cplusplus", "python", "ros", "matlab", "ansys", "opencv", "raspberrypi", "cmake", "linux", "git")
    ),
    "quick navigation is styled": ".command-trigger" in site_css and ".command-palette" in site_css,
    "mechanical evidence is current": "+0.151" in aeroframe and "18 / 18" in aeroframe,
    "GHOST-X evidence site is promoted": "https://xpiredruby.github.io/ghost-vins-eskf/" in ghost,
    "ASTRA-OS assurance evidence is current": "20/20" in astra and "25/25" in astra,
    "fixed-wing model boundary is explicit": "Representative model" in f16 and "50 / 50" in f16,
    "concept art is disclosed": public_html.count("Concept visualization") >= 4,
    "generated covers are integrated": all(
        f"assets/img/project-covers/{name}-visual.webp" in public_html
        for name in ("ghost", "astrasim", "spirit", "md11")
    ),
    "correct email is public": "Vin.manoj.nair@gmail.com" in contact and "mailto:Vin.manoj.nair@gmail.com" in public_html,
    "correct LinkedIn profile is public": "linkedin.com/in/vinayakmnair" in public_html,
    "old contact details are removed": "vinhoustontexas@gmail.com" not in public_html.lower() and "linkedin.com/in/Vin2005" not in public_html,
    "GPA is not public": re.search(r"\bGPA\b", public_html) is None,
    "resume surface remains removed": not (ROOT / "resume.html").exists() and not (ROOT / "assets" / "resume.pdf").exists() and "resume.html" not in public_html.lower() and "resume.pdf" not in public_html.lower(),
    "professional mid-tone palette is retained": "#E4E1D8" in site_css and "#A9432F" in site_css,
    "evidence components remain styled": '@import url("./evidence-first.css")' in site_css,
    "every case study is interactive": len(interactive_case_studies) == len(case_studies),
    "every mounted model has a module": mounted_labs == lab_modules,
    "models declare their scope": all(
        (labs_dir / (name + ".js")).exists()
        and "note:" in (labs_dir / (name + ".js")).read_text(encoding="utf-8")
        for name in sorted(mounted_labs)
    ),
    "models are reachable from the project index": projects.count("#interactive") >= 9,
    "theme switching is wired": "vn-theme" in index and "--f-head" in site_css,
    "GitHub feed keeps a public fallback": "https://api.github.com/users/" in github_js and "fallbackMarkup" in github_js,
}

failed = [name for name, ok in checks.items() if not ok]
if failed:
    print("Hiring-surface validation FAILED:")
    for name in failed:
        print(f" - {name}")
    sys.exit(1)

print(f"Hiring-surface validation PASS: {len(checks)} recruiter-facing checks.")
