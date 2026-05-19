#!/usr/bin/env python3
"""Generate 3000x3000 album cover art for the CCC V2 audiobook.

Recreates the homepage dark-theme title block with Libre Baskerville + logo.

Usage:
  python scripts/generate_album_art.py [--out PATH]
  python scripts/generate_album_art.py --embed ~/Documents/ccc_v2_audio
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Design tokens (dark theme from app.css)
# ---------------------------------------------------------------------------
BG      = (17, 17, 19)       # #111113
HEADING = (197, 187, 176)    # #c5bbb0
MUTED   = (165, 164, 166)    # #a5a4a6
ACCENT  = (212, 80, 80)      # #d45050
RULE_C  = (80, 78, 82)       # dimmed rule

SIZE = 3000

ROOT = Path(__file__).resolve().parent.parent
LOGO      = ROOT / "static/img/logo/logo-dark-192.png"
FONT_BOLD = Path.home() / "Library/Fonts/LibreBaskerville-Bold.ttf"
FONT_ITAL = Path.home() / "Library/Fonts/LibreBaskerville-Italic.ttf"
FONT_SANS_SRC = ROOT / "static/fonts/Gotham-Medium.woff2"
FONT_SANS     = Path("/tmp/Gotham-Medium.ttf")  # converted from woff2 at runtime


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_gotham() -> None:
    if not FONT_SANS.exists():
        from fontTools.ttLib import TTFont as _TTFont
        f = _TTFont(str(FONT_SANS_SRC))
        f.flavor = None
        f.save(str(FONT_SANS))


def _load_sans(size: int) -> ImageFont.FreeTypeFont:
    _ensure_gotham()
    return ImageFont.truetype(str(FONT_SANS), size)


def _text_w(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> float:
    return draw.textlength(text, font=font)


def _cx_text(draw: ImageDraw.ImageDraw, y: int, text: str,
             font: ImageFont.FreeTypeFont, color: tuple,
             letter_spacing: int = 0) -> None:
    """Draw horizontally centered text with optional manual letter spacing."""
    if letter_spacing == 0:
        w = _text_w(draw, text, font)
        draw.text(((SIZE - w) / 2, y), text, font=font, fill=color)
        return
    total = sum(_text_w(draw, c, font) for c in text) + letter_spacing * (len(text) - 1)
    x = (SIZE - total) / 2
    for ch in text:
        draw.text((x, y), ch, font=font, fill=color)
        x += _text_w(draw, ch, font) + letter_spacing


def _font_height(font: ImageFont.FreeTypeFont) -> int:
    bbox = font.getbbox("Ag")
    return bbox[3] - bbox[1]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def generate(out_path: Path) -> None:
    img = Image.new("RGB", (SIZE, SIZE), BG)
    draw = ImageDraw.Draw(img)

    # -- fonts ---------------------------------------------------------------
    # Scale main serif so "L'ÉGLISE CATHOLIQUE" fits in canvas − 400px margins
    max_w = SIZE - 400
    main_sz = 220
    font_bold = ImageFont.truetype(str(FONT_BOLD), main_sz)
    while _text_w(draw, "L'ÉGLISE CATHOLIQUE", font_bold) > max_w:
        main_sz -= 2
        font_bold = ImageFont.truetype(str(FONT_BOLD), main_sz)

    de_sz = int(main_sz * 0.42)
    font_ital   = ImageFont.truetype(str(FONT_ITAL), de_sz)
    font_ornmt  = ImageFont.truetype(str(FONT_BOLD), 110)
    font_sm     = _load_sans(58)

    h_main   = _font_height(font_bold)
    h_de     = _font_height(font_ital)
    h_ornmt  = _font_height(font_ornmt)
    h_sm     = _font_height(font_sm)

    LOGO_SZ  = 260
    GAP_LOGO = 90
    GAP_AB   = 110     # below AUDIOBOOK
    GAP_DE   = 36      # above/below "de" line
    GAP_ORN  = 100     # below L'ÉGLISE before ornament
    GAP_RULE = 40
    GAP_ED   = 50

    total = (LOGO_SZ + GAP_LOGO
             + h_sm + GAP_AB
             + h_main + GAP_DE
             + h_de   + GAP_DE
             + h_main + GAP_ORN
             + h_ornmt + GAP_RULE + 2 + GAP_ED
             + h_sm)

    y = (SIZE - total) // 2 - 140

    # -- logo ----------------------------------------------------------------
    logo = Image.open(LOGO).convert("RGBA").resize((LOGO_SZ, LOGO_SZ), Image.LANCZOS)
    img.paste(logo, ((SIZE - LOGO_SZ) // 2, y), logo)
    y += LOGO_SZ + GAP_LOGO

    # -- AUDIOBOOK -----------------------------------------------------------
    _cx_text(draw, y, "AUDIOBOOK", font_sm, MUTED, letter_spacing=22)
    y += h_sm + GAP_AB

    # -- CATÉCHISME ----------------------------------------------------------
    _cx_text(draw, y, "CATÉCHISME", font_bold, HEADING)
    y += h_main + GAP_DE

    # -- — de — (with flanking rules) ----------------------------------------
    de_w   = _text_w(draw, "de", font_ital)
    flank  = int(main_sz * 1.1)
    gap    = 48
    row_w  = flank + gap + de_w + gap + flank
    x0     = (SIZE - row_w) / 2
    mid_y  = y + h_de * 0.55
    draw.line([(x0, mid_y), (x0 + flank, mid_y)], fill=RULE_C, width=2)
    draw.text((x0 + flank + gap, y), "de", font=font_ital, fill=MUTED)
    x1 = x0 + flank + gap + de_w + gap
    draw.line([(x1, mid_y), (x1 + flank, mid_y)], fill=RULE_C, width=2)
    y += h_de + GAP_DE

    # -- L'ÉGLISE CATHOLIQUE -------------------------------------------------
    _cx_text(draw, y, "L’ÉGLISE CATHOLIQUE", font_bold, HEADING)
    y += h_main + GAP_ORN

    # -- ✠ ornament ----------------------------------------------------------
    _cx_text(draw, y, "✠", font_ornmt, ACCENT)
    y += h_ornmt + GAP_RULE

    # -- thin rule -----------------------------------------------------------
    rl = 140
    rx = (SIZE - rl) // 2
    draw.line([(rx, y), (rx + rl, y)], fill=RULE_C, width=1)
    y += 2 + GAP_ED

    # -- Édition française définitive ----------------------------------------
    _cx_text(draw, y, "ÉDITION FRANÇAISE DÉFINITIVE", font_sm, MUTED, letter_spacing=14)

    # -- save ----------------------------------------------------------------
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(out_path), "JPEG", quality=96)
    print(f"Saved  {out_path}  ({SIZE}x{SIZE})")


def embed_into_dir(audio_dir: Path, cover: Path) -> None:
    """Embed cover art into every MP3 in audio_dir (recursive)."""
    try:
        from mutagen.id3 import ID3, APIC, error as ID3Error
        from mutagen.mp3 import MP3
    except ImportError:
        print("pip install mutagen  — needed for embedding.")
        return

    cover_data = cover.read_bytes()
    mp3s = list(audio_dir.rglob("*.mp3"))
    print(f"Embedding cover into {len(mp3s)} MP3s…")
    for p in mp3s:
        try:
            tags = ID3(str(p))
        except ID3Error:
            audio = MP3(str(p))
            audio.add_tags()
            tags = audio.tags
        tags.delall("APIC")
        tags.add(APIC(
            encoding=3,       # UTF-8
            mime="image/jpeg",
            type=3,           # front cover
            desc="Cover",
            data=cover_data,
        ))
        tags.save(str(p))
        print(f"  OK  {p.name}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", type=Path,
                   default=Path.home() / "Documents/ccc_v2_audio/cover.jpg",
                   help="Output JPEG path. Default: ~/Documents/ccc_v2_audio/cover.jpg")
    p.add_argument("--embed", type=Path, default=None, metavar="AUDIO_DIR",
                   help="After generating, embed cover into every MP3 in AUDIO_DIR.")
    args = p.parse_args()

    generate(args.out)

    if args.embed:
        embed_into_dir(args.embed, args.out)


if __name__ == "__main__":
    main()
