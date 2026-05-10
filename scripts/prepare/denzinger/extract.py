#!/usr/bin/env python3
"""
Extract `Denzinger, Enchiridion Symbolorum` (JesusMarie.com PDF, 770 pages)
into per-entry JSON.

Input  : scripts/data-sources/denzinger/source.pdf
Output :
  static/data/denzinger/structure.json    — {parts: [{slug, title, range}], entries_index: {n: {title, part_slug}}}
  static/data/denzinger/entries/<n>.json  — one file per entry

The PDF body is pdftotext-extractable (text layer, no OCR). Each entry
follows the pattern:

    [optional context lines: pope name, document title]
    [title text]              ← the brief gloss
    <number>                  ← the DH number alone on a line
    [body paragraphs]

Section headers like "PREMIERE PARTIE / SYMBOLES DE FOI (1-76)" mark the
top-level divisions. We treat them as part boundaries.

Phase 1 scope: get every numbered entry into JSON with its title, body
HTML, and immediate document context (pope, document line). Refinements
(paragraph styling, cross-refs, finer hierarchy) are out of scope here.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent
PDF_PATH = ROOT / "scripts/data-sources/denzinger/source.pdf"
OUT_DIR = ROOT / "static/data/denzinger"
OUT_ENTRIES = OUT_DIR / "entries"

JUNK_RES = [
    re.compile(r"^\s*1000_livres_religieux_gratuits_telechargeables_sur_jesusmarie\.com\s*$"),
    re.compile(r"^\s*www\.JesusMarie\.com.*"),
    re.compile(r"^\s*denzinger - suite.*"),
    re.compile(r"^\s*télécharger le Denzinger\s*$"),
    re.compile(r"^\s*Symboles et Définitions de la Foi Catholique\s*$"),
    re.compile(r"^\s*Denzinger\s*$"),
    re.compile(r"^\s*source\s*:\s*catho\.org\s*$", re.IGNORECASE),
]

# The PDF concatenates multiple HTML pages; pdftotext reproduces each page's
# `file:///D|/.../{name}.html (N of M)2006-...` running footer. The TOC pages
# are 01denzinger.html and 02-08denzinger_suite[1-7].html — body pages are
# named like 10denzinger_numero_1_a_numero_63.html, 11denzinger_numero_64_…,
# etc. Detecting the page-name lets us ignore stray pure-digit lines (dates,
# page wraps) inside the TOC.
PAGE_FOOTER_RE = re.compile(r"file:///[^\s]+/(\w+denzinger[^\s]*)\.html")
BODY_PAGE_RE = re.compile(r"^\d+denzinger_numero_", re.IGNORECASE)

PART_HEADERS = {
    "PREMIERE PARTIE": "1-symboles-de-foi",
    "DEUXIEME PARTIE": "2-magistere-de-leglise",
    "TROISIEME PARTIE": "3-tables",
}

PART_TITLES = {
    "1-symboles-de-foi": "Symboles de Foi",
    "2-magistere-de-leglise": "Documents du Magistère de l’Église",
    "3-tables": "Tables et appendices",
}


def pdftotext(pdf: Path) -> str:
    proc = subprocess.run(
        ["pdftotext", "-nopgbrk", str(pdf), "-"],
        capture_output=True,
        check=True,
    )
    return proc.stdout.decode("utf-8")


def is_junk(line: str) -> bool:
    return any(rx.match(line) for rx in JUNK_RES)


def looks_like_number(line: str) -> int | None:
    """A line that's a pure entry-number marker. Allow leading space."""
    s = line.strip()
    if not s.isdigit():
        return None
    n = int(s)
    # Reasonable DH range guard.
    if n < 1 or n > 5500:
        return None
    return n


