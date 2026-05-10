#!/usr/bin/env python3
"""
Extract `Denzinger, Enchiridion Symbolorum` (édition française, 37e édition,
JesusMarie / Ictus 3) from catho.org into hierarchical reading units.

The body pages of catho.org expose a clean structure:

  <h1> ... </h1>     — section / sub-section / pope-block headings
  <h2> ... </h2>     — document title (Lettre, Bulle, Encyclique, …)
  <a name=…><b>N</b> — entry marker; body follows until next <a name=…>

We walk every body page in order, infer a level for each <h1>, maintain a
level-managed stack of headings (the breadcrumb path), and group entries
into "reading units" identified by their position in that stack. Each
reading unit becomes one page of the site; entries within a unit are
rendered inline with their <h2> document headings as sub-dividers.

Output:
  static/data/denzinger/structure.json   — hierarchy of reading units
  static/data/denzinger/units/{slug}.json — full unit (entries + bodies)
  static/data/denzinger/index.json       — {n: {slug, …}} for permalinks

Cache: scripts/data-sources/denzinger/cache/. Re-runs are offline.
"""

from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent
CACHE_DIR = ROOT / "scripts/data-sources/denzinger/cache"
OUT_DIR = ROOT / "static/data/denzinger"
OUT_UNITS = OUT_DIR / "units"

BASE_URL = "http://catho.org/9.php?d="
TOC_KEY = "g0"
USER_AGENT = (
    "catechismecatholique.fr/denzinger-import (one-time, contact: "
    "janvier.sabates@gmail.com)"
)


# ─── Fetch + cache ──────────────────────────────────────────────────────────


def fetch_cached(key: str) -> str:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cached = CACHE_DIR / f"{key}.html"
    if cached.exists():
        return cached.read_bytes().decode("iso-8859-1")
    url = BASE_URL + key
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    cached.write_bytes(raw)
    time.sleep(1.5)
    return raw.decode("iso-8859-1")


# ─── Heading-level inference ────────────────────────────────────────────────


PART_TITLES = {
    "PREMIERE PARTIE": "Première partie",
    "DEUXIEME PARTIE": "Deuxième partie",
    "TROISIEME PARTIE": "Troisième partie",
    "QUATRIEME PARTIE": "Quatrième partie",
}
PART_SLUGS = {
    "PREMIERE PARTIE": "1-symboles-de-foi",
    "DEUXIEME PARTIE": "2-magistere-de-leglise",
    "TROISIEME PARTIE": "3-tables",
    "QUATRIEME PARTIE": "4-quatrieme",
}

# Heading levels (lower = wider scope; pushing a heading at level L pops
# all stack items at level >= L). Tuned for the catho.org structure:
#   1: PARTIE (PREMIERE/DEUXIEME/…)
#   2: Range subtitle "ALL_CAPS (n-m)"
#   3: All-caps section without range / numeric prefix
#   4: Roman-numeral-prefixed sub-section ("I. …", "II. …")
#   5: Letter-prefixed sub-section ("A- …", "B. …")
#   6: Pope block "NAME : YEAR-…"
#   7: Mixed-case named section ("Symbole des Apôtres", "Symboles Locaux")
LEVEL_PART = 1
LEVEL_PARTSUB = 2
LEVEL_BIGSEC = 3
LEVEL_ROMAN = 4
LEVEL_ALPHA = 5
LEVEL_POPE = 6
LEVEL_NAMED = 7

POPE_RE = re.compile(r"^[A-ZÉÈÀÂÎÔÛÇ][A-ZÉÈÀÂÎÔÛÇ' \-IVX0-9]*\s*:\s*.*\d")


def detect_level(text: str) -> int:
    s = text.strip()
    if s in PART_TITLES:
        return LEVEL_PART
    if re.search(r"\(\s*\d+\s*[-–—]\s*\d+", s):
        return LEVEL_PARTSUB
    if POPE_RE.match(s) and ":" in s:
        return LEVEL_POPE
    if re.match(r"^[IVXLCDM]+\.\s", s):
        return LEVEL_ROMAN
    if re.match(r"^[A-Z][\.\-]\s", s):
        return LEVEL_ALPHA
    if re.match(r"^[A-ZÉÈÀÂÎÔÛÇ \-]+$", s) and len(s) >= 4:
        # ALL_CAPS without numeric prefix → big section (e.g. SYMBOLES
        # STRUCTURES, FORMULES OCCIDENTALES).
        return LEVEL_BIGSEC
    return LEVEL_NAMED


# ─── Body page walker ───────────────────────────────────────────────────────


