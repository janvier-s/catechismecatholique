"""Build the Trent (Catechism of the Council of Trent) audio manifest.

Differences from the CCC pipeline:
  - No paragraph-number announces (Trent traditionally has no §-numbers).
  - No citation voice — Remy reads italic scripture quotes inline.
  - No "en bref" concept.
  - Footnote sups (<sup class="trentRef">) are stripped silently.
  - One V2 file per section. Each part > chapter > section.
  - "Continuation du même sujet" chapter titles resolve to the parent topic.
"""
from __future__ import annotations

import datetime
import html as html_lib
import json
import re
import unicodedata
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ccc_audio import (
    apply_general_replacements,
    convert_roman_numerals,
    fix_saint_liaison,
)


def _slugify(text: str) -> str:
    """Lowercase, strip accents, collapse non-alphanum into single hyphens."""
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")

VOICES = {
    "gerard": "fr-BE-GerardNeural",
    "remy":   "fr-FR-RemyMultilingualNeural",
}
VOICE_OPTS = {
    "gerard": {"volume": "-10%"},
    "remy":   {"rate": "-10%"},
}


# ---------------------------------------------------------------------------
# HTML cleanup
# ---------------------------------------------------------------------------

_RE_SUP_REF = re.compile(r'<sup\b[^>]*>.*?</sup>', re.DOTALL)
_RE_BR = re.compile(r'<br\s*/?>', re.IGNORECASE)
_RE_TAG = re.compile(r'<[^>]+>')
_RE_WS = re.compile(r'\s+')
_RE_SPACE_BEFORE_PUNCT = re.compile(r'\s+([.,])')
_RE_SPACE_BEFORE_GUILLEMET = re.compile(r'(\S)»')
_RE_GUILLEMET_PERIOD = re.compile(r'\s*»\s*\.')


def clean_trent_html(raw: str) -> str:
    """Strip Trent paragraph HTML to plain text.

    - Removes <sup class="trentRef">N</sup> footnote markers entirely.
    - Drops <i>, <em>, etc. tags but keeps their content (inline quotes).
    - Decodes HTML entities (&nbsp;, &mdash;, etc.).
    - Normalises French punctuation spacing.
    """
    text = _RE_SUP_REF.sub("", raw)
    text = _RE_BR.sub(" ", text)
    text = _RE_TAG.sub("", text)
    text = html_lib.unescape(text)
    text = text.replace(" ", " ")  # NBSP → space
    text = _RE_WS.sub(" ", text)
    text = _RE_SPACE_BEFORE_PUNCT.sub(r"\1", text)
    text = _RE_SPACE_BEFORE_GUILLEMET.sub(r"\1 »", text)
    text = _RE_GUILLEMET_PERIOD.sub(". »", text)
    return text.strip()


def _build_body_text(raw_html: str) -> str:
    text = clean_trent_html(raw_html)
    text = fix_saint_liaison(text)
    text = apply_general_replacements(text)
    text = convert_roman_numerals(text)
    return text


def _build_heading_text(title: str) -> str:
    """Clean a chapter / section title for Gérard to read."""
    text = clean_trent_html(title)
    text = fix_saint_liaison(text)
    text = convert_roman_numerals(text)
    return text


# ---------------------------------------------------------------------------
# "Continuation" chapter title resolution
# ---------------------------------------------------------------------------

_RE_CONTINUATION = re.compile(
    r"^Continuation\s+du\s+même\s+sujet\b\s*[\.\s]*",
    re.IGNORECASE,
)


def _lowercase_first(s: str) -> str:
    return s[:1].lower() + s[1:] if s else s


def resolve_chapter_spoken_title(title: str, parent_topic: str | None) -> str:
    """For 'Continuation du même sujet[. subtitle]' chapters, swap in the parent.

    Examples (parent_topic = 'Du Sacrement de Pénitence'):
      'Continuation du même sujet'                  → 'Suite du Sacrement de Pénitence'
      'Continuation du même sujet. De la Contrition'→ 'Suite du Sacrement de Pénitence : De la Contrition'

    Non-continuation chapters are returned unchanged.
    """
    m = _RE_CONTINUATION.match(title)
    if not m or not parent_topic:
        return title
    tail = title[m.end():].strip().rstrip(".").strip()
    base = "Suite " + _lowercase_first(parent_topic)
    if tail:
        return f"{base} : {tail}"
    return base


# ---------------------------------------------------------------------------
# Manifest construction
# ---------------------------------------------------------------------------

def _location(
    *,
    part_idx: int,
    part: dict,
    chapter: dict,
    chapter_spoken_title: str,
    section: dict | None = None,
) -> dict:
    loc: dict = {
        "part_index": part_idx,
        "part_slug": part["slug"],
        "part_title": part["title"],
        "chapter_number": chapter["number"],
        "chapter_slug": chapter["slug"],
        "chapter_title": chapter["title"],
        "chapter_spoken_title": chapter_spoken_title,
        "section_ordinal": None,
        "section_slug": None,
        "section_title": None,
    }
    if section is not None:
        loc["section_ordinal"] = section["ordinal"]
        loc["section_slug"] = section["slug"]
        loc["section_title"] = section["title"]
    return loc


