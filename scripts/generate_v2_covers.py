#!/usr/bin/env python3
"""Generate per-file 1000×1000 cover art for CCC V2 audiobook MP3s.

Each cover keeps the shared album header (logo + title) and adds a
file-specific type label, section title(s), and paragraph range.

Usage:
  python scripts/generate_v2_covers.py \\
    --audio-dir ~/Documents/ccc_v2_audio \\
    --manifest  /tmp/ccc_audio.manifest.json \\
    [--dry-run]
"""
from __future__ import annotations

import argparse
import re
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Design tokens (match generate_album_art.py / app.css dark theme)
# ---------------------------------------------------------------------------
BG      = (17,  17,  19)     # #111113
HEADING = (197, 187, 176)    # #c5bbb0
MUTED   = (128, 126, 132)    # dimmer than body text
ACCENT  = (212,  80,  80)    # #d45050
RULE_C  = (60,  58,  62)

SIZE = 1000

ROOT          = Path(__file__).resolve().parent.parent
FONT_BOLD     = Path.home() / "Library/Fonts/LibreBaskerville-Bold.ttf"
FONT_ITAL     = Path.home() / "Library/Fonts/LibreBaskerville-Italic.ttf"
FONT_SANS_SRC = ROOT / "static/fonts/Gotham-Medium.woff2"
FONT_SANS     = Path("/tmp/Gotham-Medium.ttf")

# The shared album cover — per-file overlays are composited on top of this.
COVER_IMG_DEFAULT = Path.home() / "Documents/ccc_v2_audio/cover.jpg"
# Row (at SIZE×SIZE) where the cover's existing content ends and our overlay begins.
OVERLAY_TOP = 700


# ---------------------------------------------------------------------------
# Font helpers
# ---------------------------------------------------------------------------

def _ensure_gotham() -> None:
    if not FONT_SANS.exists():
        from fontTools.ttLib import TTFont as _TTFont
        f = _TTFont(str(FONT_SANS_SRC))
        f.flavor = None
        f.save(str(FONT_SANS))


def _sans(size: int) -> ImageFont.FreeTypeFont:
    _ensure_gotham()
    return ImageFont.truetype(str(FONT_SANS), size)


def _serif(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD), size)


def _serif_ital(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_ITAL), size)


def _line_h(font: ImageFont.FreeTypeFont) -> int:
    bb = font.getbbox("Ag")
    return bb[3] - bb[1]


def _text_w(draw: ImageDraw.ImageDraw, text: str,
            font: ImageFont.FreeTypeFont) -> float:
    return draw.textlength(text, font=font)


def _draw_centered(draw: ImageDraw.ImageDraw, y: int, text: str,
                   font: ImageFont.FreeTypeFont, color: tuple) -> int:
    """Draw centered text, return new y (y + line height)."""
    w = _text_w(draw, text, font)
    draw.text(((SIZE - w) / 2, y), text, font=font, fill=color)
    return y + _line_h(font)