def normalize_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def html_escape(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_ENTRIES.mkdir(parents=True, exist_ok=True)

    raw = pdftotext(PDF_PATH)
    # Page footers (`file:///D|/.../{name}.html (N of M)…`) appear at the
    # BOTTOM of each PDF page, after that page's content. So the page's
    # content is everything we've seen since the previous footer; we tag
    # those buffered lines with the current footer's classification, then
    # drain the buffer.
    lines_with_meta: list[tuple[str, bool]] = []
    page_buf: list[str] = []
    seen_first_body_page = False
    for ln in raw.split("\n"):
        m = PAGE_FOOTER_RE.search(ln)
        if m:
            page_name = m.group(1)
            is_body = bool(BODY_PAGE_RE.match(page_name))
            if is_body:
                seen_first_body_page = True
            for buf_line in page_buf:
                if is_junk(buf_line):
                    continue
                lines_with_meta.append((buf_line, is_body))
            page_buf = []
            continue
        page_buf.append(ln)
    # Tail content past the last footer (final pages with no trailing URL):
    # treat as body iff any body page has been seen.
    for buf_line in page_buf:
        if is_junk(buf_line):
            continue
        lines_with_meta.append((buf_line, seen_first_body_page))

    lines = [ln for ln, _ in lines_with_meta]
    in_body_flags = [b for _, b in lines_with_meta]

    # Walk the stream.
    entries: dict[int, dict[str, Any]] = {}
    seen_body_section = False  # Skip the front-matter TOC: switch to true
                                # only after we encounter the first run of
                                # body content (i.e. first number-only line
                                # whose surrounding line is NOT a TOC entry
                                # of the form "<n> <title>").
    current_part = "1-symboles-de-foi"
    current_pope: str | None = None
    current_document: str | None = None
    current_number: int | None = None
    current_title_buf: list[str] = []  # lines accumulated as title (preceding the number)
    current_body: list[list[str]] = []  # paragraphs (each a list of line fragments)

    # Regex helpers.
    pope_re = re.compile(
        r"^\s*([A-ZÉÈÀÂÎÔÛÇ][A-ZÉÈÀÂÎÔÛÇ' \-IVX]{2,})\s*:\s*"
    )
    document_re = re.compile(
        r"^\s*("
        r"Lettre|Bulle|Encyclique|Constitution|Décret|Concile|Synode|"
        r"Profession|Symbole|Allocution|Bref|Brève|Décrétale|Motu proprio|"
        r"Sentence|Acte|Constitutions|Lettres|Sentences|Discours|"
        r"Décrets|Anathèmes|Canons|Profession de foi|Lettres? \(fragment"
        r")\b"
    )
    upper_section_re = re.compile(r"^\s*[A-ZÉÈÀÂÎÔÛÇ ]{6,}\s*$")

    def clean_title(buf: list[str]) -> str:
        # Drop lines that are pure parenthetical notes (origin / dating /
        # provenance asides that follow the document header).
        cleaned = [s for s in buf if not re.fullmatch(r"\(.*\)\.?", s.strip())]
        return normalize_ws(" ".join(cleaned))

    def flush_entry() -> None:
        if current_number is None:
            return
        title = clean_title(current_title_buf)
        paras = []
        for buf in current_body:
            para = normalize_ws(" ".join(buf))
            if not para:
                continue
            paras.append("<p>" + html_escape(para) + "</p>")
        body_html = "".join(paras)
        entries[current_number] = {
            "n": current_number,
            "title": title,
            "html": body_html,
            "part_slug": current_part,
            # Pope attribution from this PDF is unreliable (popes are listed
            # in multi-line blocks ahead of the entries they didn't all
            # author); deferred to phase 2 of the import. Document line is
            # the immediately-preceding "Lettre …" / "Bulle …" / etc., which
            # tracks faithfully and is kept.
            "pope": None,
            "document": current_document,
        }

    # Parse the body section. We start collecting only after the front-matter
    # TOC ends — heuristic: the TOC has lines like "<n> <title>" where the
    # number and title share a line. The body has the number on its own line.
    # So we scan: skip lines until we find a line that matches a pure-digit
    # marker AND is preceded by a non-digit-prefixed line.

    # Walk the line stream. Bookkeeping:
    #   recent_lines : a small rolling buffer of the last few non-blank
    #                  non-context lines, used to recover the title when we
    #                  hit a number marker (the title is on the line(s)
    #                  immediately preceding it).
    #   last_n       : the most recently accepted entry number — enforces
    #                  monotonicity so "13" appearing inside body or as a
    #                  wrapped date inside a pope header doesn't get picked
    #                  up after we're already at entry 800.
    #
    # A digit-only line is accepted as an entry number marker iff:
    #   - n > last_n (within the same part), OR
    #   - n is at least the part's expected starting range
    # When a marker is accepted, we treat the most recent 1-2 non-context
    # lines in `recent_lines` as the entry title.

    recent_lines: list[str] = []
    last_n = 0
    part_min_n = {
        "1-symboles-de-foi": 1,
        "2-magistere-de-leglise": 100,
        "3-tables": 4000,
    }

    def is_context_line(stripped: str) -> bool:
        if not stripped:
            return False
        if pope_re.match(stripped) and ":" in stripped:
            return True
        if document_re.match(stripped):
            return True
        # All-caps blocks of 6+ characters
        if upper_section_re.match(stripped):
            return True
        return False

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Part transition (must be exact match — the TOC line "76 DEUXIEME
        # PARTIE" carries a leading number and doesn't qualify).
        if stripped in PART_HEADERS:
            flush_entry()
            current_number = None
            current_title_buf = []
            current_body = []
            current_part = PART_HEADERS[stripped]
            current_pope = None
            current_document = None
            recent_lines = []
            last_n = part_min_n[current_part] - 1
            i += 1
            continue

        # Pure-digit line — candidate entry marker. Distinguish real
        # markers from year/date numbers that pdftotext stranded on their
        # own line (typical pattern: "29 Mai\n1537\n\n[next document
        # title]\n[real entry number]"). A real marker is followed
        # within a few lines by either body content (longish prose) or
        # another digit-only marker further along; a date is followed by
        # blanks and then a non-body header.
        def is_likely_entry_marker(idx: int) -> bool:
            this_n = int(lines[idx].strip())
            j = idx + 1
            saw_long_body_first = False
            while j < len(lines) and j < idx + 12:
                cand = lines[j].strip()
                if not cand:
                    j += 1
                    continue
                if cand.isdigit() and 1 <= int(cand) <= 5500:
                    inner = int(cand)
                    if inner < this_n:
                        # Smaller pure-digit ahead — this candidate is a
                        # date; the smaller one is the real entry.
                        return False
                    if inner > this_n and not saw_long_body_first:
                        # Two number-like lines back-to-back with no body
                        # between → both are likely dates. Take neither as
                        # marker (let the second pass evaluate the next).
                        return False
                    return True
                if is_context_line(cand):
                    j += 1
                    continue
                # Long body line → real marker.
                if len(cand) >= 40:
                    saw_long_body_first = True
                    j += 1
                    continue
                # Short text — could be a title heading or a wrapped scrap.
                # Continue scanning.
                j += 1
            return saw_long_body_first

        # Only consider digit lines as candidate entry markers when we're
        # inside a body page (filename `\d+denzinger_numero_…`). The TOC
        # pages contain stray wrapped dates that would otherwise pollute
        # the monotone last_n.
        n = looks_like_number(line)
        if n is not None and not in_body_flags[i]:
            n = None
        if n is not None and not is_likely_entry_marker(i):
            n = None
        if n is not None:
            min_n = part_min_n[current_part]
            if n > last_n and n >= min_n:
                # Accept as an entry marker.
                flush_entry()
                # Title = the last non-context line(s) above the marker,
                # iff they look like a heading (short, no sentence-ending
                # punctuation, no leading parenthesis). Sub-entries of a
                # multi-section document have no separate title.
                title_lines: list[str] = []
                for prev in reversed(recent_lines):
                    if is_context_line(prev):
                        break
                    s = prev.strip()
                    if not s:
                        break
                    if len(s) > 90:
                        break
                    if s.startswith("("):
                        break
                    # Orphan closing-paren tail of a wrapped note
                    # ("(prov..." → "...injustement de leur ministère)").
                    if s.endswith(")") and "(" not in s:
                        break
                    # Lines containing a colon are typically pope headers
                    # or session-period descriptors that snuck through.
                    if ":" in s:
                        break
                    # Body lines end with a sentence-final mark; titles
                    # almost never do.
                    if s[-1] in ".;:!?…":
                        break
                    title_lines.insert(0, s)
                    if len(title_lines) == 2:
                        break
                current_number = n
                current_title_buf = title_lines
                current_body = []
                last_n = n
                recent_lines = []
                i += 1
                continue
            # Stray digit — fall through and treat as ordinary body content
            # (it will be ignored as orphan if we're not inside an entry).

        # Pope / document context (don't track inside body either; they
        # rarely occur there, and we'd rather skip the false-positive).
        if pope_re.match(line) and ":" in stripped:
            # Update the live context only if we're between entries OR the
            # line clearly starts a new pope block (a typical "POPE NAME :
            # date" pattern). Keep older entries' pope unchanged.
            current_pope = stripped
            recent_lines.append(stripped)
            i += 1
            continue
        if document_re.match(line):
            current_document = stripped
            recent_lines.append(stripped)
            i += 1
            continue
        if upper_section_re.match(line):
            recent_lines.append(stripped)
            i += 1
            continue

        if current_number is None:
            # Awaiting a number marker — accumulate non-context lines for
            # eventual title resolution.
            if stripped:
                recent_lines.append(stripped)
                # Cap the buffer to avoid runaway memory.
                if len(recent_lines) > 12:
                    recent_lines = recent_lines[-12:]
            i += 1
            continue

        # Inside a body paragraph.
        if not stripped:
            if current_body and current_body[-1]:
                current_body.append([])
        else:
            if not current_body:
                current_body.append([])
            current_body[-1].append(stripped)
            # Also keep the running buffer fresh so the NEXT entry's title
            # can be recovered from the lines just before its marker.
            recent_lines.append(stripped)
            if len(recent_lines) > 12:
                recent_lines = recent_lines[-12:]
        i += 1

    flush_entry()

    # Build structure.json — list parts in order with the entry-range each
    # spans, plus a flat index used by the route + sidebar.
    sorted_ns = sorted(entries.keys())
    by_part: dict[str, list[int]] = {}
    for n in sorted_ns:
        by_part.setdefault(entries[n]["part_slug"], []).append(n)

    parts_struct = []
    for slug in ["1-symboles-de-foi", "2-magistere-de-leglise", "3-tables"]:
        ns = by_part.get(slug, [])
        if not ns:
            continue
        parts_struct.append({
            "slug": slug,
            "title": PART_TITLES[slug],
            "range": [ns[0], ns[-1]],
            "count": len(ns),
        })

    entries_index = {
        str(n): {
            "title": entries[n]["title"],
            "part_slug": entries[n]["part_slug"],
        }
        for n in sorted_ns
    }

    structure = {
        "corpus": "denzinger",
        "title": "Denzinger — Enchiridion Symbolorum",
        "subtitle": "Symboles et Définitions de la Foi Catholique",
        "parts": parts_struct,
        "all_numbers": sorted_ns,
    }
    with open(OUT_DIR / "structure.json", "w", encoding="utf-8") as fh:
        json.dump(structure, fh, ensure_ascii=False, indent=2)
    with open(OUT_DIR / "index.json", "w", encoding="utf-8") as fh:
        json.dump(entries_index, fh, ensure_ascii=False, separators=(",", ":"))

    for n in sorted_ns:
        with open(OUT_ENTRIES / f"{n}.json", "w", encoding="utf-8") as fh:
            json.dump(entries[n], fh, ensure_ascii=False, indent=2)

    print(f"wrote {len(sorted_ns)} entries across {len(parts_struct)} parts")
    print(f"  range: {sorted_ns[0]}–{sorted_ns[-1]}")
    for p in parts_struct:
        print(f"  {p['slug']}: {p['count']} entries ({p['range'][0]}–{p['range'][1]})")


if __name__ == "__main__":
    main()
