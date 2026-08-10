#!/usr/bin/env python3
"""Fail closed on common static-site portfolio regressions.

No third-party dependencies: intended to run locally and in GitHub Actions.
"""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SKIP_SCHEMES = {"http", "https", "mailto", "tel", "data", "javascript"}
REQUIRED_ROOT_FILES = [
    ROOT / "index.html",
    ROOT / "projects.html",
    ROOT / "resume.html",
    ROOT / "assets" / "resume.pdf",
    ROOT / "assets" / "headshot.jpg",
    ROOT / "assets" / "og-image.png",
    ROOT / "robots.txt",
    ROOT / "sitemap.xml",
    ROOT / "CNAME",
]


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_title = False
        self.title = ""
        self.meta_description = ""
        self.canonical = ""
        self.links: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {k.lower(): (v or "") for k, v in attrs}
        if tag.lower() == "title":
            self.in_title = True
        if tag.lower() == "meta" and values.get("name", "").lower() == "description":
            self.meta_description = values.get("content", "").strip()
        if tag.lower() == "link" and "canonical" in values.get("rel", "").lower().split():
            self.canonical = values.get("href", "").strip()
        for attr in ("href", "src"):
            value = values.get(attr, "").strip()
            if value:
                self.links.append((attr, value))

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title += data


def resolve_local(page: Path, raw: str) -> Path | None:
    if raw.startswith("//") or raw.startswith("#"):
        return None
    split = urlsplit(raw)
    if split.scheme.lower() in SKIP_SCHEMES or split.netloc:
        return None
    path_text = unquote(split.path)
    if not path_text:
        return None
    if path_text.startswith("/"):
        target = ROOT / path_text.lstrip("/")
    else:
        target = page.parent / path_text
    if path_text.endswith("/"):
        target = target / "index.html"
    return target.resolve()


def check_html(page: Path) -> list[str]:
    errors: list[str] = []
    parser = PageParser()
    try:
        parser.feed(page.read_text(encoding="utf-8"))
    except Exception as exc:  # parser/encoding failures must be visible
        return [f"{page.relative_to(ROOT)}: cannot parse: {exc}"]

    rel = page.relative_to(ROOT)
    if not parser.title.strip():
        errors.append(f"{rel}: missing <title>")
    if page.name != "404.html":
        if not parser.meta_description:
            errors.append(f"{rel}: missing meta description")
        if not parser.canonical:
            errors.append(f"{rel}: missing canonical URL")

    for attr, raw in parser.links:
        target = resolve_local(page, raw)
        if target is None:
            continue
        try:
            target.relative_to(ROOT.resolve())
        except ValueError:
            errors.append(f"{rel}: {attr} escapes repository root: {raw}")
            continue
        if not target.exists():
            errors.append(f"{rel}: broken local {attr}: {raw}")
    return errors


def check_json_ld(page: Path) -> list[str]:
    """Catch malformed JSON-LD blocks, which browsers otherwise ignore silently."""
    text = page.read_text(encoding="utf-8")
    errors: list[str] = []
    pattern = re.compile(
        r'<script\s+type=["\']application/ld\+json["\']\s*>(.*?)</script>',
        re.IGNORECASE | re.DOTALL,
    )
    for index, block in enumerate(pattern.findall(text), start=1):
        try:
            json.loads(block)
        except json.JSONDecodeError as exc:
            errors.append(
                f"{page.relative_to(ROOT)}: malformed JSON-LD block {index}: {exc.msg}"
            )
    return errors


def main() -> int:
    errors: list[str] = []
    for required in REQUIRED_ROOT_FILES:
        if not required.exists():
            errors.append(f"missing required portfolio asset: {required.relative_to(ROOT)}")

    pages = sorted(ROOT.rglob("*.html"))
    if not pages:
        errors.append("no HTML pages found")
    for page in pages:
        errors.extend(check_html(page))
        errors.extend(check_json_ld(page))

    # Explicit regression checks for presentation claims that should not return.
    index = (ROOT / "index.html").read_text(encoding="utf-8") if (ROOT / "index.html").exists() else ""
    stale = {
        "Summer 2026 internships": "availability window is stale",
        "Simulation hours": "unverified vanity metric should not be public",
        "Years engineering": "unverified vanity metric should not be public",
    }
    for needle, reason in stale.items():
        if needle in index:
            errors.append(f"index.html: {reason}: {needle!r}")

    if errors:
        print(f"Portfolio validation FAILED with {len(errors)} issue(s):")
        for error in errors:
            print(f" - {error}")
        return 1

    print(f"Portfolio validation PASS: {len(pages)} HTML pages checked; local links and metadata resolved.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