def slugify(s: str, max_len: int = 60) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-zA-Z0-9 ]+", " ", s).lower().strip()
    s = re.sub(r"\s+", "-", s)
    return s[:max_len] or "section"


def normalize_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def clean_entry_body(html: str) -> str:
    """Tidy an entry's raw segment into clean paragraph HTML.

    Truncate at the page footer / nav block. Drop icon links. Collapse
    `<br><br>` into paragraph breaks. Strip catho.org's internal `9.php`
    cross-refs (we re-link to our own permalinks elsewhere).
    """
    cut_re = re.compile(
        r"<a\s+name\s*=\s*\"?vers\"?|<table[^>]*bgcolor=#3366cc",
        flags=re.IGNORECASE,
    )
    m = cut_re.search(html)
    if m:
        html = html[: m.start()]
    html = re.sub(r"<a [^>]*><img [^>]*></a>", "", html, flags=re.IGNORECASE)
    html = re.sub(
        r"<a\s+href=[^>]*9\.php[^>]*>([^<]*)</a>",
        r"\1",
        html,
        flags=re.IGNORECASE,
    )
    html = re.sub(r"<a\s+href=[^>]*>", "", html, flags=re.IGNORECASE)
    html = re.sub(r"</a>", "", html, flags=re.IGNORECASE)
    html = re.sub(r"(?:\s*<br\s*/?>\s*){2,}", "</p><p>", html, flags=re.IGNORECASE)
    html = re.sub(r"<center>.*?</center>", "", html, flags=re.IGNORECASE | re.DOTALL)
    html = "<p>" + html + "</p>"
    html = re.sub(r"<p>\s*</p>", "", html)
    html = re.sub(r"\s+", " ", html).strip()
    html = re.sub(r"<a\s+(?:name|Name)\s*=\s*\"?[^\">]+\"?\s*>", "", html)
    return html


# Event = ('h1', text) | ('h2', text) | ('entry', n, anchor, body_html)


def parse_body_page(html: str) -> list[tuple]:
    """Stream events from one body page in document order."""
    m = re.search(r"<body[^>]*>(.*)</body>", html, flags=re.DOTALL | re.IGNORECASE)
    body = m.group(1) if m else html

    # Build a positional event list by scanning for our three markers.
    events: list[tuple] = []
    pattern = re.compile(
        r"<h1[^>]*>(?P<h1>.*?)</h1>"
        r"|<h2[^>]*>(?P<h2>.*?)</h2>"
        r"|<a\s+(?:name|Name)\s*=\s*\"?(?P<anchor>[A-Za-z0-9_]+)\"?\s*>\s*<b>\s*(?P<n>\d+)\s*</b>",
        flags=re.IGNORECASE | re.DOTALL,
    )
    matches = list(pattern.finditer(body))
    for i, m in enumerate(matches):
        if m.group("h1") is not None:
            text = normalize_ws(re.sub(r"<[^>]+>", "", m.group("h1")))
            if text:
                events.append(("h1", text))
        elif m.group("h2") is not None:
            text = normalize_ws(re.sub(r"<[^>]+>", "", m.group("h2")))
            if text:
                events.append(("h2", text))
        elif m.group("anchor") is not None:
            anchor = m.group("anchor")
            n = int(m.group("n"))
            # Body for this entry runs until the next anchor / h1 / h2
            # match — i.e. the NEXT match in our list.
            body_start = m.end()
            body_end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
            entry_html = body[body_start:body_end]
            events.append(("entry", n, anchor, clean_entry_body(entry_html)))
    return events


# ─── Driver: walk all body pages, build reading units ──────────────────────


def discover_body_pages(toc_html: str) -> list[str]:
    pages: list[str] = []
    seen: set[str] = set()
    for m in re.finditer(r"9\.php\?d=([a-z0-9]+)#", toc_html):
        k = m.group(1)
        if k not in seen:
            seen.add(k)
            pages.append(k)
    return pages


_MONTHS_LOWER = [
    "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
    "septembre", "octobre", "novembre", "décembre",
    "févr", "juill", "sept", "oct", "nov", "déc",
]
_MONTHS_ALT = "|".join(_MONTHS_LOWER + [m.capitalize() for m in _MONTHS_LOWER])
CONTINUATION_PREFIX_RE = re.compile(
    rf"^(?:[a-z0-9\-:\(]"
    rf"|[IVX]+\s*[:.]"  # pope-ordinal continuation: "II : 22 septembre"
    rf"|(?:{_MONTHS_ALT})\b)"
)