def _file_key(*, part_idx: int, part_title: str,
              chapter_number: int, chapter_spoken_title: str,
              section_ordinal: int, section_title: str) -> str:
    """Audio file path stem. Matches the on-disk MP3 layout exactly (sans .mp3)."""
    return (
        f"{part_idx:02d}-{_slugify(part_title)}/"
        f"{chapter_number:02d}-{_slugify(chapter_spoken_title)}/"
        f"{section_ordinal:02d}-{_slugify(section_title)}"
    )


def _load_section(sections_dir: Path, chapter_slug: str, section_slug: str) -> dict:
    path = sections_dir / chapter_slug / f"{section_slug}.json"
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def build_manifest(
    *,
    structure_path: Path,
    sections_dir: Path,
) -> dict:
    """Walk Trent's structure and assemble the audio manifest."""
    with structure_path.open(encoding="utf-8") as f:
        structure = json.load(f)

    entries: list[dict] = []
    seq = 0
    parent_topic: str | None = None

    for part_idx, part in enumerate(structure.get("parts", [])):
        for chapter in part.get("chapters", []):
            spoken_title = resolve_chapter_spoken_title(chapter["title"], parent_topic)
            # Track the most recent non-continuation chapter as the parent topic.
            if not _RE_CONTINUATION.match(chapter["title"]):
                parent_topic = chapter["title"]

            sections = chapter.get("sections", [])
            for sec_idx, section in enumerate(sections):
                loc_section = _location(
                    part_idx=part_idx, part=part, chapter=chapter,
                    chapter_spoken_title=spoken_title, section=section,
                )
                file_key = _file_key(
                    part_idx=part_idx, part_title=part["title"],
                    chapter_number=chapter["number"],
                    chapter_spoken_title=spoken_title,
                    section_ordinal=section["ordinal"],
                    section_title=section["title"],
                )

                # Chapter heading on the FIRST section of each chapter.
                if sec_idx == 0:
                    seq += 1
                    entries.append({
                        "seq": seq,
                        "kind": "heading",
                        "level": "chapter",
                        "file_key": file_key,
                        "location": loc_section,
                        "segments": [{
                            "voice": "gerard",
                            "text": _build_heading_text(spoken_title),
                            "targets": ["v2"],
                        }],
                    })

                # Section heading.
                seq += 1
                entries.append({
                    "seq": seq,
                    "kind": "heading",
                    "level": "section",
                    "file_key": file_key,
                    "location": loc_section,
                    "segments": [{
                        "voice": "gerard",
                        "text": _build_heading_text(section["title"]),
                        "targets": ["v2"],
                    }],
                })

                # Paragraphs in this section.
                section_data = _load_section(sections_dir, chapter["slug"], section["slug"])
                for paragraph in section_data.get("paragraphs", []):
                    body = _build_body_text(paragraph["html"])
                    if not body:
                        continue
                    seq += 1
                    entries.append({
                        "seq": seq,
                        "kind": "paragraph",
                        "number": paragraph["number"],
                        "file_key": file_key,
                        "location": loc_section,
                        "segments": [{
                            "voice": "remy",
                            "text": body,
                            "targets": ["v2"],
                        }],
                    })

    return {
        "version": 1,
        "corpus": "trent",
        "generated_at": datetime.datetime.now(datetime.timezone.utc)
                          .isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": str(structure_path.parent),
        "voices": VOICES,
        "voice_opts": VOICE_OPTS,
        "entries": entries,
    }


# ---------------------------------------------------------------------------
# V2 file grouping
# ---------------------------------------------------------------------------

def build_v2_file_groups(manifest: dict) -> list[dict]:
    """Group manifest entries into per-section MP3 files.

    Each group's `file_key` matches the manifest entries' file_key.
    Order: chapter_heading (if present) → section_heading → paragraphs (asc).
    Returns dicts shaped for render_ccc_audio_lib.render_v2_group():
      {file_key, paragraph_range, location, entries}
    """
    by_key: dict[str, list[dict]] = {}
    order: list[str] = []
    for entry in manifest["entries"]:
        key = entry["file_key"]
        if key not in by_key:
            by_key[key] = []
            order.append(key)
        by_key[key].append(entry)

    groups: list[dict] = []
    for key in order:
        bucket = by_key[key]
        paragraphs = [e for e in bucket if e["kind"] == "paragraph"]
        if not paragraphs:
            continue
        nums = [e["number"] for e in paragraphs]
        # The section heading entry holds the canonical location for this file.
        section_heading = next(
            (e for e in bucket
             if e["kind"] == "heading" and e.get("level") == "section"),
            bucket[0],
        )
        groups.append({
            "file_key": key,
            "paragraph_range": [min(nums), max(nums)],
            "location": section_heading["location"],
            "entries": bucket,
        })
    return groups
