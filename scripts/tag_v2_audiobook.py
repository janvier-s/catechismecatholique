#!/usr/bin/env python3
"""Set complete ID3 metadata + cover art on all CCC V2 audiobook MP3s.

Usage:
  python scripts/tag_v2_audiobook.py \\
    --audio-dir ~/Documents/ccc_v2_audio \\
    --cover     ~/Documents/ccc_v2_audio/cover.jpg \\
    --manifest  /tmp/ccc_audio.manifest.json
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

ALBUM       = "Catéchisme de l'Église Catholique"
ARTIST      = "Magistère de l'Église catholique"
PUBLISHER   = "catechismecatholique.fr"
COMMENT_URL = "https://catechismecatholique.fr"
YEAR        = "2026"
GENRE       = "Audiobook"
LANGUAGE    = "fra"
COPYRIGHT   = ("© Libreria Editrice Vaticana, 1992 · "
               "Voix : edge-tts (Microsoft Azure) · "
               "Édition audio : catechismecatholique.fr, 2026")
ENCODER     = ("edge-tts fr-BE-GerardNeural / fr-FR-RemyMultilingualNeural / "
               "fr-CH-FabriceNeural + ffmpeg libmp3lame")
SOURCE_URL  = "https://www.vatican.va/archive/ccc/index_fr.htm"
SORT_ALBUM  = "Catechisme de l'Eglise Catholique"
SORT_ARTIST = "Magistere de l'Eglise catholique"


def _strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn")


def _sort_key(title: str) -> str:
    """Sort-friendly form: strip leading punctuation/quotes and diacritics."""
    s = _strip_accents(_clean(title))
    return s.lstrip("«»\"' \t·-—")


def _para_range(p: Path) -> tuple[int, int] | None:
    m = re.search(r"(\d{4})-(\d{4})\.mp3$", p.name)
    return (int(m.group(1)), int(m.group(2))) if m else None

# directory prefix → (disc_number, disc_title)
_DISC_MAP = {
    "00-prologue":                   (1, "Prologue"),
    "01-1-profession-de-la-foi":     (2, "Première partie — La profession de la foi"),
    "02-2-celebration-du-mystere":   (3, "Deuxième partie — La célébration du mystère chrétien"),
    "03-3-vie-dans-le-christ":       (4, "Troisième partie — La vie dans le Christ"),
    "04-4-priere-chretienne":        (5, "Quatrième partie — La prière chrétienne"),
    "en-bref":                       (6, "En bref"),
}


def _clean(text: str) -> str:
    """Strip non-breaking spaces and tighten guillemet spacing."""
    return unicodedata.normalize("NFC", text.replace("\xa0", " ").replace(" ", " ")).strip()


def _build_eb_title_map(manifest_path: Path) -> dict[str, str]:
    """chapter_slug -> 'En bref — {chapter_title}'"""
    m = json.loads(manifest_path.read_text(encoding="utf-8"))
    result: dict[str, str] = {}
    for entry in m["entries"]:
        if entry.get("kind") != "heading":
            continue
        loc = entry.get("location", {})
        for slug_key, title_key in (
            ("chapter_slug", "chapter_title"),
            ("section_slug", "section_title"),
        ):
            slug  = loc.get(slug_key)
            title = loc.get(title_key)
            if slug and title and slug not in result:
                result[slug] = f"En bref — {_clean(title)}"
    return result


def _disc_for(mp3: Path, audio_dir: Path) -> tuple[int, str]:
    rel = mp3.relative_to(audio_dir)
    top = rel.parts[0]
    return _DISC_MAP.get(top, (0, ""))


def tag_all(audio_dir: Path, cover_path: Path, manifest_path: Path) -> None:
    try:
        from mutagen.id3 import (
            ID3, APIC, TALB, TIT2, TIT3, TPE1, TPE2, TCON, TDRC,
            TRCK, TPOS, TPUB, TCOM, TLAN, TCOP, TSSE,
            TSOT, TSOA, TSOP, COMM, WOAR, WCOP,
            error as ID3Error,
        )
        from mutagen.mp3 import MP3
    except ImportError:
        print("pip install mutagen")
        return

    cover_data = cover_path.read_bytes()
    eb_titles  = _build_eb_title_map(manifest_path)

    # Collect and sort all MP3s, grouped by disc for track renumbering
    mp3s = sorted(audio_dir.rglob("*.mp3"))

    # Build per-disc track counters and total-disc counts
    disc_mp3s: dict[int, list[Path]] = {}
    for p in mp3s:
        disc_num, _ = _disc_for(p, audio_dir)
        disc_mp3s.setdefault(disc_num, []).append(p)
    disc_totals = {d: len(lst) for d, lst in disc_mp3s.items()}
    disc_track_counter: dict[int, int] = {d: 0 for d in disc_mp3s}

    total_discs = len(disc_mp3s)
    print(f"Tagging {len(mp3s)} MP3s across {total_discs} discs…")

    for p in mp3s:
        disc_num, disc_title = _disc_for(p, audio_dir)
        disc_track_counter[disc_num] += 1
        track_num  = disc_track_counter[disc_num]
        track_total = disc_totals[disc_num]

        # Determine TIT2
        if p.parent.name == "en-bref" or "en-bref" in p.parts:
            slug = re.sub(r"^ccc_eb_", "", p.stem)
            title = eb_titles.get(slug, f"En bref — {slug}")
        else:
            try:
                existing = ID3(str(p))
                title = str(existing.get("TIT2", p.stem))
            except ID3Error:
                title = p.stem

        try:
            tags = ID3(str(p))
        except ID3Error:
            audio = MP3(str(p))
            audio.add_tags()
            tags = audio.tags  # type: ignore[assignment]

        for f in ("APIC", "TALB", "TIT2", "TIT3", "TPE1", "TPE2",
                  "TCON", "TDRC", "TRCK", "TPOS", "TPUB", "COMM",
                  "TCOM", "TLAN", "TCOP", "TSSE",
                  "TSOT", "TSOA", "TSOP", "WOAR", "WCOP"):
            tags.delall(f)

        rng = _para_range(p)
        subtitle = f"Paragraphes {rng[0]} à {rng[1]}" if rng else None

        tags.add(APIC(encoding=3, mime="image/jpeg", type=3, desc="Cover", data=cover_data))
        tags.add(TALB(encoding=3, text=ALBUM))
        tags.add(TIT2(encoding=3, text=title))
        if subtitle:
            tags.add(TIT3(encoding=3, text=subtitle))
        tags.add(TPE1(encoding=3, text=ARTIST))
        tags.add(TPE2(encoding=3, text=ARTIST))
        tags.add(TCOM(encoding=3, text=ARTIST))
        tags.add(TCON(encoding=3, text=GENRE))
        tags.add(TDRC(encoding=3, text=YEAR))
        tags.add(TLAN(encoding=3, text=LANGUAGE))
        tags.add(TRCK(encoding=3, text=f"{track_num}/{track_total}"))
        tags.add(TPOS(encoding=3, text=f"{disc_num}/{total_discs}"))
        tags.add(TPUB(encoding=3, text=PUBLISHER))
        tags.add(TCOP(encoding=3, text=COPYRIGHT))
        tags.add(TSSE(encoding=3, text=ENCODER))
        tags.add(TSOT(encoding=3, text=_sort_key(title)))
        tags.add(TSOA(encoding=3, text=SORT_ALBUM))
        tags.add(TSOP(encoding=3, text=SORT_ARTIST))
        tags.add(WOAR(url=COMMENT_URL))
        tags.add(WCOP(url=SOURCE_URL))
        tags.add(COMM(encoding=3, lang="fra", desc="", text=COMMENT_URL))

        tags.save(str(p))
        print(f"  [{disc_num}/{total_discs} · {track_num:02d}/{track_total:02d}]  {p.name}  —  {title[:60]}")

    print(f"\nDone. {len(mp3s)} files tagged.")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--audio-dir", type=Path,
                   default=Path.home() / "Documents/ccc_v2_audio")
    p.add_argument("--cover", type=Path,
                   default=Path.home() / "Documents/ccc_v2_audio/cover.jpg")
    p.add_argument("--manifest", type=Path,
                   default=Path("/tmp/ccc_audio.manifest.json"))
    args = p.parse_args()
    tag_all(args.audio_dir, args.cover, args.manifest)


if __name__ == "__main__":
    main()