def _wrap_text(text: str, draw: ImageDraw.ImageDraw,
               font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    """Word-wrap text to fit within max_w pixels."""
    if _text_w(draw, text, font) <= max_w:
        return [text]
    words = text.split()
    lines: list[str] = []
    current = ""
    for w in words:
        test = (current + " " + w).strip()
        if _text_w(draw, test, font) <= max_w:
            current = test
        else:
            if current:
                lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines or [text]


def _fit_font_serif(text: str, draw: ImageDraw.ImageDraw,
                    max_w: int, start_size: int = 72,
                    min_size: int = 22) -> ImageFont.FreeTypeFont:
    """Return a serif bold font scaled so text fits in max_w."""
    sz = start_size
    while sz >= min_size:
        f = _serif(sz)
        if _text_w(draw, text, font=f) <= max_w:
            return f
        sz -= 2
    return _serif(min_size)


# ---------------------------------------------------------------------------
# Cover info derivation
# ---------------------------------------------------------------------------

def _derive(group: dict) -> dict:
    """Return display fields for one file group.

    Keys:
      label     str | None   — e.g. "ARTICLE 9", "EN BREF", "CHAPITRE 2"
      title     str          — main title text
      label2    str | None   — secondary label (chapter+article1 case)
      title2    str | None   — secondary title
      range_str str          — e.g. "§748 · 976"
      eb        bool         — True for en_bref level (colors differently)
    """
    loc   = group["location"]
    rng   = group["paragraph_range"]
    lo, hi = rng[0], rng[1]
    range_str = f"{lo} · {hi}" if lo != hi else str(lo)

    entries = group["entries"]
    first_h = next((e for e in entries if e["kind"] == "heading"), None)
    level   = first_h["level"] if first_h else "unknown"

    def _chapter_label(n: int | None) -> str:
        return f"CHAPITRE {n}" if n else "CHAPITRE"

    def _article_label(n: int | None) -> str:
        return f"ARTICLE {n}" if n else "ARTICLE"

    def _loc_title() -> str:
        """Best available title from location fields."""
        return (loc.get("chapter_title") or loc.get("section_title")
                or loc.get("part_title") or "")

    if level == "chapter":
        second_h = next(
            (e for e in entries
             if e["kind"] == "heading" and e is not first_h),
            None,
        )
        if second_h and second_h["level"] == "article":
            # Preamble chapter heading + first article in same file
            ch_num    = loc.get("chapter_number")
            ch_title  = _loc_title()
            art_loc   = second_h.get("location", loc)
            art_num   = art_loc.get("article_number") or loc.get("article_number")
            art_title = (art_loc.get("article_title") or loc.get("article_title") or "")
            return dict(
                label=_chapter_label(ch_num), title=ch_title,
                label2=_article_label(art_num), title2=art_title,
                range_str=range_str, eb=False,
            )
        ch_num   = loc.get("chapter_number")
        ch_title = _loc_title()
        return dict(label=_chapter_label(ch_num) if ch_num else None,
                    title=ch_title, label2=None, title2=None,
                    range_str=range_str, eb=False)

    if level == "article":
        art_num    = loc.get("article_number")
        art_title  = loc.get("article_title") or ""
        para_num   = group.get("paragraphe_number")
        para_title = group.get("paragraphe_title")
        if para_num is not None and para_title:
            return dict(
                label=_article_label(art_num), title=art_title,
                label2=f"PARAGRAPHE {para_num}", title2=para_title,
                range_str=range_str, eb=False,
            )
        return dict(label=_article_label(art_num), title=art_title,
                    label2=None, title2=None,
                    range_str=range_str, eb=False)

    if level == "en_bref":
        container = (loc.get("article_title") or loc.get("chapter_title")
                     or loc.get("section_title") or "")
        return dict(label="EN BREF", title=container,
                    label2=None, title2=None,
                    range_str=range_str, eb=True)

    if level == "continuation":
        container = (loc.get("article_title") or loc.get("chapter_title")
                     or loc.get("section_title") or "")
        para_num   = group.get("paragraphe_number")
        para_title = group.get("paragraphe_title")
        if para_num is not None and para_title:
            return dict(
                label=f"PARAGRAPHE {para_num}", title=para_title,
                label2="SUITE", title2=container,
                range_str=range_str, eb=False,
            )
        return dict(label=None, title=container,
                    label2="SUITE", title2=None,
                    range_str=range_str, eb=False)

    # Prologue / section intro / other
    title = _loc_title() or "Catéchisme"
    return dict(label=None, title=title, label2=None, title2=None,
                range_str=range_str, eb=False)


# ---------------------------------------------------------------------------
# Image rendering
# ---------------------------------------------------------------------------

SIDE_MARGIN = 70
MAX_W       = SIZE - 2 * SIDE_MARGIN  # 860px usable width
LINE_GAP    = 12    # extra between lines
SECTION_GAP = 28    # gap between label and title, or between sections


def _render_section(draw: ImageDraw.ImageDraw, y: int, info: dict,
                    is_primary: bool) -> int:
    """Render label + wrapped title. Returns new y."""
    label = info.get("label") if is_primary else info.get("label2")
    title = info.get("title") if is_primary else info.get("title2")
    eb    = info.get("eb", False)

    if not title and not label:
        return y

    label_color = ACCENT if eb else MUTED
    title_color = HEADING

    font_label = _sans(22)
    if label:
        y = _draw_centered(draw, y, label, font_label, label_color) + LINE_GAP

    if title:
        # Pick font size so the longest wrapped line fits
        # Start at 60, scale down until wrapped lines fit
        font_sz = 52 if is_primary else 42
        font    = _serif(font_sz)
        lines   = _wrap_text(title, draw, font, MAX_W)
        while len(lines) > 3 and font_sz > 24:
            font_sz -= 4
            font  = _serif(font_sz)
            lines = _wrap_text(title, draw, font, MAX_W)
        lh = _line_h(font)
        for line in lines:
            y = _draw_centered(draw, y, line, font, title_color) + LINE_GAP
        y += SECTION_GAP // 2

    return y


def generate_cover(info: dict, cover_img: Path = COVER_IMG_DEFAULT) -> Image.Image:
    # Base: the shared album cover resized to working resolution.
    img  = Image.open(cover_img).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
    draw = ImageDraw.Draw(img)

    # ---- OVERLAY SEPARATOR --------------------------------------------------
    draw.line([(SIDE_MARGIN, OVERLAY_TOP), (SIZE - SIDE_MARGIN, OVERLAY_TOP)],
              fill=RULE_C, width=1)

    # ---- CONTENT ZONE (label + title, vertically centred in overlay) --------
    # Available vertical space between separator and range footer.
    RANGE_Y    = SIZE - 72        # where the range number sits
    content_y0 = OVERLAY_TOP + 22
    content_y1 = RANGE_Y - 18

    has_secondary = bool(info.get("title2") or info.get("label2"))

    def _measure_content() -> int:
        h = 0
        for is_prim in ([True] + ([False] if has_secondary else [])):
            label = info.get("label") if is_prim else info.get("label2")
            title = info.get("title") if is_prim else info.get("title2")
            if label:
                h += _line_h(_sans(22)) + LINE_GAP
            if title:
                font_sz = 52 if is_prim else 42
                font    = _serif(font_sz)
                lines   = _wrap_text(title, draw, font, MAX_W)
                while len(lines) > 3 and font_sz > 24:
                    font_sz -= 4
                    font  = _serif(font_sz)
                    lines = _wrap_text(title, draw, font, MAX_W)
                h += _line_h(font) * len(lines) + LINE_GAP * len(lines) + SECTION_GAP // 2
        if has_secondary:
            h += 22 + 16  # mid-rule + gap
        return h

    total_h = _measure_content()
    content_h = content_y1 - content_y0
    y = content_y0 + max(0, (content_h - total_h) // 2)

    y = _render_section(draw, y, info, is_primary=True)

    if has_secondary:
        y += 10
        draw.line([(SIDE_MARGIN + 60, y), (SIZE - SIDE_MARGIN - 60, y)],
                  fill=RULE_C, width=1)
        y += 16
        y = _render_section(draw, y, info, is_primary=False)

    # ---- RANGE (Gotham, accent colour) -------------------------------------
    draw.line([(SIDE_MARGIN, RANGE_Y - 14), (SIZE - SIDE_MARGIN, RANGE_Y - 14)],
              fill=ACCENT if info.get("eb") else RULE_C, width=1)

    font_range = _sans(44)
    while _text_w(draw, info["range_str"], font_range) > MAX_W:
        font_range = _sans(font_range.size - 2)
    _draw_centered(draw, RANGE_Y, info["range_str"], font_range, ACCENT)

    return img


# ---------------------------------------------------------------------------
# MP3 matching and embedding
# ---------------------------------------------------------------------------

def _scan_mp3s(audio_dir: Path) -> dict[tuple[int, int], Path]:
    """Return {(para_start, para_end): path} for all renamed MP3s."""
    result: dict[tuple[int, int], Path] = {}
    for p in audio_dir.rglob("*.mp3"):
        m = re.search(r"(\d{4})-(\d{4})$", p.stem)
        if m:
            result[(int(m.group(1)), int(m.group(2)))] = p
    return result


def _part_label(loc: dict) -> str:
    """Short section/part label for footer."""
    sn = loc.get("section_title")
    pn = loc.get("part_title")
    if sn and sn != loc.get("chapter_title"):
        return sn.upper()
    return (pn or "").upper()


def generate_all(audio_dir: Path, manifest_path: Path,
                 dry_run: bool = False,
                 cover_img: Path | None = None) -> None:
    import json
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import ccc_audio

    chapters_full_dir = ROOT / "static/data/cec/chapters-full"
    m        = json.loads(manifest_path.read_text(encoding="utf-8"))
    groups   = ccc_audio.build_v2_file_groups(m, chapters_full_dir=chapters_full_dir)
    mp3map   = _scan_mp3s(audio_dir)
    base_img = cover_img or (audio_dir / "cover.jpg")

    print(f"{'DRY RUN — ' if dry_run else ''}Generating {len(groups)} covers…")

    hit = miss = 0
    for g in groups:
        rng = g["paragraph_range"]
        key = (rng[0], rng[1])
        mp3 = mp3map.get(key)
        if mp3 is None:
            print(f"  WARN  no MP3 found for §{key[0]}-{key[1]}")
            miss += 1
            continue

        info = _derive(g)
        info["_part_label"] = _part_label(g["location"])

        if dry_run:
            print(f"  {mp3.name[:60]}  →  {info['label'] or ''} / {info['title'][:40]}")
            hit += 1
            continue

        img     = generate_cover(info, cover_img=base_img)
        jpg_buf = _img_to_bytes(img)
        _embed_apic(mp3, jpg_buf)
        print(f"  OK  {mp3.name[:70]}")
        hit += 1

    print(f"\nDone: {hit} covers{'(dry)' if dry_run else ' embedded'}, {miss} skipped.")


def _img_to_bytes(img: Image.Image) -> bytes:
    import io
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=88)
    return buf.getvalue()


def _embed_apic(mp3: Path, jpeg_data: bytes) -> None:
    from mutagen.id3 import ID3, APIC, error as ID3Error
    from mutagen.mp3 import MP3
    try:
        tags = ID3(str(mp3))
    except ID3Error:
        audio = MP3(str(mp3))
        audio.add_tags()
        tags = audio.tags  # type: ignore[assignment]
    tags.delall("APIC")
    tags.add(APIC(encoding=3, mime="image/jpeg",
                  type=3, desc="Cover", data=jpeg_data))
    tags.save(str(mp3))


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--audio-dir", type=Path,
                   default=Path.home() / "Documents/ccc_v2_audio")
    p.add_argument("--manifest", type=Path,
                   default=Path("/tmp/ccc_audio.manifest.json"))
    p.add_argument("--cover", type=Path, default=None,
                   help="Base cover image. Defaults to <audio-dir>/cover.jpg.")
    p.add_argument("--dry-run", action="store_true",
                   help="Print what would be done without writing any files.")
    args = p.parse_args()

    generate_all(args.audio_dir, args.manifest,
                 dry_run=args.dry_run, cover_img=args.cover)


if __name__ == "__main__":
    main()