def merge_wrapped_h1(events: list[tuple]) -> list[tuple]:
    """The source wraps long h1s onto a second h1 ("II. Schéma bipartite"
    / "trinitaire-christologique." or "PIE IV : 25" / "Décembre 1559-9
    décem"). Merge a continuation that doesn't look like a fresh
    standalone heading into the previous one. Heuristic: continuation
    starts with lowercase, a digit, a leading colon/paren, or a French
    month name."""
    out: list[tuple] = []
    for ev in events:
        if (
            ev[0] == "h1"
            and out
            and out[-1][0] == "h1"
            and CONTINUATION_PREFIX_RE.match(ev[1])
        ):
            out[-1] = ("h1", out[-1][1] + " " + ev[1])
            continue
        out.append(ev)
    return out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_UNITS.mkdir(parents=True, exist_ok=True)

    print("fetching TOC for body-page discovery…")
    toc_html = fetch_cached(TOC_KEY)
    pages = discover_body_pages(toc_html)
    # Use only pages explicitly linked from the French TOC. (Probing past
    # the last linked page surfaces the Latin edition pages — bxj+ — that
    # restate the same entries with Latin text and the same anchor names,
    # which would otherwise overwrite our French entries.)
    print(f"  {len(pages)} body pages (TOC-linked)")

    # Build a single global event stream from all pages.
    print("parsing body pages…")
    all_events: list[tuple] = []
    for k in pages:
        html = fetch_cached(k)
        events = parse_body_page(html)
        events = merge_wrapped_h1(events)
        all_events.extend(events)
    print(f"  {len(all_events)} events")

    # Walk the stream, maintain h1 stack, group entries into reading units.
    print("building reading units…")
    stack: list[tuple[int, str]] = []  # (level, text)
    current_h2: str | None = None
    units: list[dict[str, Any]] = []
    current_unit: dict[str, Any] | None = None
    n_to_unit: dict[int, str] = {}
    unit_slug_seen: dict[str, int] = {}

    def stack_key() -> tuple:
        return tuple(t for _, t in stack)

    def open_unit_if_needed() -> None:
        nonlocal current_unit
        if current_unit is None:
            return
        # noop; each entry checks via path comparison
        pass

    def make_unit_slug(path: list[str]) -> str:
        # Use the LAST item in the path (the deepest section / pope) as
        # the human-readable slug. Disambiguate by appending "-N" on
        # collisions.
        base = slugify(path[-1]) if path else "unknown"
        n = unit_slug_seen.get(base, 0)
        unit_slug_seen[base] = n + 1
        return base if n == 0 else f"{base}-{n + 1}"

    def push_h1(text: str) -> None:
        level = detect_level(text)
        while stack and stack[-1][0] >= level:
            stack.pop()
        stack.append((level, text))

    last_unit_path: tuple = ()
    for ev in all_events:
        if ev[0] == "h1":
            push_h1(ev[1])
            current_h2 = None
            continue
        if ev[0] == "h2":
            current_h2 = ev[1]
            continue
        if ev[0] == "entry":
            n, anchor, body_html = ev[1], ev[2], ev[3]
            path = stack_key()
            if path != last_unit_path:
                # Open a new unit.
                path_list = list(path)
                slug = make_unit_slug(path_list)
                # Determine the part this unit belongs to: the LEVEL_PART
                # entry in the stack, if any.
                part_text = next(
                    (t for lvl, t in stack if lvl == LEVEL_PART), None
                )
                part_slug = PART_SLUGS.get(part_text or "", None)
                part_title = PART_TITLES.get(part_text or "", None)
                current_unit = {
                    "slug": slug,
                    "title": path_list[-1] if path_list else "",
                    "breadcrumb": path_list,
                    "part_slug": part_slug,
                    "part_title": part_title,
                    "entries": [],
                }
                units.append(current_unit)
                last_unit_path = path
            assert current_unit is not None
            current_unit["entries"].append(
                {
                    "n": n,
                    "anchor": anchor,
                    "html": body_html,
                    "document": current_h2,
                }
            )
            n_to_unit[n] = current_unit["slug"]
            current_h2 = None  # clear so each entry's doc is set explicitly
    # Actually reset of current_h2 is wrong — h2 applies to the FOLLOWING
    # entries until another h2 appears. Recompute by re-walking:
    # (the cheap fix above was wrong; do a second pass.)
    units = []
    current_unit = None
    n_to_unit = {}
    unit_slug_seen = {}
    stack = []
    current_h2 = None
    last_unit_path = ()
    for ev in all_events:
        if ev[0] == "h1":
            push_h1(ev[1])
            continue
        if ev[0] == "h2":
            current_h2 = ev[1]
            continue
        if ev[0] == "entry":
            n, anchor, body_html = ev[1], ev[2], ev[3]
            path = stack_key()
            if path != last_unit_path:
                path_list = list(path)
                slug = make_unit_slug(path_list)
                part_text = next(
                    (t for lvl, t in stack if lvl == LEVEL_PART), None
                )
                part_slug = PART_SLUGS.get(part_text or "", None)
                part_title = PART_TITLES.get(part_text or "", None)
                current_unit = {
                    "slug": slug,
                    "title": path_list[-1] if path_list else "",
                    "breadcrumb": path_list,
                    "part_slug": part_slug,
                    "part_title": part_title,
                    "entries": [],
                }
                units.append(current_unit)
                last_unit_path = path
            assert current_unit is not None
            current_unit["entries"].append(
                {
                    "n": n,
                    "anchor": anchor,
                    "html": body_html,
                    "document": current_h2,
                }
            )
            n_to_unit[n] = current_unit["slug"]
    print(f"  {len(units)} reading units, {sum(len(u['entries']) for u in units)} entries")

    # Write per-unit JSON. Add prev/next for in-part navigation.
    print("writing units…")
    for i, u in enumerate(units):
        prev_u = next(
            (units[j] for j in range(i - 1, -1, -1) if units[j]["part_slug"] == u["part_slug"]),
            None,
        )
        next_u = next(
            (units[j] for j in range(i + 1, len(units)) if units[j]["part_slug"] == u["part_slug"]),
            None,
        )
        u["prev"] = (
            {"slug": prev_u["slug"], "title": prev_u["title"]} if prev_u else None
        )
        u["next"] = (
            {"slug": next_u["slug"], "title": next_u["title"]} if next_u else None
        )
        with open(OUT_UNITS / f"{u['slug']}.json", "w", encoding="utf-8") as fh:
            json.dump(u, fh, ensure_ascii=False, indent=2)

    # Build a hierarchical structure (tree) of units by part. Each part
    # contains the units in document order with their breadcrumb depth so
    # the sommaire can render a nested outline.
    print("writing structure + index…")
    parts_struct: list[dict[str, Any]] = []
    by_part: dict[str, list[dict[str, Any]]] = {}
    for u in units:
        if not u["part_slug"]:
            continue
        by_part.setdefault(u["part_slug"], []).append(
            {
                "slug": u["slug"],
                "title": u["title"],
                "breadcrumb": u["breadcrumb"],
                "entry_count": len(u["entries"]),
                "first_n": u["entries"][0]["n"] if u["entries"] else None,
                "last_n": u["entries"][-1]["n"] if u["entries"] else None,
            }
        )
    for slug in ["1-symboles-de-foi", "2-magistere-de-leglise", "3-tables", "4-quatrieme"]:
        units_in_part = by_part.get(slug, [])
        if not units_in_part:
            continue
        title = next(
            (PART_TITLES[k] for k, v in PART_SLUGS.items() if v == slug), slug
        )
        parts_struct.append(
            {
                "slug": slug,
                "title": title,
                "units": units_in_part,
                "unit_count": len(units_in_part),
                "entry_count": sum(u["entry_count"] for u in units_in_part),
                "first_n": units_in_part[0]["first_n"],
                "last_n": units_in_part[-1]["last_n"],
            }
        )

    structure = {
        "corpus": "denzinger",
        "title": "Denzinger — Enchiridion Symbolorum",
        "subtitle": "Symboles et définitions de la Foi catholique (37e édition)",
        "parts": parts_struct,
        "all_numbers": sorted(n_to_unit.keys()),
        "total_entries": sum(len(u["entries"]) for u in units),
        "total_units": len(units),
    }
    with open(OUT_DIR / "structure.json", "w", encoding="utf-8") as fh:
        json.dump(structure, fh, ensure_ascii=False, indent=2)

    index = {
        str(n): {"unit_slug": slug}
        for n, slug in n_to_unit.items()
    }
    with open(OUT_DIR / "index.json", "w", encoding="utf-8") as fh:
        json.dump(index, fh, ensure_ascii=False, separators=(",", ":"))

    print(f"done: {len(units)} units, {len(n_to_unit)} entries indexed")
    # Print a sample histogram of unit sizes.
    sizes = sorted(len(u["entries"]) for u in units)
    print(f"  unit-size: min={sizes[0]} median={sizes[len(sizes)//2]} max={sizes[-1]}")


if __name__ == "__main__":
    main()
