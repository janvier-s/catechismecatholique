#!/usr/bin/env python3
"""
Extract `La Doctrine catholique` (Boulenger, Vitte 1927, 3 tomes) from the
.doc source into one JSON per leçon.

The source is a Word 97 .doc that we convert to HTML via macOS `textutil`.
The HTML has no real anchors — Word's bookmarks become broken HYPERLINK
literal text — so we identify leçon boundaries by content patterns:

  <p><b>Nere/eme/ère/etc. LEÇON ...</b></p>     — most leçons
  <p>...<b>I/II/.../XV<sup>re/e</sup> LEÇON. — Title</b>...</p>  — Tome III variants

Tome boundaries are inferred from the leçon-number sequence: when the count
resets after Tome I's "20e leçon" (or Tome II's "18e"), we know we're in the
next tome.

First-pass output (this script): one JSON per leçon with raw HTML body. A
second pass will split each body into the documented sub-sections (mots,
développement, conclusion pratique, lectures, questionnaire, devoirs).

Output:
  static/data/boulanger/structure.json   — list of leçons with titles
  static/data/boulanger/lessons/{slug}.json — one per leçon

Source:
  scripts/data-sources/boulanger/source.doc      — .doc original
  scripts/data-sources/boulanger/source.html     — textutil-converted (cached)
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup, Tag

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent
SRC_DIR = ROOT / "scripts/data-sources/boulanger"
SRC_DOC = SRC_DIR / "source.doc"
SRC_HTML = SRC_DIR / "source.html"
OUT_DIR = ROOT / "static/data/boulanger"
OUT_LESSONS = OUT_DIR / "lessons"

# Roman numerals 1-25 — used in Tome III's "Ire LEÇON. — La vie surnaturelle"
ROMAN_TO_INT = {
    "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8,
    "IX": 9, "X": 10, "XI": 11, "XII": 12, "XIII": 13, "XIV": 14, "XV": 15,
    "XVI": 16, "XVII": 17, "XVIII": 18, "XIX": 19, "XX": 20,
}

TOME_TITLES = {
    1: "Le Dogme",
    2: "La Morale",
    3: "Les Moyens de sanctification",
}

# Leçon-header patterns. Both forms put the number in the first capture group;
# group 2 is the trailing title (may be empty).
#
#   Form A — short header on its own paragraph:
#       1ere LEÇON           20ème LEÇON
#       3eme LEÇON           5e LEÇON
#       Première leçon
#   Form B — header with title in same paragraph (Tome III):
#       Ire LEÇON. — La vie surnaturelle
#       2e LEÇON : La Prière en général
ORDINAL_RE = r"(?:ere|ère|re|ème|eme|me|e)"
HEADER_FORM_A = re.compile(
    rf"^\s*(\d{{1,2}})\s*{ORDINAL_RE}\s+LEÇON(?:\s+PR[ÉE]LIMINAIRE)?\s*$",
    re.IGNORECASE,
)
HEADER_FORM_A_PREMIERE = re.compile(
    r"^\s*Première\s+leçon\s*$", re.IGNORECASE
)
# Form B: digits or roman numeral + ordinal + LEÇON + (.|—|:|-) + title
HEADER_FORM_B = re.compile(
    rf"^\s*(\d{{1,2}}|[IVX]{{1,5}})\s*{ORDINAL_RE}\s+LEÇON\s*[\.\-—:–]+\s*(.+)$",
    re.IGNORECASE,
)


def slugify(s: str) -> str:
    """ASCII slug, lowercase, hyphenated, max ~60 chars."""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s[:60].rstrip("-")


def ensure_html() -> None:
    if SRC_HTML.exists() and SRC_HTML.stat().st_mtime >= SRC_DOC.stat().st_mtime:
        return
    if not SRC_DOC.exists():
        sys.exit(f"missing source.doc at {SRC_DOC}")
    if not shutil.which("textutil"):
        sys.exit("textutil not found — required to convert .doc → .html on macOS")
    print(f"  converting {SRC_DOC.name} → source.html via textutil…")
    subprocess.run(
        ["textutil", "-convert", "html", "-output", str(SRC_HTML), str(SRC_DOC)],
        check=True,
    )


def load_paragraphs() -> list[Tag]:
    soup = BeautifulSoup(SRC_HTML.read_text(encoding="utf-8"), "html.parser")
    return list(soup.find_all("p"))


def text_of(p: Tag) -> str:
    """Plain text of a paragraph, with the broken HYPERLINK literals stripped."""
    s = p.get_text(separator=" ", strip=False)
    s = re.sub(r"\s*HYPERLINK\s+\\l\s+\"[^\"]+\"\s*", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def is_master_toc_marker(t: str) -> bool:
    return t.lower().startswith("table des matières")


def is_tome_marker(t: str) -> tuple[int, str] | None:
    """Detect TOC tome banner like 'TOME I : LE DOGME (Symbole des Apôtres)'."""
    m = re.match(r"^TOME\s+(I|II|III)\s*:\s*(.+)$", t, re.I)
    if not m:
        return None
    n = {"I": 1, "II": 2, "III": 3}[m.group(1).upper()]
    return n, m.group(2).strip()


def parse_lesson_header(t: str) -> tuple[int, str] | None:
    """Return (lesson_number, trailing_title) or None.

    Trailing title may be empty when the header only carries 'Nere LEÇON';
    the actual lesson title for Tome I/II usually follows on the next
    bold line.
    """
    if not t:
        return None
    if HEADER_FORM_A.match(t):
        m = HEADER_FORM_A.match(t)
        return int(m.group(1)), ""
    if HEADER_FORM_A_PREMIERE.match(t):
        return 1, ""
    m = HEADER_FORM_B.match(t)
    if m:
        raw = m.group(1).upper()
        n = int(raw) if raw.isdigit() else ROMAN_TO_INT.get(raw)
        if n is None:
            return None
        return n, m.group(2).strip()
    return None


def is_toc_entry(p: Tag, t: str) -> bool:
    """A line that's still part of an internal TOC, not body content.

    Identified by the broken-HYPERLINK literal token, which textutil left
    behind only in TOC entries (Word's body text never contained the
    literal string 'HYPERLINK').
    """
    raw = p.decode()
    return "HYPERLINK" in raw


# Match a leçon title within a TOC entry. The TOC entries always carry the
# HYPERLINK literal; we use the bold span after it as the title source.
TOC_TITLE_RE = re.compile(
    rf"(\d{{1,2}}|[IVX]{{1,5}})\s*(?:<sup>[^<]*</sup>\s*)?\s*"
    rf"(?:{ORDINAL_RE})?\s*"
    rf"(?:LEÇON|leçon)\s*(?:\([^)]*\))?\s*[\.:\-—–]*\s*(.+)",
    re.IGNORECASE,
)


# Match a leçon TOC line. Accept both "1 e LEÇON" and "I re L EÇON" (Word's
# textutil sometimes splits LEÇON across spans, producing 'L EÇON').
TOC_LINE_RE = re.compile(
    rf"^\s*(\d{{1,2}}|[IVX]{{1,5}})\s+(?:{ORDINAL_RE})\s+L\s*EÇON"
    rf"(?:\s+préliminaire)?\s*[\.:\-—–]*\s*(.*)$",
    re.IGNORECASE,
)


def collect_toc_titles(paragraphs: list[Tag]) -> dict[tuple[int, int], str]:
    """Walk the master TOC (everything between 'Table des matières' and the
    first non-TOC body paragraph) and pull (tome, n) → leçon title.
    """
    titles: dict[tuple[int, int], str] = {}
    in_master_toc = False
    seen_first_body = False
    current_tome = 0
    for p in paragraphs:
        t = text_of(p)
        if not t:
            continue
        if not in_master_toc:
            if is_master_toc_marker(t):
                in_master_toc = True
            continue
        # Within master TOC: either tome banner, HYPERLINK entry, or
        # blank/transition. Stop on the first non-HYPERLINK paragraph that
        # comes after we've started collecting tome III entries.
        tome_marker = is_tome_marker(t)
        if tome_marker:
            current_tome = tome_marker[0]
            continue
        if "HYPERLINK" not in p.decode():
            # Master TOC ended once we leave HYPERLINK paragraphs after
            # tome III has been entered.
            if current_tome >= 3:
                break
            continue
        if current_tome == 0:
            continue
        m = TOC_LINE_RE.match(t)
        if not m:
            continue
        raw = m.group(1).upper()
        n = int(raw) if raw.isdigit() else ROMAN_TO_INT.get(raw)
        if n is None:
            continue
        title = m.group(2).strip()
        # Tome II/III TOC entries append a long contents summary after the
        # title — chop at the first " - "/" — " or ". {Capital}".
        title = re.split(r"\s+[-–—]+\s+|\.\s+[A-ZÉÈ]", title, maxsplit=1)[0]
        title = title.lstrip(".— –-:").rstrip(".— -:").strip()
        # Normalise spaced-out ordinals like "I er" / "II eme" → "Ier" / "IIe".
        title = re.sub(rf"\b([IVX]+)\s+(ere|ère|er|re|ème|eme|me|e)(?=\s)",
                       r"\1\2", title)
        # Tome I TOC titles are wholly lowercase in the source ("le problème
        # de la destinée"). Apply French sentence case: capitalise the first
        # alphabetic character (handles "l'", "d'", numeric prefixes), leave
        # the rest untouched so proper nouns already cased in the source
        # ("Dieu", "Sauveur", "Notre-Seigneur") are preserved.
        for i, ch in enumerate(title):
            if ch.isalpha():
                title = title[:i] + ch.upper() + title[i + 1:]
                break
        if title and (current_tome, n) not in titles:
            titles[(current_tome, n)] = title
    return titles


def extract() -> dict[str, Any]:
    paragraphs = load_paragraphs()
    print(f"  loaded {len(paragraphs)} <p> elements")

    toc_titles = collect_toc_titles(paragraphs)
    print(f"  master TOC titles: {len(toc_titles)}")

    # Track tome via leçon-number resets. Front matter lives in tome 0.
    current_tome = 0
    last_n = 0
    lessons: list[dict[str, Any]] = []
    cur: dict[str, Any] | None = None

    for p in paragraphs:
        t = text_of(p)
        if not t:
            continue
        if is_master_toc_marker(t):
            continue
        if is_toc_entry(p, t):
            continue
        header = parse_lesson_header(t)
        if header:
            n, trailing_title = header
            if n == 1 or (cur and n < last_n):
                current_tome = max(current_tome, 0) + 1
                if current_tome > 3:
                    current_tome = 3
            elif current_tome == 0:
                current_tome = 1
            last_n = n
            if cur is not None:
                lessons.append(cur)
            cur = {
                "tome": current_tome,
                "n": n,
                "title": toc_titles.get((current_tome, n)) or trailing_title,
                "blocks": [],
            }
            continue
        if cur is None:
            continue  # front matter, ignored in first pass
        cur["blocks"].append(str(p))

    if cur is not None:
        lessons.append(cur)

    # Tome III's leçon 1 ("La vie surnaturelle / La grâce") has no body
    # header — the .doc just runs into the content. If we have a TOC entry
    # for (3, 1) but no detected leçon, splice one in by stealing the
    # tail of tome-II's last lesson up to where Tome-III leçon 2 starts.
    if (3, 1) in toc_titles and not any(
        L["tome"] == 3 and L["n"] == 1 for L in lessons
    ):
        # Find tome III's leçon 2 in the lesson list — content before it
        # (after tome II's last leçon's last "real" body) is leçon 1.
        # Strategy: find first paragraph whose number ≥ 311 (heuristic from
        # the grâce material that begins Tome III) inside the previous
        # tome-II leçon, and split there.
        idx_t2_last = max(
            i for i, L in enumerate(lessons) if L["tome"] == 2
        )
        idx_t3_first = next(
            (i for i, L in enumerate(lessons) if L["tome"] == 3 and L["n"] == 2),
            None,
        )
        if idx_t3_first is not None:
            t2_last = lessons[idx_t2_last]
            split_at = None
            # Tome III's booklet title page ('… tome III « Les Moyens de
            # Sanctification »') sits right before tome III's body proper.
            # Splitting there captures the front matter into tome III, away
            # from tome II.
            for i, html in enumerate(t2_last["blocks"]):
                txt = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
                if "tome III" in txt and "Moyens de Sanctification" in txt:
                    split_at = i
                    break
                if "Objet de la troisième partie" in txt and split_at is None:
                    split_at = i
            if split_at is not None:
                t3_l1_blocks = t2_last["blocks"][split_at:]
                t2_last["blocks"] = t2_last["blocks"][:split_at]
                lessons.insert(
                    idx_t2_last + 1,
                    {
                        "tome": 3,
                        "n": 1,
                        "title": toc_titles[(3, 1)],
                        "blocks": t3_l1_blocks,
                    },
                )

    # Backfill any still-empty title from the next bold paragraph
    for L in lessons:
        if L["title"]:
            continue
        for raw_html in L["blocks"][:6]:
            soup = BeautifulSoup(raw_html, "html.parser")
            txt = soup.get_text(separator=" ", strip=True)
            txt = re.sub(r"\s+", " ", txt)
            if not txt or len(txt) < 3:
                continue
            if txt.lower() in {"sommaire", "tableau synoptique"}:
                continue
            if len(txt) < 140 and re.match(r"^[A-ZÉÈÊÂÔÎÀÇŒ]", txt):
                L["title"] = txt
                break

    # Strip trailing junk: per-tome alphabetical indexes, next-tome booklet
    # title pages, and the global footnote dump at end of document. The
    # source has all of these inline; without trimming they bleed into the
    # last leçon of each tome.
    for L in lessons:
        L["blocks"] = trim_trailing_junk(L["blocks"])

    # Drop footnote-style paragraphs (class ≥ p477) anywhere they appear.
    # In practice these only show up in Tome III's last leçon since the
    # footnote dump sits at the very end of the document — but we sweep
    # every leçon for safety.
    for L in lessons:
        L["blocks"] = [b for b in L["blocks"] if not is_footnote_paragraph(b)]

    # Section-tag each block. The Préface (line ~706) names the seven parts
    # of every leçon: tableau synoptique, vocabulaire (Mots), développement,
    # conclusion pratique, lectures, questionnaire, devoirs écrits. Marking
    # them lets the renderer style headings and skip empty <br> spacers.
    for L in lessons:
        L["blocks"] = tag_sections(L["blocks"])

    return {"lessons": lessons}


# Section detection. Each block carries a 'section' tag — synopsis / mots /
# developpement / conclusion / lectures / questionnaire / devoirs / heading
# — plus a 'kind' (heading vs paragraph). Headings are the literal section
# divider lines ("DÉVELOPPEMENT", "Conclusion pratique.", "LECTURES.",
# "QUESTIONNAIRE.", "DEVOIRS ÉCRITS"); the renderer can hide the heading
# itself and just use it to typeset the following block group.
# `DASH` matches any of hyphen, en-dash, em-dash, minus.
DASH = r"[\-‐–—−]"
# `TRAIL` allows the punctuation/dash/space tail that follows a section name
# before the body: ". — ", ".  ", " . ", " - ", etc. BeautifulSoup inserts
# whitespace between adjacent <b>/<span> elements which is why we can't
# assume the period sits flush against ÉCRITS.
TRAIL = rf"(?:\s*{DASH}?)*\s*\.?\s*(?:{DASH}\s*)?"

SECTION_HEAD_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    # Strict match: paragraph is just the section name (optionally with a
    # trailing dash). The leading-fragment patterns below handle the same
    # names followed by inline content.
    (re.compile(rf"^\s*(?:\d{{1,3}}\.\s*{DASH}?\s*)?Mots{TRAIL}$", re.I), "mots"),
    (re.compile(rf"^\s*DÉVELOPPEMENT{TRAIL}$", re.I), "developpement"),
    (re.compile(rf"^\s*Conclusions?(?:\s+(?:pratique|générale))?{TRAIL}$", re.I), "conclusion"),
    (re.compile(rf"^\s*LECTURES?{TRAIL}$", re.I), "lectures"),
    (re.compile(rf"^\s*QUESTIONNAIRE{TRAIL}$", re.I), "questionnaire"),
    (re.compile(rf"^\s*DEVOIRS\s+ÉCRITS{TRAIL}$", re.I), "devoirs"),
]
# Headings may sit on the SAME line as the first item of the section
# (especially LECTURES / QUESTIONNAIRE / DEVOIRS, where "LECTURES. — 1° …"
# all fits in one paragraph). Detect by leading marker.
SECTION_LEADING_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(rf"^\s*(?:\d{{1,3}}\.\s*{DASH}?\s*)?Mots\.?\s+\S", re.I), "mots"),
    (re.compile(r"^\s*DÉVELOPPEMENT\.?\s+\S", re.I), "developpement"),
    (re.compile(r"^\s*Conclusions?(?:\s+(?:pratique|générale))?\.?\s+\S", re.I), "conclusion"),
    # LECTURES / QUESTIONNAIRE / DEVOIRS may be followed by a dash + content
    # ("LECTURES. — 1° …") or by a bare leading sentence ("LECTURES. La
    # venue du Saint-Esprit …"). Match either form, but require at least
    # one character of body content after the section name to distinguish
    # from the bare-heading form.
    (re.compile(rf"^\s*LECTURES?{TRAIL}\S", re.I), "lectures"),
    (re.compile(rf"^\s*QUESTIONNAIRE{TRAIL}\S", re.I), "questionnaire"),
    (re.compile(rf"^\s*DEVOIRS\s+ÉCRITS{TRAIL}\S", re.I), "devoirs"),
]


# Numbered-paragraph marker (e.g. "9. I. La Religion chrétienne." or
# "313. — Objet de la troisième partie."). When seen during the Mots
# section it signals the start of développement — useful for the handful of
# leçons that lack the explicit DÉVELOPPEMENT heading.
NUMBERED_PARA_RE = re.compile(
    r"^\s*\d{1,3}\.\s*[\-‐–—−]?\s*(?:[IVX]+\.|[A-ZÉÈÊÂÔÎÀÇŒ])"
)


def tag_sections(blocks: list[str]) -> list[dict[str, str]]:
    """Walk blocks in order and assign each one to a section. Returns a list
    of {section, html} dicts. The first run (before any 'Mots' / 'DÉVELOPPE-
    MENT' heading) is the tableau synoptique."""
    out: list[dict[str, str]] = []
    section = "synopsis"
    for raw_html in blocks:
        soup = BeautifulSoup(raw_html, "html.parser")
        txt = soup.get_text(" ", strip=True)
        txt = re.sub(r"\s+", " ", txt)
        if not txt:
            # Skip empty <br>-only paragraphs entirely; they only matter as
            # visual whitespace in the .doc and the reader injects its own
            # spacing via CSS margins.
            continue
        # 1) Standalone heading match → transition section, render as a
        #    heading block (renderer can show or hide).
        matched_head = None
        for pat, name in SECTION_HEAD_PATTERNS:
            if pat.match(txt):
                matched_head = name
                break
        if matched_head:
            section = matched_head
            out.append({"section": section, "kind": "heading", "html": raw_html})
            continue
        # 2) Heading-as-leading-fragment → transition section, but keep the
        #    block as a regular paragraph in the new section.
        matched_leading = None
        for pat, name in SECTION_LEADING_PATTERNS:
            if pat.match(txt):
                matched_leading = name
                break
        if matched_leading:
            section = matched_leading
        elif section == "mots" and NUMBERED_PARA_RE.match(txt):
            # Numbered teaching paragraph appearing while we're still in
            # the Mots section means this leçon skipped the explicit
            # DÉVELOPPEMENT heading. Roll over silently.
            section = "developpement"
        out.append({"section": section, "kind": "paragraph", "html": raw_html})

    # Retroactive Mots: some tome-III leçons skip the explicit "Mots"
    # heading and run vocabulary paragraphs straight after the leçon title.
    # If the first run is tagged 'synopsis' followed immediately by
    # 'developpement', and the synopsis paragraphs look like vocabulary
    # definitions (no leading paragraph number), re-tag them as 'mots'.
    if any(b["section"] == "developpement" for b in out):
        first_dev = next(i for i, b in enumerate(out) if b["section"] == "developpement")
        prefix = out[:first_dev]
        if prefix and all(b["section"] == "synopsis" for b in prefix):
            looks_like_mots = all(
                not re.match(r"^\s*\d{1,3}\.\s", strip_tags(b["html"]))
                and len(strip_tags(b["html"])) > 40
                for b in prefix
            )
            if looks_like_mots:
                for b in prefix:
                    b["section"] = "mots"

    return out


def strip_tags(html: str) -> str:
    return re.sub(r"\s+", " ", BeautifulSoup(html, "html.parser").get_text(" ", strip=True))


# Roman-numbered développement headings carry the lesson's outline:
#   "2.  I. Le problème de la destinée."     (T1)
#   "156. - I. La Morale chrétienne."        (T2)
#   "335. — I. Les Sacrements. …"            (T3)
# The leading number is the editor's cross-reference paragraph; we keep it
# as a data-n attribute (useful for future cross-refs) but the displayed
# label is just "Roman. Title".
DEV_ROMAN_RE = re.compile(
    r"^\s*(\d+)\s*\.\s*[\-‐–—−.]?\s*([IVX]+)\.\s+(.+?)\s*$",
    re.IGNORECASE,
)

# Sub-numbered teaching headings inside the développement:
#   "<p><b>1° Définition. —</b> body…</p>"
#   "<p><span><b>2° Espèces</b></span> body…</p>"
# We test this against the plain text of the leading bold run, not the raw
# HTML, so wrapper spans don't matter.
DEV_SUB_LABEL_RE = re.compile(r"^\s*(\d+)°\s*(.+?)\s*$")


def _rewrite_roman_heading(b: dict[str, Any], anchor: str, n: str, roman: str, label: str) -> None:
    """Replace the raw `<p><b>…</b></p>` with a clean <h2> carrying the
    anchor id and the editor's paragraph number as data-n. The displayed
    label drops the editor number prefix entirely."""
    safe_label = label.rstrip(". ").strip()
    b["html"] = (
        f'<h2 class="dev-roman" id="{anchor}" data-n="{n}">'
        f'<span class="dev-roman-num">{roman}.</span> '
        f'<span class="dev-roman-text">{safe_label}.</span>'
        f"</h2>"
    )
    b["kind"] = "roman-heading"


def _rewrite_sub_heading(b: dict[str, Any], anchor: str, ord_n: str, label: str) -> tuple[str, str]:
    """The raw paragraph is `<p>[<span>]<b>1° Label. —</b>[</span>] body…</p>`.
    Replace the leading bold with a clean `<h3>` (anchor + label) and keep
    the trailing body in a `<p>` sibling. Returns (anchor, cleaned_label)."""
    from bs4 import NavigableString

    soup = BeautifulSoup(b["html"], "html.parser")
    p = soup.find("p")
    if not p:
        return anchor, label
    # Walk leaf text nodes in order; remove leading whitespace + nodes whose
    # nearest <b> ancestor exists (these are the label fragments). Stop at
    # the first non-whitespace text node outside any <b>.
    body_seen = False
    to_remove: list = []
    for leaf in list(p.descendants):
        if body_seen:
            break
        if isinstance(leaf, NavigableString):
            if not str(leaf).strip():
                continue
            has_bold_ancestor = any(
                getattr(a, "name", None) == "b" for a in leaf.parents
            )
            if has_bold_ancestor:
                to_remove.append(leaf)
            else:
                body_seen = True
    for leaf in to_remove:
        leaf.extract()
    # Now remove all <b> wrappers that became empty.
    for bold in list(p.find_all("b")):
        if not bold.get_text(strip=True):
            bold.decompose()
    # Also remove any leading inline tags / text that are pure dash /
    # punctuation. Walk children and trim from the front.
    while p.contents:
        first = p.contents[0]
        if isinstance(first, NavigableString):
            stripped = str(first).lstrip("—–-. \t\n ")
            if stripped == str(first):
                break
            if stripped:
                first.replace_with(NavigableString(stripped))
                break
            first.extract()
        else:
            inner = first.get_text(" ", strip=True)
            if inner == "" or re.fullmatch(r"[—–\-. ]+", inner):
                first.decompose()
            else:
                break
    body_after = p.decode_contents().strip()
    cleaned_label = label.rstrip(". -—–").strip()
    pieces = [
        f'<h3 class="dev-sub" id="{anchor}" data-n="{ord_n}">'
        f'<span class="dev-sub-num">{ord_n}°</span> '
        f'<span class="dev-sub-text">{cleaned_label}.</span>'
        f"</h3>"
    ]
    if body_after:
        pieces.append(f"<p>{body_after}</p>")
    b["html"] = "".join(pieces)
    b["kind"] = "sub-heading"
    return anchor, cleaned_label


def build_mini_toc(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Walk développement blocks, find Roman-numbered + sub-numbered (N°)
    headings, rewrite them into clean <h2>/<h3> tags with anchor ids, and
    return the nested mini-TOC the reader displays. Anchors are 1-indexed
    by appearance order so they survive future numbering changes.
    """
    mini: list[dict[str, Any]] = []
    roman_counter = 0
    sub_counter = 0
    current: dict[str, Any] | None = None
    for b in blocks:
        if b.get("section") != "developpement" or b.get("kind") != "paragraph":
            continue
        txt = strip_tags(b["html"])
        m = DEV_ROMAN_RE.match(txt)
        if m:
            roman_counter += 1
            anchor = f"dev-{roman_counter}"
            n, roman, label = m.group(1), m.group(2).upper(), m.group(3)
            _rewrite_roman_heading(b, anchor, n, roman, label)
            current = {
                "n": roman_counter,
                "roman": roman,
                "label": label.rstrip(". ").strip(),
                "anchor": anchor,
                "children": [],
            }
            mini.append(current)
            continue
        # Sub-headings only make sense once we have a Roman parent.
        if current is None:
            continue
        # Gather the paragraph's leading bold text. The .doc converter
        # often splits one logical label across multiple <b> runs nested
        # in <span>s ("<b>1°</b> <span><b>Définition.</b></span> - body…").
        # Walk leaf nodes in order; accumulate bold leaves; stop at the
        # first non-bold leaf with non-whitespace content.
        soup = BeautifulSoup(b["html"], "html.parser")
        p = soup.find("p")
        if p is None:
            continue
        leading_bold_text = ""
        for leaf in p.descendants:
            if isinstance(leaf, str):
                # Skip whitespace-only between bold runs; abort on any
                # non-whitespace text outside a <b> ancestor.
                if not leaf.strip():
                    continue
                if not any(getattr(a, "name", None) == "b" for a in leaf.parents):
                    break
                leading_bold_text += leaf
            # Non-string nodes are walked into automatically; nothing else
            # to do.
        bold_text = re.sub(r"\s+", " ", leading_bold_text).strip()
        m2 = DEV_SUB_LABEL_RE.match(bold_text)
        if not m2:
            continue
        # Bail if the bold prefix is suspiciously long — likely an inline
        # emphasis, not a sub-heading (e.g. "<b>Christianisme au sens
        # large</b>"). Real sub-heads are tight labels (≤ 60 chars).
        label = m2.group(2).strip()
        if len(label) > 70:
            continue
        sub_counter += 1
        anchor = f"dev-{current['n']}-{m2.group(1)}"
        _, cleaned_label = _rewrite_sub_heading(b, anchor, m2.group(1), label)
        current["children"].append(
            {"n": int(m2.group(1)), "label": cleaned_label, "anchor": anchor}
        )
    return mini


# Section-name "heading" blocks ("DÉVELOPPEMENT", "LECTURES.",
# "QUESTIONNAIRE.", "DEVOIRS ÉCRITS.", "Conclusion pratique.", "1. Mots") add
# no semantic value at render time — the reader's section eyebrow already
# carries that label. Drop them so the reader doesn't render duplicates.
def strip_section_name_headings(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [b for b in blocks if b.get("kind") != "heading"]


def strip_synopsis(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop the synopsis section entirely — its navigational role is taken
    over by the mini-TOC built from dev Roman headings."""
    return [b for b in blocks if b.get("section") != "synopsis"]


# Devoirs section paragraphs cram "1° X 2° Y 3° Z" all on one line, often
# preceded by an inline "DEVOIRS ÉCRITS." label. Split into a real <ol> so
# the reader can render proper list semantics + spacing.
DEVOIRS_LEAD_RE = re.compile(
    r"^\s*<p\b[^>]*>\s*(?:<b>\s*DEVOIRS\s+ÉCRITS\.?\s*</b>\s*\.?\s*)?", re.I
)
DEVOIRS_SPLIT_RE = re.compile(r"(?<!\d)\b(\d+)°\s*")


def rewrite_devoirs_as_ol(blocks: list[dict[str, Any]]) -> None:
    """In-place: rewrite each devoirs paragraph that bundles N°-numbered
    items inline into a single `<ol class="devoirs-list">`. Idempotent —
    blocks already in <ol> form are left alone."""
    for b in blocks:
        if b.get("section") != "devoirs" or b.get("kind") != "paragraph":
            continue
        if "<ol" in b["html"]:
            continue
        # Strip the leading <p><b>DEVOIRS ÉCRITS.</b> bracket so we can
        # work on the raw text + tags inside.
        soup = BeautifulSoup(b["html"], "html.parser")
        p = soup.find("p")
        if not p:
            continue
        # Drop any leading "<b>DEVOIRS ÉCRITS.</b>" bold prefix.
        bold = p.find("b")
        if bold and re.search(r"DEVOIRS\s+ÉCRITS", bold.get_text(" ", strip=True), re.I):
            bold.extract()
        inner = p.decode_contents().strip()
        # Drop leading punctuation left after stripping the bold prefix.
        inner = re.sub(r"^\s*[\.\-—–\s]+", "", inner)
        # Split on the N° markers, keeping the leading "1°" together with
        # its content.
        parts = DEVOIRS_SPLIT_RE.split(inner)
        # parts looks like: ['', '1', ' content…', '2', ' content…', …]
        items: list[str] = []
        i = 1
        while i + 1 < len(parts):
            content = parts[i + 1].strip()
            content = re.sub(r"\s+", " ", content)
            content = content.rstrip(".  ").strip()
            if content:
                items.append(content)
            i += 2
        if len(items) <= 1:
            # Not actually a list — leave the paragraph alone (but without
            # the DEVOIRS ÉCRITS prefix, which the reader's section eyebrow
            # already shows).
            b["html"] = f"<p>{inner}</p>" if inner else b["html"]
            continue
        lis = "".join(f"<li><span>{it}.</span></li>" for it in items)
        b["html"] = f'<ol class="devoirs-list">{lis}</ol>'
        b["kind"] = "list"


# Paragraphs in the body of long lessons often enumerate alternatives or
# conditions with inline "a) … b) … c) …" markers. Promoting those to a
# proper <ol> dramatically improves scannability. Detected when a paragraph
# has at least two of `a) `, `b) `, `c) `, … in order.
ALPHA_TOKEN_RE = re.compile(r"(?<![\w/])([a-h])\)\s+")


def rewrite_alpha_lists(blocks: list[dict[str, Any]]) -> None:
    """In-place: split paragraphs that contain `a) X b) Y c) Z …` enumerations
    into a leading paragraph (the prelude) plus an `<ol class="alpha-list">`.
    Also processes the body <p> inside a sub-heading block (h3 + p), so
    sub-section bodies get the list treatment too. Conservative: requires
    at least three consecutive ordinals in order (a → b → c)."""
    out_blocks: list[dict[str, Any]] = []
    for b in blocks:
        if b.get("kind") not in ("paragraph", "sub-heading"):
            out_blocks.append(b)
            continue
        if "<ol" in b["html"] or "<ul" in b["html"]:
            out_blocks.append(b)
            continue
        soup = BeautifulSoup(b["html"], "html.parser")
        # For sub-heading blocks, the heading is an <h3>; the body is the
        # sibling <p>. Operate on whichever <p> exists.
        p = soup.find("p")
        if not p:
            out_blocks.append(b)
            continue
        # Capture any leading siblings (the h3 in a sub-heading block) so we
        # can keep them intact ahead of the split result.
        leading_html = ""
        for sib in p.find_previous_siblings():
            leading_html = str(sib) + leading_html
        inner = p.decode_contents()
        # Find ordinals + group into consecutive a→b→c… runs. A paragraph
        # can hold several lists in succession ("…trois choses : a) X b) Y
        # c) Z. Nous trouvons les mêmes dans … : a) U b) V c) W").
        positions = [(m.start(), m.group(1), m.end()) for m in ALPHA_TOKEN_RE.finditer(inner)]
        expected = "abcdefghij"
        runs: list[list[tuple[int, str, int]]] = []
        current_run: list[tuple[int, str, int]] = []
        for pos in positions:
            letter = pos[1]
            next_expected_idx = len(current_run)
            if next_expected_idx < len(expected) and letter == expected[next_expected_idx]:
                current_run.append(pos)
            else:
                # Letter break: close the current run; if this letter starts
                # a fresh "a)" the new run begins with it.
                if current_run:
                    runs.append(current_run)
                current_run = [pos] if letter == "a" else []
        if current_run:
            runs.append(current_run)
        # Keep only runs of length >= 3 — anything shorter is more likely an
        # inline reference like "(a)" than a list.
        runs = [r for r in runs if len(r) >= 3]
        if not runs:
            out_blocks.append(b)
            continue
        # Walk the inner HTML, emitting:
        #   - prose between runs (as paragraph blocks)
        #   - the list itself (as list block)
        # The very first chunk is the prelude (may include the leading text
        # before the first run).
        new_blocks: list[dict[str, Any]] = []
        cursor = 0
        for run_idx, run in enumerate(runs):
            prelude_html = inner[cursor : run[0][0]].strip()
            # Drop trailing punctuation that introduces the list (": ", " : ").
            prelude_html = re.sub(r"\s*[:.,;\-—–]\s*$", "", prelude_html).strip()
            if prelude_html:
                new_blocks.append({"html": f"<p>{prelude_html}</p>", "kind": "paragraph"})
            items: list[str] = []
            # For the LAST item of a non-final run, the boundary to the
            # next run's "a)" includes both the item body AND any prose
            # that introduces the next list. Cut at the first sentence-end
            # so the item gets just its own content.
            run_end_in_inner = len(inner)
            last_item_extra_prose = ""
            if run_idx + 1 < len(runs):
                next_run_start = runs[run_idx + 1][0][0]
                last_chunk = inner[run[-1][2] : next_run_start]
                m = re.search(r"[.!?]\s+", last_chunk)
                if m:
                    run_end_in_inner = run[-1][2] + m.start() + 1  # include the period
                    last_item_extra_prose = last_chunk[m.end() :]
                else:
                    run_end_in_inner = next_run_start
            for i, (_s, _l, after_end) in enumerate(run):
                if i + 1 < len(run):
                    end = run[i + 1][0]
                else:
                    end = run_end_in_inner
                chunk = inner[after_end:end].strip()
                chunk = re.sub(r"\s+", " ", chunk)
                chunk = chunk.rstrip(".  ;,").strip()
                if chunk:
                    items.append(chunk)
            if len(items) >= 3:
                lis = "".join(f"<li><span>{it}.</span></li>" for it in items)
                new_blocks.append({"html": f'<ol class="alpha-list">{lis}</ol>', "kind": "list"})
            # Intermediate prose between this run's last item and the next
            # run's "a)" becomes a paragraph (next run's prelude).
            if last_item_extra_prose.strip():
                cursor_for_intermezzo = run_end_in_inner
                next_run_start = runs[run_idx + 1][0][0] if run_idx + 1 < len(runs) else len(inner)
                intermezzo = inner[cursor_for_intermezzo:next_run_start].strip()
                intermezzo = re.sub(r"\s*[:.,;\-—–]\s*$", "", intermezzo).strip()
                if intermezzo:
                    new_blocks.append({"html": f"<p>{intermezzo}</p>", "kind": "paragraph"})
                cursor = next_run_start
            else:
                cursor = runs[run_idx + 1][0][0] if run_idx + 1 < len(runs) else run[-1][2]
        # Trailing prose after the last run.
        trailing = inner[cursor:].strip()
        # Drop a trailing closing period left from item-end re-split.
        trailing = re.sub(r"^\s*[.,;\-—–:\s]+", "", trailing).strip()
        if trailing:
            new_blocks.append({"html": f"<p>{trailing}</p>", "kind": "paragraph"})
        if not new_blocks:
            out_blocks.append(b)
            continue
        # First emitted block carries the leading <h3> (if any). Subsequent
        # blocks reuse the same section.
        if leading_html:
            new_blocks[0]["html"] = leading_html + new_blocks[0]["html"]
            new_blocks[0]["kind"] = b.get("kind") if new_blocks[0]["kind"] == "paragraph" else new_blocks[0]["kind"]
        for nb in new_blocks:
            out_blocks.append({**b, **nb})
    blocks[:] = out_blocks


# Apple's .doc → HTML converter inserts <span class="Apple-converted-space">
# around runs of multiple spaces (so they survive HTML whitespace collapse),
# and <span class="Apple-tab-span"> for tab characters. They're rendering
# artifacts that don't carry semantics; they also break our flex-based <ol>
# list-item layout by introducing extra anonymous flex children. Strip them
# everywhere, leaving just a plain text space.
APPLE_SPAN_RE = re.compile(
    r'<span class="Apple-(?:converted-space|tab-span)">\s*</span>', re.I
)
APPLE_SPAN_FULL_RE = re.compile(
    r'<span class="Apple-(?:converted-space|tab-span)">(\s+)</span>', re.I
)


def cleanup_apple_spans(blocks: list[dict[str, Any]]) -> None:
    """In-place: remove Apple-converted-space / Apple-tab-span wrappers,
    keeping their whitespace content as plain text."""
    for b in blocks:
        h = b["html"]
        h = APPLE_SPAN_FULL_RE.sub(lambda m: m.group(1), h)
        h = APPLE_SPAN_RE.sub(" ", h)
        # Collapse runs of spaces left behind into a single space (but don't
        # touch leading/trailing whitespace inside tags — those are rare).
        h = re.sub(r" {2,}", " ", h)
        b["html"] = h


FOOTNOTE_CLASS_RE = re.compile(r'class\s*=\s*"p(\d+)"')


def is_footnote_paragraph(raw_html: str) -> bool:
    m = FOOTNOTE_CLASS_RE.search(raw_html)
    if not m:
        return False
    return int(m.group(1)) >= 477


def trim_trailing_junk(blocks: list[str]) -> list[str]:
    """Truncate at "INDEX ALPHABÉTIQUE DES MATIÈRES" — this is tome I's
    alphabetical index, which sits inside tome I's last leçon and is
    followed by tome II's booklet title page. We drop both in one cut.

    We deliberately do NOT trim at "MANUEL D'INSTRUCTION RELIGIEUSE" alone:
    that string also appears legitimately at the top of tome III leçon 1
    (the tome's own booklet title page, which our splice rolls into leçon 1
    on purpose).
    """
    for i, raw_html in enumerate(blocks):
        soup = BeautifulSoup(raw_html, "html.parser")
        txt = soup.get_text(" ", strip=True)
        if not txt:
            continue
        if "INDEX ALPHABÉTIQUE DES MATIÈRES" in txt:
            return blocks[:i]
    return blocks


def main() -> None:
    ensure_html()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if OUT_LESSONS.exists():
        for f in OUT_LESSONS.iterdir():
            if f.suffix == ".json":
                f.unlink()
    OUT_LESSONS.mkdir(parents=True, exist_ok=True)

    data = extract()
    lessons = data["lessons"]
    print(f"  detected {len(lessons)} leçons")
    by_tome: dict[int, int] = {}
    for L in lessons:
        by_tome[L["tome"]] = by_tome.get(L["tome"], 0) + 1
    for t, c in sorted(by_tome.items()):
        print(f"    tome {t}: {c}")

    # Write per-leçon files + structure
    structure = {
        "tomes": [
            {"n": n, "title": TOME_TITLES.get(n, ""), "lessons": []}
            for n in (1, 2, 3)
        ],
    }
    seen_slugs: set[str] = set()
    sommaire_buf: dict[int, list[dict[str, Any]]] = {}
    for L in lessons:
        slug_base = f"tome-{L['tome']}-lecon-{L['n']:02d}"
        if L["title"]:
            slug_base += "-" + slugify(L["title"])
        slug = slug_base
        i = 2
        while slug in seen_slugs:
            slug = f"{slug_base}-{i}"
            i += 1
        seen_slugs.add(slug)
        L["slug"] = slug
        # 1) Drop the now-redundant synopsis section (replaced by mini-TOC).
        # 2) Rewrite Roman + sub-numbered dev headings into <h2>/<h3> and
        #    build the nested mini-TOC.
        # 3) Drop the section-name divider blocks (DÉVELOPPEMENT, LECTURES.,
        #    Conclusion pratique, etc.).
        # 4) Rewrite the devoirs paragraph into a proper <ol>.
        L["blocks"] = strip_synopsis(L["blocks"])
        # Apple-span scrub goes first so subsequent text-pattern detectors
        # (alpha-list, devoirs) see clean " " separators instead of
        # <span class="Apple-converted-space">  </span> wrappers between
        # the `a)` ordinal and its content.
        cleanup_apple_spans(L["blocks"])
        mini_toc = build_mini_toc(L["blocks"])
        L["blocks"] = strip_section_name_headings(L["blocks"])
        rewrite_devoirs_as_ol(L["blocks"])
        rewrite_alpha_lists(L["blocks"])
        out = {
            "slug": slug,
            "tome": L["tome"],
            "tome_title": TOME_TITLES.get(L["tome"], ""),
            "n": L["n"],
            "title": L["title"] or f"Leçon {L['n']}",
            "mini_toc": mini_toc,
            "blocks": L["blocks"],
        }
        (OUT_LESSONS / f"{slug}.json").write_text(json.dumps(out, ensure_ascii=False))
        for tome_entry in structure["tomes"]:
            if tome_entry["n"] == L["tome"]:
                tome_entry["lessons"].append(
                    {"slug": slug, "n": L["n"], "title": out["title"]}
                )
                break
        # Sommaire data is sibling to structure but carries the full mini_toc
        # per lesson — used only by the sommaire page (which renders nested
        # outlines). Keeping it out of structure.json keeps the landing/
        # sidebar payload slim.
        sommaire_entry = {"slug": slug, "mini_toc": mini_toc}
        sommaire_buf.setdefault(L["tome"], []).append(sommaire_entry)

    (OUT_DIR / "structure.json").write_text(
        json.dumps(structure, ensure_ascii=False, indent=2)
    )
    # Companion file: mini_toc per lesson, grouped by tome. Loaded only by
    # the sommaire page so the landing/sidebar payload stays slim.
    sommaire = {
        "tomes": [
            {
                "n": n,
                "title": TOME_TITLES.get(n, ""),
                "lessons": sommaire_buf.get(n, []),
            }
            for n in (1, 2, 3)
        ]
    }
    (OUT_DIR / "sommaire.json").write_text(
        json.dumps(sommaire, ensure_ascii=False)
    )
    print(f"  wrote {len(lessons)} lesson shards + structure.json + sommaire.json")


if __name__ == "__main__":
    main()
