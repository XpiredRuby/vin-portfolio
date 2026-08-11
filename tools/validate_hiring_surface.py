#!/usr/bin/env python3
"""Guard the recruiter-facing surface against visual and positioning regressions."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
index = (ROOT / "index.html").read_text(encoding="utf-8")
projects = (ROOT / "projects.html").read_text(encoding="utf-8")
site_css = (ROOT / "assets" / "css" / "site.css").read_text(encoding="utf-8")

checks = {
    "homepage professional headshot": 'assets/headshot.jpg?rev=20260811' in index,
    "GHOST concept banner": 'assets/hero/ghost-ai.jpg' in index and 'assets/hero/ghost-ai.jpg' in projects,
    "ASTRA concept banner": 'assets/hero/astra-ai.jpg' in index and 'assets/hero/astra-ai.jpg' in projects,
    "AeroFrame concept banner": 'assets/hero/aeroframe-ai.jpg' in index and 'assets/hero/aeroframe-ai.jpg' in projects,
    "plain-English project framing": '<strong>Problem:</strong>' in projects,
    "primary GNC positioning": 'focused on GNC, state estimation and flight software' in index,
    "current availability": 'SPRING 2027 + MAY 2027' in index and 'Fall 2026' not in index,
    "banner layer active": 'project-banners.css' in site_css,
    "conversion layer active": 'hiring-conversion.css' in site_css,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    print("Hiring-surface validation FAILED:")
    for name in failed:
        print(f" - {name}")
    sys.exit(1)
print(f"Hiring-surface validation PASS: {len(checks)} recruiter-facing checks.")
