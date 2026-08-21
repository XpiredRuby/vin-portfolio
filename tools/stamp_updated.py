#!/usr/bin/env python3
"""Stamp each page with the date its content last changed, taken from git.

The footer used to say "Portfolio reviewed regularly", which a reviewer has no
way to check, and sitemap.xml carried no <lastmod> at all. Both now carry a
real date derived from the repository history.

    python tools/stamp_updated.py           # refresh every stamp
    python tools/stamp_updated.py --check    # fail if a stamp is missing or invalid

The check is deliberately not an equality test against git. Stamping a page
changes that page, which changes its own last-commit date, so an exact match
could never hold twice in a row. What must hold is that every page carries a
well-formed date that is not in the future — run this before publishing and the
dates stay honest.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://vinnair.me/"
FOOTER_RE = re.compile(r'<li class="u-green"[^>]*>.*?</li>', re.S)
TIME_RE = re.compile(r'<time class="footer__updated" datetime="(\d{4}-\d{2}-\d{2})">[^<]*</time>')
LASTMOD_RE = re.compile(r"<lastmod>(\d{4}-\d{2}-\d{2})</lastmod>")
# Case-study and demo pages carry a one-line footer instead of the full grid.
COMPACT_RE = re.compile(r"<span>vinnair\.me</span>")
STATUS_RE = re.compile(r"<h5>Status</h5>\s*<ul>.*?</ul>", re.S)
# The last </div> before </footer> closes .shell, which carries the page gutter.
SHELL_END_RE = re.compile(r"\s*</div>\s*</footer>")
EXISTING_RE = re.compile(
    r'<(li|p|span)[^>]*class="[^"]*footer__stamp[^"]*"[^>]*>.*?</\1>'
    r'|<li class="u-green"[^>]*>\s*Updated\s*<time class="footer__updated".*?</li>',
    re.S,
)


def git_date(path: Path) -> str:
    """Date of the last commit touching this file, or today if git is silent."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", str(path.relative_to(ROOT))],
            cwd=ROOT, capture_output=True, text=True, check=False,
        ).stdout.strip()
    except OSError:
        out = ""
    return out or date.today().isoformat()


def pretty(iso: str) -> str:
    stamp = datetime.strptime(iso, "%Y-%m-%d")
    return f"{stamp.strftime('%B')} {stamp.day}, {stamp.year}"


def pages() -> list[Path]:
    return [
        page for page in sorted(ROOT.rglob("*.html"))
        if not page.name.endswith(".src.html")
        and 'http-equiv="refresh"' not in page.read_text(encoding="utf-8")
    ]


def stamp_page(page: Path, iso: str) -> bool:
    """Remove any existing stamp, then place a fresh one for this footer shape.

    Strip-then-insert rather than edit-in-place: re-running the tool then also
    repairs a stamp that an earlier version put in the wrong container, instead
    of updating the date and leaving it there.
    """
    text = page.read_text(encoding="utf-8")
    stripped = EXISTING_RE.sub("", text)
    label = f'Updated <time class="footer__updated" datetime="{iso}">{pretty(iso)}</time>'

    if FOOTER_RE.search(stripped):
        # Full footer: the stamp replaces the unverifiable "reviewed regularly".
        updated = FOOTER_RE.sub(
            f'<li class="u-green" style="font-size:.855rem">{label}</li>', stripped, count=1)
    elif STATUS_RE.search(stripped):
        # Full grid without that line: extend the Status list.
        updated = STATUS_RE.sub(
            lambda m: m.group(0)[: -len("</ul>")] + f'<li class="u-green">{label}</li></ul>',
            stripped, count=1)
    elif COMPACT_RE.search(stripped):
        # Compact footer: sits beside the domain on the single bar.
        updated = COMPACT_RE.sub(
            f'<span>vinnair.me</span><span class="footer__stamp">{label}</span>',
            stripped, count=1)
    elif SHELL_END_RE.search(stripped):
        # Anything else: its own line, inside the shell so it keeps the gutter.
        updated = SHELL_END_RE.sub(
            lambda m: f'<p class="footer__stamp">{label}</p>' + m.group(0), stripped, count=1)
    else:
        return False

    # Reviewers are not the only audience: search engines read dateModified.
    updated = re.sub(r'"dateModified"\s*:\s*"[^"]*"', f'"dateModified":"{iso}"', updated)
    if '"dateModified"' not in updated:
        updated = re.sub(
            r'("@type"\s*:\s*"(?:TechArticle|Person|CollectionPage|WebPage|ProfilePage)")',
            r'\1,"dateModified":"' + iso + '"',
            updated, count=1,
        )
    if updated != text:
        page.write_text(updated, encoding="utf-8")
        return True
    return False


def stamp_sitemap(dates: dict[str, str]) -> bool:
    path = ROOT / "sitemap.xml"
    text = path.read_text(encoding="utf-8")

    def rewrite(match: re.Match) -> str:
        block = match.group(0)
        loc = re.search(r"<loc>([^<]+)</loc>", block)
        if not loc:
            return block
        rel = loc.group(1)[len(SITE_ORIGIN):] or "index.html"
        iso = dates.get(rel)
        if not iso:
            return block
        block = re.sub(r"<lastmod>[^<]*</lastmod>", "", block)
        return block.replace("</loc>", f"</loc><lastmod>{iso}</lastmod>", 1)

    updated = re.sub(r"<url>.*?</url>", rewrite, text, flags=re.S)
    if updated != text:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


def check() -> int:
    problems: list[str] = []
    today = datetime.now(timezone.utc).date()
    for page in pages():
        text = page.read_text(encoding="utf-8")
        match = TIME_RE.search(text)
        rel = page.relative_to(ROOT)
        if not match:
            problems.append(f"{rel}: no footer last-updated stamp")
            continue
        if date.fromisoformat(match.group(1)) > today:
            problems.append(f"{rel}: last-updated stamp {match.group(1)} is in the future")

    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    urls = len(re.findall(r"<url>", sitemap))
    stamps = LASTMOD_RE.findall(sitemap)
    if len(stamps) != urls:
        problems.append(f"sitemap.xml: {len(stamps)} <lastmod> for {urls} <url>")
    for stamp in stamps:
        if date.fromisoformat(stamp) > today:
            problems.append(f"sitemap.xml: lastmod {stamp} is in the future")

    for problem in problems:
        print(problem)
    if not problems:
        print(f"last-updated stamps current: {len(pages())} pages, {urls} sitemap URLs")
    return 1 if problems else 0


def main() -> int:
    if "--check" in sys.argv:
        return check()
    dates: dict[str, str] = {}
    changed = 0
    for page in pages():
        iso = git_date(page)
        dates[page.relative_to(ROOT).as_posix()] = iso
        if stamp_page(page, iso):
            changed += 1
    if stamp_sitemap(dates):
        changed += 1
    print(f"last-updated stamped: {changed} file(s) changed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
