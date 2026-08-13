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
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
SKIP_SCHEMES = {"http", "https", "mailto", "tel", "data", "javascript"}
# HTML used as an asset-generation source is not a navigable site page. We still
# parse its local links and JSON-LD, but do not require SEO/page metadata.
NON_PUBLIC_HTML = {Path("assets/og-image.src.html")}
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
        self.ids: list[str] = []
        self.h1_count = 0
        self.images_without_alt: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {k.lower(): (v or "") for k, v in attrs}
        if tag.lower() == "title":
            self.in_title = True
        if tag.lower() == "h1":
            self.h1_count += 1
        if values.get("id"):
            self.ids.append(values["id"])
        if tag.lower() == "img" and "alt" not in values:
            self.images_without_alt.append(values.get("src", "<inline image>"))
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
    except Exception as exc:
        return [f"{page.relative_to(ROOT)}: cannot parse: {exc}"]

    rel = page.relative_to(ROOT)
    is_public_page = rel not in NON_PUBLIC_HTML
    if is_public_page and not parser.title.strip():
        errors.append(f"{rel}: missing <title>")
    if is_public_page and page.name != "404.html":
        if not parser.meta_description:
            errors.append(f"{rel}: missing meta description")
        if not parser.canonical:
            errors.append(f"{rel}: missing canonical URL")
    if is_public_page and parser.h1_count != 1:
        errors.append(f"{rel}: expected exactly one <h1>, found {parser.h1_count}")
    if len(parser.ids) != len(set(parser.ids)):
        duplicates = sorted({value for value in parser.ids if parser.ids.count(value) > 1})
        errors.append(f"{rel}: duplicate id(s): {', '.join(duplicates)}")
    for source in parser.images_without_alt:
        errors.append(f"{rel}: image missing alt attribute: {source}")

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


def check_fragments(page: Path, id_cache: dict[Path, set[str]]) -> list[str]:
    """Verify same-page and cross-page fragment links resolve to a real id."""
    errors: list[str] = []
    parser = PageParser()
    parser.feed(page.read_text(encoding="utf-8"))
    rel = page.relative_to(ROOT)

    for attr, raw in parser.links:
        if attr != "href":
            continue
        split = urlsplit(raw)
        if not split.fragment or split.scheme.lower() in SKIP_SCHEMES or split.netloc:
            continue
        target = page if not split.path else resolve_local(page, raw)
        if target is None or not target.exists() or target.suffix.lower() != ".html":
            continue
        target = target.resolve()
        if target not in id_cache:
            target_parser = PageParser()
            target_parser.feed(target.read_text(encoding="utf-8"))
            id_cache[target] = set(target_parser.ids)
        fragment = unquote(split.fragment)
        if fragment not in id_cache[target]:
            errors.append(f"{rel}: broken fragment target: {raw}")
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


def check_webp_integrity(path: Path) -> list[str]:
    """Reject truncated RIFF/WebP files before browsers fail on them silently."""
    try:
        data = path.read_bytes()
    except OSError as exc:
        return [f"{path.relative_to(ROOT)}: cannot read WebP: {exc}"]
    if len(data) < 12 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return [f"{path.relative_to(ROOT)}: invalid WebP RIFF header"]
    declared_total = struct.unpack("<I", data[4:8])[0] + 8
    if declared_total != len(data):
        return [
            f"{path.relative_to(ROOT)}: truncated WebP "
            f"(RIFF declares {declared_total} bytes, file has {len(data)})"
        ]
    return []


