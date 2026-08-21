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
import os
import sys

ROOT = Path(__file__).resolve().parents[1]
SKIP_SCHEMES = {"http", "https", "mailto", "tel", "data", "javascript"}
# Canonical and social metadata are absolute, and must stay on this origin.
SITE_ORIGIN = "https://vinnair.me/"
# HTML used as an asset-generation source is not a navigable site page. We still
# parse its local links and JSON-LD, but do not require SEO/page metadata.
# Any *.src.html is a render source for tools/render_og.js, never a page.
NON_PUBLIC_HTML = {path.relative_to(ROOT) for path in ROOT.rglob("*.src.html")}
# Redirect stubs carry no content of their own, so page-level SEO and
# heading rules do not apply to them.
REDIRECT_STUBS = {Path("projects/md11-structures.html")}
REQUIRED_ROOT_FILES = [
    ROOT / "index.html",
    ROOT / "projects.html",
    ROOT / "assets" / "headshot.png",
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
    is_public_page = rel not in NON_PUBLIC_HTML and rel not in REDIRECT_STUBS
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


def check_og_image(path: Path) -> list[str]:
    """Keep the social card valid and synchronized with its declared metadata."""
    try:
        data = path.read_bytes()
    except OSError as exc:
        return [f"{path.relative_to(ROOT)}: cannot read PNG: {exc}"]
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        return [f"{path.relative_to(ROOT)}: invalid PNG header"]
    width, height = struct.unpack(">II", data[16:24])
    if (width, height) != (1200, 630):
        return [
            f"{path.relative_to(ROOT)}: expected 1200x630, found {width}x{height}"
        ]
    return []


SOCIAL_IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg"}


def check_social_images(page: Path) -> list[str]:
    """Social metadata uses absolute URLs, so the local-link pass never sees it.

    That gap let og:image point at an .svg on the MD-11 page, which every
    major scraper refuses to render, and at a raw evidence plot on two others.
    Resolve each social URL back to a repository file and check it is a raster
    a scraper will actually accept.
    """
    rel = page.relative_to(ROOT)
    if rel in NON_PUBLIC_HTML or rel in REDIRECT_STUBS:
        return []
    text = page.read_text(encoding="utf-8")
    found: dict[str, str] = {}
    for prop, pattern in (
        ("og:image", r'<meta property="og:image" content="([^"]*)"'),
        ("twitter:image", r'<meta name="twitter:image" content="([^"]*)"'),
    ):
        match = re.search(pattern, text)
        if match:
            found[prop] = match.group(1)

    errors: list[str] = []
    for prop in ("og:image", "twitter:image"):
        if prop not in found:
            errors.append(f"{rel}: missing {prop}; the link previews with no image")
    if len(found) == 2 and found["og:image"] != found["twitter:image"]:
        errors.append(f"{rel}: og:image and twitter:image disagree")

    for prop, url in found.items():
        if not url.startswith(SITE_ORIGIN):
            errors.append(f"{rel}: {prop} is not an absolute {SITE_ORIGIN} URL: {url}")
            continue
        target = ROOT / url[len(SITE_ORIGIN):]
        suffix = target.suffix.lower()
        if suffix not in SOCIAL_IMAGE_SUFFIXES:
            errors.append(
                f"{rel}: {prop} is {suffix or 'extensionless'}; scrapers need "
                + "/".join(sorted(SOCIAL_IMAGE_SUFFIXES))
            )
        elif not target.exists():
            errors.append(f"{rel}: {prop} resolves to a missing file: {target.relative_to(ROOT)}")
        elif suffix == ".png":
            errors.extend(check_og_image(target))
    return errors


def check_social_cards() -> list[str]:
    """Cards are generated, so a hand-edited manifest must not outrun them."""
    import subprocess

    script = ROOT / "tools" / "render_og.js"
    if not script.exists():
        return []
    env = dict(os.environ)
    env.setdefault("NODE_PATH", "/opt/node22/lib/node_modules")
    try:
        result = subprocess.run(
            ["node", str(script), "--check"],
            capture_output=True, text=True, env=env,
        )
    except FileNotFoundError:
        return []  # no node here; CI still covers it
    if result.returncode == 0:
        return []
    detail = (result.stderr or result.stdout).strip().splitlines()
    return ["social cards are stale: " + line for line in detail] or [
        "social cards are stale: run node tools/render_og.js"
    ]


def check_asset_version() -> list[str]:
    """A stale ?v= means returning visitors keep old CSS and JS.

    This is not hypothetical: the stylesheet changed five times in one session
    while the query string stayed fixed, so the cursor, the skill grid and the
    tool strip all shipped invisible to anyone who had visited before.
    """
    import subprocess

    result = subprocess.run(
        [sys.executable, str(ROOT / "tools" / "bump_assets.py"), "--check"],
        capture_output=True, text=True,
    )
    if result.returncode == 0:
        return []
    detail = (result.stdout or result.stderr).strip().splitlines()
    return ["asset version is stale: " + (detail[0] if detail else "run tools/bump_assets.py")]


def main() -> int:
    errors: list[str] = []
    errors.extend(check_asset_version())
    for required in REQUIRED_ROOT_FILES:
        if not required.exists():
            errors.append(f"missing required portfolio asset: {required.relative_to(ROOT)}")
    errors.extend(check_social_cards())

    pages = sorted(ROOT.rglob("*.html"))
    if not pages:
        errors.append("no HTML pages found")
    id_cache: dict[Path, set[str]] = {}
    for page in pages:
        errors.extend(check_html(page))
        errors.extend(check_json_ld(page))
        errors.extend(check_social_images(page))
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
    # A GitHub repository slug is an upstream fact, not portfolio copy: the
    # repo really is named AstraSim-FSW even though the case study is called
    # ASTRA-OS. Exclude repository names from the display-name rules below so
    # the feed can show what GitHub actually returns.
    display_name_text = re.sub(
        r'<span class="gh__name">.*?</span>', "", public_text, flags=re.DOTALL
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
        if needle.lower() in display_name_text.lower():
            errors.append(f"sitewide: {reason}: {needle!r}")

    # Keep private recruiting details off every public HTML surface.
    privacy_patterns = {
        r"\bgpa\b": "GPA should not be public",
        r"\btel:": "telephone link should not be public",
        r"(?<!\d)(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]\d{3}[ .-]\d{4}(?!\d)":
            "phone number should not be public",
        r"(?<![0-9A-Fa-f])\d{10}(?![0-9A-Fa-f])":
            "compact phone number should not be public",
    }
    for pattern, reason in privacy_patterns.items():
        # Academic GPA is intentionally checked case-sensitively so the
        # engineering pressure unit GPa does not trigger a privacy failure.
        flags = 0 if pattern == r"\bgpa\b" else re.IGNORECASE
        if re.search(pattern, public_text, flags=flags):
            errors.append(f"sitewide: {reason}")

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
    aeroframe_detail = (ROOT / "projects" / "aeroframe-dt.html").read_text(encoding="utf-8")
    evidence_checks = {
        "Rocket prototype boundary": "Exploratory prototype" in project_index,
        # Exact AeroFrame results belong on its case study, not the project index.
        "AeroFrame current margin": "+0.151" in aeroframe_detail,
        "AeroFrame current requirements": "18 / 18" in aeroframe_detail,
        "F16 representative boundary": "Representative SIL" in project_index,
    }
    for label, ok in evidence_checks.items():
        if not ok:
            errors.append(f"missing evidence boundary: {label}")

    # Two pages can quote the same broken card; report each fault once.
    errors = list(dict.fromkeys(errors))
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
