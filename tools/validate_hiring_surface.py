#!/usr/bin/env python3
"""Guard the recruiter-facing surface against visual and positioning regressions."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
index = (ROOT / "index.html").read_text(encoding="utf-8")
projects = (ROOT / "projects.html").read_text(encoding="utf-8")
site_css = (ROOT / "assets" / "css" / "site.css").read_text(encoding="utf-8")

checks = {
    "homepage professional headshot": 'assets/headshot-hq.webp' in index,
    "GHOST HQ concept banner": 'assets/hero/ghost-ai-hq.webp' in index and 'assets/hero/ghost-ai-hq.webp' in projects,
    "ASTRA HQ concept banner": 'assets/hero/astra-ai-hq.webp' in index and 'assets/hero/astra-ai-hq.webp' in projects,
    "AeroFrame HQ concept banner": 'assets/hero/aeroframe-ai-hq.webp' in index and 'assets/hero/aeroframe-ai-hq.webp' in projects,
    "F16 HQ concept banner": 'assets/hero/f16-ai-hq.webp' in projects,
    "SPIRIT HQ concept banner": 'assets/hero/spirit-ai-hq.webp' in projects,
    "plain-English project framing": '<strong>Problem:</strong>' in projects,
    "primary GNC positioning": 'focused on GNC, state estimation and flight software' in index,
    "current availability": 'SPRING 2027 + MAY 2027' in index and 'Fall 2026' not in index,
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
