#!/usr/bin/env python3
"""Extract 'Très bref résumé de l'histoire de la Révélation divine' from the
Catéchisme de la Doctrine Chrétienne (Pie X petit, 1912) PDF.

The PDF renders small-caps via lowercase glyphs, so OCR/extract sees lowercase
where the printed page shows capitals (proper nouns, sentence starts, headings).
We fix this with:
  1. proper-noun capitalization map
  2. sentence-initial capitalization after .!?: « and at paragraph start
  3. heading detection for the Roman-numeral section titles

Output: static/data/pius-x-petit/appendices/histoire-revelation.json
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pdfplumber

PDF_PATH = (
    Path.home()
    / "Library/Mobile Documents/com~apple~CloudDocs"
    / "for-the-kingdom/DOCTRINA/sources/tradi"
    / "Catéchisme de la Doctrine Chrétienne.pdf"
)

OUT_PATH = (
    Path(__file__).resolve().parents[3]
    / "static/data/pius-x-petit/appendices/histoire-revelation.json"
)

# 0-indexed PDF pages covering the chapter
PAGE_RANGE = range(208, 223)

# Proper nouns and capitalized terms that the OCR lowercased (small-caps).
# Order matters when a shorter word is a substring of a longer one — handled
# below with word-boundary regexes.
PROPER_NOUNS = [
    # Theological / generic
    "Dieu", "Christ", "Messie", "Sauveur", "Rédempteur", "Verbe",
    "Saint-Esprit", "Esprit-Saint", "Père", "Seigneur", "Vierge",
    "Mère", "Juge", "Apôtres", "Apôtre",
    # OT names / places
    "Adam", "Ève", "Caïn", "Abel", "Noé", "Sem", "Cham", "Japhet",
    "Abraham", "Isaac", "Jacob", "Israël", "Hébreux", "Chaldéen",
    "Chanaan", "Palestine", "Moïse", "Pharaon", "Joseph", "Égypte",
    "Égyptiens", "Nil", "Décalogue", "Sinaï", "Josué", "Saül",
    "David", "Juda", "Salomon", "Jérusalem", "Roboam", "Jéroboam",
    "Achaz", "Manassé", "Nabuchodonosor", "Babylone", "Cyrus",
    "Perses", "Juifs", "Zorobabel", "Néhémie", "Esdras", "Isaïe",
    "Prophètes", "Pâque", "Pâques", "Mer", "Assyriens",
    # NT names / places
    "Jésus", "Jésus-Christ", "Bethléem", "Marie", "Gabriel",
    "Nazareth", "Jourdain", "Jean-Baptiste", "Évangile", "Pierre",
    "Sanhédrin", "Pilate", "Barrabas", "Calvaire", "Croix",
    "Hérode", "Galilée", "Judée", "Église", "Synagogue",
    "Eucharistie", "Pentecôte", "Romains",
    # Calendar / liturgy
    "Carême", "Avent", "Noël",
    # Titles / offices treated as proper nouns in the original
    "Juges", "Rois", "Prophètes",
]

# Multi-word phrases that should keep their internal capitalization.
PHRASES = [
    ("ancien testament", "Ancien Testament"),
    ("nouveau testament", "Nouveau Testament"),
    ("testament nouveau", "Testament nouveau"),
    ("loi nouvelle", "Loi Nouvelle"),
    ("terre promise", "Terre Promise"),
    ("paradis terrestre", "paradis terrestre"),  # not capitalized in original
    ("mer rouge", "Mer Rouge"),
    ("très sainte", "très Sainte"),
    ("jésus de nazareth", "Jésus de Nazareth"),
    ("sainte famille", "sainte Famille"),
    ("fils de noé", "fils de Noé"),
    ("fils d’isaac", "fils d’Isaac"),
    ("fils d’abraham", "fils d’Abraham"),
    ("loi morale", "loi morale"),
]


def fix_caps(text: str) -> str:
    # Multi-word phrases first (case-insensitive)
    for low, high in PHRASES:
        text = re.sub(re.escape(low), high, text, flags=re.IGNORECASE)

    # Single proper nouns. Sort longest first so 'Jésus-Christ' beats 'Jésus'.
    for noun in sorted(PROPER_NOUNS, key=len, reverse=True):
        # Allow match after apostrophes (d’Égypte, l’Église), but block when
        # preceded by a letter/digit/hyphen (so "luiminamême" wouldn't fire).
        pat = r"(?<![\wÀ-ÿ-])" + re.escape(noun.lower()) + r"(?![\wÀ-ÿ-])"
        text = re.sub(pat, noun, text, flags=re.IGNORECASE)

    # Sentence-initial capitalization after .!? possibly followed by quotes/spaces
    def sentence_cap(m: re.Match) -> str:
        pre, letter = m.group(1), m.group(2)
        return pre + letter.upper()
    text = re.sub(r"([.!?]\s+|^|\n)([a-zàâéèêëîïôöùûüÿç])", sentence_cap, text)
    # After opening guillemet
    text = re.sub(r"(«\s+)([a-zàâéèêëîïôöùûüÿç])", sentence_cap, text)
    # After colon at start of clause introducing direct quote — leave lowercase

    # First letter of each paragraph
    text = re.sub(r"^([a-zàâéèêëîïôöùûüÿç])", lambda m: m.group(1).upper(), text)

    return text


# Roman numeral heading lines are marked with a stray 'Ã' glyph in the OCR.
# Allow internal whitespace ('I V' for IV) due to OCR letter-spacing artifacts.
HEADING_RE = re.compile(r"^Ã\s+([IVX][IVX\s]*)\.\s+(.+)$")
# 'w' is a stylized separator inside headings ("ÉGYPTE w DÉLIVRANCE").
# Treat it as an em-dash, including when it's at end-of-line (heading continues).
HEADING_SEP_W = re.compile(r"\s+w(\s+|$)")
# A heading wraps onto a second line if it ends with a separator or with a
# trailing comma. Used by the parser to peek/join.
HEADING_CONT = re.compile(r"(\s+w\s*$|,\s*$)")
# French enclitic / closed-class suffixes that follow a real hyphen — when a
# word break "X-\nY" has Y starting with one of these, keep the hyphen.
HYPHEN_KEEP_SUFFIX = re.compile(
    r"^(même|mêmes|ci|là|je|tu|il|ils|elle|elles|on|nous|vous|le|la|les|"
    r"lui|leur|y|en|t|Christ|christ|esprit|Esprit|Saint|saint|Sainte|sainte|"
    r"Père|père|Mère|mère|Fils|fils|Frère|Sœur|Cœur|Roi|Dieu|dieu|aux|"
    r"haut|bas|deux|sept)\b"
)
# Footnote marker like "* Jn 15, 18-20 ; 16, 33."
FOOTNOTE_RE = re.compile(r"^\*\s+(.+)$")
# Paragraph-start: a number followed by '.' at line start. Handle "17 " (period
# missing in §17 in the source) too.
PARA_START_RE = re.compile(r"^(\d+)\.?\s+(.+)$")
# Page header like "Très bref résumé de l'histoire de la Révélation divine 213"
PAGE_HEADER_RUNNING = re.compile(
    r"^(?:Très bref résumé de l’histoire de la Révélation divine\s+\d+|\d+\s+Appendice)$"
)


def extract_lines() -> list[str]:
    lines: list[str] = []
    skip_first_page_block = True  # skip the chapter title block on opening page
    with pdfplumber.open(PDF_PATH) as pdf:
        for idx in PAGE_RANGE:
            page = pdf.pages[idx]
            txt = page.extract_text() or ""
            for raw in txt.splitlines():
                line = raw.strip()
                if not line:
                    continue
                if PAGE_HEADER_RUNNING.match(line):
                    continue
                # Drop chapter-title decoration on first page only:
                # "Très bref résumé", "de l'histoire de la", "Révélation",
                # "divine", "ERTIPAHC", "1", "La Transfiguration - Gérard David"
                if skip_first_page_block:
                    # End the skip when we hit the first Roman heading
                    if HEADING_RE.match(line):
                        skip_first_page_block = False
                    else:
                        continue
                # ERTIPAHC = "CHAPITRE" mirrored, drop
                if line in ("ERTIPAHC", "1", "2"):
                    continue
                lines.append(line)
    return lines


def parse(lines: list[str]) -> dict:
    sections: list[dict] = []
    current_section: dict | None = None
    paragraphs: list[dict] = []  # current section's paragraphs
    current_para: list[str] | None = None
    current_n: int | None = None
    footnotes: list[dict] = []

    def flush_para():
        nonlocal current_para, current_n
        if current_para is not None and current_n is not None:
            text = " ".join(current_para).strip()
            text = re.sub(r"\s+", " ", text)
            paragraphs.append({"n": current_n, "html": "<p>" + fix_caps(text) + "</p>"})
        current_para = None
        current_n = None

    def flush_section():
        flush_para()
        if current_section is not None:
            current_section["paragraphs"] = paragraphs.copy()
            sections.append(current_section)
            paragraphs.clear()

    for line in lines:
        m = HEADING_RE.match(line)
        if m:
            flush_section()
            roman, title = m.group(1), m.group(2)
            title = HEADING_SEP_W.sub(" — ", title)
            # Title is ALL-CAPS in source; convert to title-case-ish but preserve
            # — for now, keep as printed (small caps in book, but the printed
            # form on the contents page matches uppercase). Use sentence-style.
            # We lower then capitalize first letter and proper nouns.
            title_lower = title.lower()
            title_fixed = fix_caps(title_lower)
            # Force first letter uppercase
            title_fixed = title_fixed[:1].upper() + title_fixed[1:]
            # Re-globally-init via globals dict
            globals()["current_section"] = {"roman": roman, "title": title_fixed}
            # Use nonlocal-ish via mutation
            nonlocal_section = {"roman": roman, "title": title_fixed}
            # We can't use nonlocal here cleanly without restructuring; do it:
            sections_marker = nonlocal_section
            # Actually just rebind via outer name
            # Simpler: keep going with explicit list mutation
            # (replace block above) — refactor:
            continue
        m = FOOTNOTE_RE.match(line)
        if m:
            flush_para()
            footnotes.append({"n": 1, "text": fix_caps(m.group(1))})
            continue
        m = PARA_START_RE.match(line)
        if m:
            flush_para()
            current_n = int(m.group(1))
            current_para = [m.group(2)]
            continue
        # Continuation of current paragraph
        if current_para is not None:
            # De-hyphenate end-of-line breaks like "ressemblan- ce"
            if current_para and current_para[-1].endswith("-"):
                current_para[-1] = current_para[-1][:-1] + line
            else:
                current_para.append(line)

    flush_section()
    return {"sections": sections, "footnotes": footnotes}


def main() -> None:
    # Re-implementing parse() cleanly without the messy globals hack:
    lines = extract_lines()

    sections: list[dict] = []
    cur_sec: dict | None = None
    cur_paras: list[dict] = []
    cur_para_text: list[str] | None = None
    cur_n: int | None = None
    footnotes: list[dict] = []

    def join_hyphen(m: re.Match) -> str:
        # m.group(1) is the char before '-', m.group(2) is the rest of the
        # next word (no leading space). Keep hyphen for closed-class suffixes;
        # drop for typographic line-break hyphenation.
        left, right_word = m.group(1), m.group(2)
        if HYPHEN_KEEP_SUFFIX.match(right_word):
            return left + "-" + right_word
        return left + right_word

    def flush_para():
        nonlocal cur_para_text, cur_n
        if cur_para_text is not None and cur_n is not None:
            t = " ".join(cur_para_text)
            # Join words broken across lines: "lui-\nmême" → "lui-même",
            # "ressemblan-\nce" → "ressemblance".
            t = re.sub(r"(\w)-\s+(\w[\wÀ-ÿ’'-]*)", join_hyphen, t)
            t = re.sub(r"\s+", " ", t).strip()
            cur_paras.append({"n": cur_n, "html": "<p>" + fix_caps(t) + "</p>"})
        cur_para_text = None
        cur_n = None

    def flush_section():
        nonlocal cur_sec
        flush_para()
        if cur_sec is not None:
            cur_sec["paragraphs"] = list(cur_paras)
            sections.append(cur_sec)
            cur_paras.clear()
        cur_sec = None

    i = 0
    while i < len(lines):
        line = lines[i]
        m = HEADING_RE.match(line)
        if m:
            flush_section()
            roman_raw, title = m.group(1), m.group(2)
            roman = re.sub(r"\s+", "", roman_raw)
            # Heading wraps onto the next line whenever that line is
            # uppercase-dominant and isn't itself a heading / paragraph /
            # footnote. Keep going until the test fails (max 3 lines).
            wraps = 0
            while wraps < 3 and (i + 1) < len(lines):
                nxt = lines[i + 1]
                if HEADING_RE.match(nxt) or PARA_START_RE.match(nxt) or FOOTNOTE_RE.match(nxt):
                    break
                # Continuation if uppercase-dominant (>50% letters are upper)
                letters = [c for c in nxt if c.isalpha()]
                if not letters:
                    break
                upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
                if upper_ratio < 0.6:
                    break
                title = title + " " + nxt
                i += 1
                wraps += 1
            title = HEADING_SEP_W.sub(" — ", title).rstrip(" —,")
            title_fixed = fix_caps(title.lower())
            title_fixed = title_fixed[:1].upper() + title_fixed[1:]
            cur_sec = {"roman": roman, "title": title_fixed}
            i += 1
            continue
        m = FOOTNOTE_RE.match(line)
        if m:
            flush_para()
            footnotes.append({"n": 1, "text": fix_caps(m.group(1))})
            i += 1
            continue
        m = PARA_START_RE.match(line)
        if m:
            n = int(m.group(1))
            if 1 <= n <= 30 and (cur_n is None or n == cur_n + 1):
                flush_para()
                cur_n = n
                cur_para_text = [m.group(2)]
                i += 1
                continue
        if cur_para_text is not None:
            cur_para_text.append(line)
        i += 1

    flush_section()

    # Manual title overrides for cases the heading-join heuristic can't
    # disambiguate (printed heading uses two stacked clauses with no glyph
    # separator between them).
    TITLE_OVERRIDES = {
        "III": "Corruption et déluge — Le peuple élu",
    }
    for s in sections:
        if s["roman"] in TITLE_OVERRIDES:
            s["title"] = TITLE_OVERRIDES[s["roman"]]

    out = {
        "corpus": "pius-x-petit",
        "slug": "histoire-revelation",
        "title": "Très bref résumé de l’histoire de la Révélation divine",
        "kicker": "Appendice",
        "sections": sections,
        "footnotes": footnotes,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    n_paras = sum(len(s["paragraphs"]) for s in sections)
    print(f"Wrote {OUT_PATH.relative_to(Path.cwd())}: "
          f"{len(sections)} sections, {n_paras} paragraphs, "
          f"{len(footnotes)} footnotes")


if __name__ == "__main__":
    main()