def main() -> int:
    errors: list[str] = []
    for required in REQUIRED_ROOT_FILES:
        if not required.exists():
            errors.append(f"missing required portfolio asset: {required.relative_to(ROOT)}")

    pages = sorted(ROOT.rglob("*.html"))
    if not pages:
        errors.append("no HTML pages found")
    id_cache: dict[Path, set[str]] = {}
    for page in pages:
        errors.extend(check_html(page))
        errors.extend(check_json_ld(page))
    for page in pages:
        errors.extend(check_fragments(page, id_cache))
    referenced_webps: set[Path] = set()
    for page in pages:
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))
        for attr, raw in parser.links:
            if attr != "src" or not urlsplit(raw).path.lower().endswith(".webp"):
                continue
            target = resolve_local(page, raw)
            if target is not None and target.exists():
                referenced_webps.add(target)
    for webp in sorted(referenced_webps):
        errors.extend(check_webp_integrity(webp))

    # Presentation regressions that should not quietly return to the homepage.
    index = (ROOT / "index.html").read_text(encoding="utf-8") if (ROOT / "index.html").exists() else ""
    stale = {
        "Summer 2026 internships": "availability window is stale",
        "Simulation hours": "unverified vanity metric should not be public",
        "Years engineering": "unverified vanity metric should not be public",
    }
    for needle, reason in stale.items():
        if needle in index:
            errors.append(f"index.html: {reason}: {needle!r}")

    # Recruiting facts and project labels are repeated across several pages.
    # Keep one stale occurrence from silently surviving a content refresh.
    public_text = "\n".join(
        page.read_text(encoding="utf-8")
        for page in pages
        if page.relative_to(ROOT) not in NON_PUBLIC_HTML
    )
    banned_sitewide = {
        "linkedin.com/in/Vin2005": "obsolete LinkedIn profile",
        "Fall 2026": "stale availability window",
        "Spring 2027": "stale availability window",
        "full-time roles": "stale availability window",
        "Open to opportunities": "stale availability claim",
        "+0.078 MS": "obsolete AeroFrame headline margin",
        "16/18 formal requirements": "obsolete AeroFrame requirement count",
        "16 / 18 formal requirements": "obsolete AeroFrame requirement count",
        ">AstraSim-FSW<": "obsolete project display name",
        ">AeroFrame-MD11<": "obsolete project display name",
        ">GHOST<": "obsolete project display name",
        "AeroFrame-MD11": "obsolete project display name",
        "GHOST case study": "obsolete project display name",
    }
    for needle, reason in banned_sitewide.items():
        if needle.lower() in public_text.lower():
            errors.append(f"sitewide: {reason}: {needle!r}")

    # Evidence-first pages must keep the inspected artifacts and their stated
    # boundaries attached to the public presentation.
    required_evidence = [
        ROOT / "assets" / "evidence" / "ghost" / "estimator-rmse.png",
        ROOT / "assets" / "evidence" / "astra" / "architecture.svg",
        ROOT / "assets" / "evidence" / "aeroframe" / "fe-response.png",
        ROOT / "assets" / "evidence" / "f16" / "monte-carlo-altitude.png",
        ROOT / "projects" / "f16-flight-controls.html",
    ]
    for evidence in required_evidence:
        if not evidence.exists():
            errors.append(f"missing evidence-first artifact: {evidence.relative_to(ROOT)}")

    project_index = (ROOT / "projects.html").read_text(encoding="utf-8")
    evidence_checks = {
        "Rocket prototype boundary": "Exploratory prototype" in project_index,
        "AeroFrame current margin": "+0.151" in project_index,
        "AeroFrame current requirements": "18/18" in project_index,
        "F16 representative boundary": "Representative SIL" in project_index,
    }
    for label, ok in evidence_checks.items():
        if not ok:
            errors.append(f"projects.html: missing evidence boundary: {label}")

    if errors:
        print(f"Portfolio validation FAILED with {len(errors)} issue(s):")
        for error in errors:
            print(f" - {error}")
        return 1

    public_count = sum(1 for p in pages if p.relative_to(ROOT) not in NON_PUBLIC_HTML)
    print(
        "Portfolio validation PASS: "
        f"{public_count} public HTML pages checked; local links, assets, metadata and JSON-LD resolved."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
