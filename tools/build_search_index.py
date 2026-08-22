#!/usr/bin/env python3
"""Build the full-text half of the command-palette index.

The palette used to search 28 hand-written titles and tags, so a reviewer
typing a term that actually appears in the work — "Kalman", "damage
tolerance", "CRC", "Monte Carlo" — got nothing. This walks the rendered pages
and indexes them at section granularity, so a hit deep-links to the section
that contains it rather than to the top of the page.

    python tools/build_search_index.py           # write assets/data/search-text.json
    python tools/build_search_index.py --check   # fail if that file is stale

Curated navigation entries stay hand-maintained in search-index.json; this
file is generated and should never be edited by hand.
"""
from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "data" / "search-text.json"

# Chrome repeats on every page, so indexing it would make every query match
# every page. Section text is what carries meaning.
SKIP_TAGS = {"script", "style", "svg", "canvas", "noscript", "template", "nav", "footer"}
# Ordinal badges and breadcrumbs are navigation furniture inside the content
# flow: "02" is not part of the heading, and "Home / About" matches everything.
SKIP_CLASSES = ("num", "crumbs", "eyebrow", "sr-only", "visually-hidden")
# Every tag boundary separates words except true inline emphasis, which sits
# mid-word often enough that splitting it would break phrase matches.
INLINE_TAGS = {"b", "i", "em", "strong", "sup", "sub", "code", "abbr", "a", "kbd", "mark", "u", "s"}
MIN_SECTION_CHARS = 40


class SectionParser(HTMLParser):
    """Split a page into (anchor, heading, text) triples.

    A <section id> or <article id> opens a bucket that closes at its matching
    end tag, so text never leaks into the wrong section. Anything outside every
    such element — a hero, an intro — collects in a page-level bucket. Ids on
    these pages are the same anchors the table of contents uses, so a search
    result and a ToC click land in the same place.
    """

    SECTION_TAGS = {"section", "article"}
    VOID_TAGS = {
        "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.skip_depth = 0
        self.furniture_depth = 0
        self.furniture_tag: str | None = None
        self.depth = 0
        self.stack: list[dict] = []
        self.sections: list[dict] = []
        self.page_bucket = {"anchor": "", "heading": "", "parts": []}
        self.in_heading = False
        self.title = ""
        self.in_title = False

    @property
    def current(self) -> dict:
        return self.stack[-1]["section"] if self.stack else self.page_bucket

    def handle_startendtag(self, tag: str, attrs: list) -> None:
        self.handle_starttag(tag, attrs)  # self-closing: never opens a scope

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag in SKIP_TAGS:
            self.skip_depth += 1
            return
        if self.skip_depth:
            return
        attr = dict(attrs)
        if tag == "title":
            self.in_title = True
            return
        if self.furniture_depth:
            if tag == self.furniture_tag and tag not in self.VOID_TAGS:
                self.furniture_depth += 1
            return
        if any(name in SKIP_CLASSES for name in attr.get("class", "").split()):
            if tag not in self.VOID_TAGS:
                self.furniture_depth = 1
                self.furniture_tag = tag
            return

        if tag not in self.VOID_TAGS:
            self.depth += 1
        if tag in self.SECTION_TAGS and attr.get("id"):
            section = {"anchor": attr["id"], "heading": "", "parts": []}
            self.sections.append(section)
            self.stack.append({"depth": self.depth, "tag": tag, "section": section})
        if tag in {"h1", "h2", "h3"} and not self.current["heading"]:
            self.in_heading = True
        if tag not in INLINE_TAGS:
            self.current["parts"].append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag in SKIP_TAGS:
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if tag == "title":
            self.in_title = False
            return
        if self.skip_depth:
            return
        if self.furniture_depth:
            if tag == self.furniture_tag:
                self.furniture_depth -= 1
                if not self.furniture_depth:
                    self.furniture_tag = None
            return
        if tag in {"h1", "h2", "h3"}:
            self.in_heading = False
        if tag not in INLINE_TAGS:
            self.current["parts"].append(" ")
        if self.stack and self.stack[-1]["tag"] == tag and self.stack[-1]["depth"] == self.depth:
            self.stack.pop()
        if tag not in self.VOID_TAGS:
            self.depth = max(0, self.depth - 1)

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title += data
            return
        if self.skip_depth or self.furniture_depth:
            return
        if self.in_heading:
            self.current["heading"] += data
        self.current["parts"].append(data)


def squeeze(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def page_label(title: str) -> str:
    """"GHOST-X: ... | Vinayak Manoj Nair" -> "GHOST-X: ..."."""
    return squeeze(title.split("|")[0])


def build() -> list[dict]:
    entries: list[dict] = []
    for page in sorted(ROOT.rglob("*.html")):
        if page.name.endswith(".src.html"):
            continue
        raw = page.read_text(encoding="utf-8")
        if 'http-equiv="refresh"' in raw:
            continue  # redirect stub: no content of its own
        parser = SectionParser()
        parser.feed(raw)
        label = page_label(parser.title)
        rel = page.relative_to(ROOT).as_posix()

        buckets = [parser.page_bucket] + parser.sections
        for bucket in buckets:
            text = squeeze("".join(bucket["parts"]))
            heading = squeeze(bucket["heading"])
            if heading and text.startswith(heading):
                text = text[len(heading):].strip()
            if len(text) < MIN_SECTION_CHARS:
                continue
            anchor = bucket["anchor"]
            entries.append({
                "h": rel + ("#" + anchor if anchor else ""),
                "p": label,
                "s": heading or (anchor.replace("-", " ").title() if anchor else label),
                "x": text,
            })
    return entries


def build_tools() -> list[dict]:
    """Turn the skills-page tool tiles into palette entries.

    "Abaqus" and "Onshape" appear on the site only inside long page-level prose,
    so a full-text hit for either ranked below anything more focused. The tiles
    already carry a name, a one-line use and the projects that used it, and they
    already deep-link through ?tool=, so index that directly.
    """
    skills = ROOT / "skills.html"
    if not skills.exists():
        return []
    match = re.search(
        r'<script type="application/json" id="skill-data">(.*?)</script>',
        skills.read_text(encoding="utf-8"), re.S,
    )
    if not match:
        return []
    data = json.loads(match.group(1))
    tools = []
    for slug, tool in data.items():
        where = ", ".join(item["t"] for item in tool.get("where", []))
        tools.append({
            "title": tool["name"],
            "subtitle": (tool.get("what", "") + (" Used on: " + where if where else "")).strip(),
            "href": "skills.html?tool=" + slug,
            "kind": "Tool",
            "tags": [slug, tool["name"].lower()] + [item["t"].lower() for item in tool.get("where", [])],
        })
    return sorted(tools, key=lambda t: t["title"].lower())


def main() -> int:
    document = {"sections": build(), "tools": build_tools()}
    payload = json.dumps(document, ensure_ascii=False, separators=(",", ":")) + "\n"
    entries = document["sections"]
    if "--check" in sys.argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != payload:
            print(f"{OUT.relative_to(ROOT)} is stale: run python tools/build_search_index.py")
            return 1
        print(f"search text index current: {len(entries)} sections")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(payload, encoding="utf-8")
    size = len(payload.encode("utf-8")) / 1024
    print(f"{OUT.relative_to(ROOT)}: {len(entries)} sections, "
          f"{len(document['tools'])} tools, {size:.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
