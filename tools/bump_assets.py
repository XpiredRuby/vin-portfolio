#!/usr/bin/env python3
"""Stamp every HTML page with a version derived from the asset bytes.

The site has no build step, so the ?v= query on site.css and site.js is the
only thing telling a browser its cached copy is stale. Hand-maintaining that
string means forgetting it: the stylesheet changed five times in one session
while the query stayed put, and returning visitors kept the old CSS.

Deriving the version from a hash of the assets themselves removes the choice.
Run this before publishing; validate_site.py fails if it was not run.
"""

from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Everything a page loads through the versioned query, directly or by
# inheriting it: the stylesheets, every script, and the palette's index.
ASSET_GLOBS = [
    "assets/css/*.css",
    "assets/js/*.js",
    "assets/js/labs/*.js",
    "assets/data/search-index.json",
]

VERSION_RE = re.compile(r'((?:href|src)="[^"]*?(?:site\.css|site\.js))\?v=[^"]*(")')


def asset_files() -> list[Path]:
    files: list[Path] = []
    for pattern in ASSET_GLOBS:
        files.extend(ROOT.glob(pattern))
    return sorted(files)


def compute_version() -> str:
    digest = hashlib.sha256()
    for path in asset_files():
        digest.update(path.relative_to(ROOT).as_posix().encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()[:12]


def pages() -> list[Path]:
    return sorted(p for p in ROOT.rglob("*.html") if ".git" not in p.parts)


def stamp(write: bool) -> int:
    version = compute_version()
    stale: list[str] = []

    for page in pages():
        text = page.read_text(encoding="utf-8")
        updated = VERSION_RE.sub(r"\1?v=" + version + r"\2", text)
        if updated != text:
            stale.append(page.relative_to(ROOT).as_posix())
            if write:
                page.write_text(updated, encoding="utf-8")

    if write:
        print(f"asset version {version} stamped on {len(stale)} page(s)")
        return 0

    if stale:
        print(f"Asset version is stale on {len(stale)} page(s); expected v={version}")
        for name in stale:
            print(f" - {name}")
        print("\nRun: python tools/bump_assets.py")
        return 1

    print(f"Asset version current: v={version}")
    return 0


if __name__ == "__main__":
    sys.exit(stamp(write="--check" not in sys.argv))
