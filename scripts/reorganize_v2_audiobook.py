#!/usr/bin/env python3
"""Reorganize CCC V2 audiobook: move en-bref into section dirs, rename files,
and update ID3 tags (year, track, disc).

Filename format: {seq:02d}-{title_slug}-{para_start:04d}-{para_end:04d}.mp3
  e.g.  01-prologue-0001-0025.mp3
        14-en-bref-lhomme-est-capable-de-dieu-0044-0049.mp3

Disc = CCC part (1=Prologue, 2=Partie 1 … 5=Partie 4).
Track = sequential within the disc, sorted by paragraph start.

Usage:
  python scripts/reorganize_v2_audiobook.py \\
    --audio-dir ~/Documents/ccc_v2_audio \\
    --manifest  /tmp/ccc_audio.manifest.json
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

YEAR = "2026"

_DISC_MAP: dict[str, int] = {
    "00-prologue":                 1,
    "01-1-profession-de-la-foi":   2,
    "02-2-celebration-du-mystere": 3,
    "03-3-vie-dans-le-christ":     4,
    "04-4-priere-chretienne":      5,
}
_DISC_TOTAL = 5


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower()
    text = re.sub(r"[—\s«»«»’''\":!?.,;/\\()\[\]]+", "-", text)
    text = re.sub(r"[^a-z0-9-]", "", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def _build_maps(manifest_path: Path) -> dict[str, str]:
    """Returns slug_to_dir: chapter/section slug → relative dir in audio_dir."""
    m = json.loads(manifest_path.read_text(encoding="utf-8"))

    slug_to_dir: dict[str, str] = {}
    for entry in m["entries"]:
        if entry.get("kind") != "heading":
            continue
        loc = entry.get("location", {})
        pn = loc.get("part_number") or 0
        ps = loc.get("part_slug") or "unknown"
        sn = loc.get("section_number")
        ss = loc.get("section_slug")
        cs = loc.get("chapter_slug")
        part_dir = f"{pn:02d}-{ps}"
        sec_dir  = f"{sn:02d}-{ss}" if ss and sn is not None else None
        full_dir = f"{part_dir}/{sec_dir}" if sec_dir else part_dir
        if cs and cs not in slug_to_dir:
            slug_to_dir[cs] = full_dir
        if ss and ss not in slug_to_dir:
            slug_to_dir[ss] = full_dir

    return slug_to_dir


def _get_title(p: Path) -> str:
    try:
        from mutagen.id3 import ID3
        tags = ID3(str(p))
        tit = tags.get("TIT2")
        if tit:
            return str(tit)
    except Exception:
        pass
    return p.stem


def _get_para_range(p: Path, v2_index: dict) -> list[int] | None:
    # All V2 files are h00xx.mp3 · look up by file_number stem.
    stem = p.stem
    if stem in v2_index:
        rng = v2_index[stem]["paragraph_range"]
        return [rng[0], rng[-1]]
    return None


def _rename_and_tag(audio_dir: Path, v2_index: dict) -> None:
    try:
        from mutagen.id3 import ID3, TDRC, TRCK, TPOS, error as ID3Error
    except ImportError:
        print("pip install mutagen")
        return

    # Collect files per part-directory (top-level = disc)
    part_dirs = sorted(
        [d for d in audio_dir.iterdir() if d.is_dir() and d.name in _DISC_MAP],
        key=lambda d: d.name,
    )

    total_discs = _DISC_TOTAL

    for part_dir in part_dirs:
        disc_num = _DISC_MAP[part_dir.name]

        # Gather all MP3s under this part (across all sub-sections)
        all_mp3s = sorted(part_dir.rglob("*.mp3"))

        # Attach metadata
        entries = []
        for p in all_mp3s:
            rng = _get_para_range(p, v2_index)
            if rng is None:
                print(f"  WARN  no para range for {p.name} — skipping rename")
                continue
            title = _get_title(p)
            entries.append((rng[0], rng[1], p, title))

        # Sort by paragraph start
        entries.sort(key=lambda x: x[0])

        track_total = len(entries)
        for track_num, (p_start, p_end, p, title) in enumerate(entries, 1):
            slug = _slugify(title)
            new_name = f"{track_num:02d}-{slug}-{p_start:04d}-{p_end:04d}.mp3"
            new_path = p.parent / new_name

            if p.name != new_name:
                p.rename(new_path)

            try:
                tags = ID3(str(new_path))
            except ID3Error:
                continue

            tags["TDRC"] = TDRC(encoding=3, text=YEAR)
            tags["TRCK"] = TRCK(encoding=3, text=f"{track_num}/{track_total}")
            tags["TPOS"] = TPOS(encoding=3, text=f"{disc_num}/{total_discs}")
            tags.save(str(new_path))

            print(f"  [{disc_num}/{total_discs} · {track_num:02d}/{track_total:02d}]  "
                  f"{new_name[:70]}")

    print(f"\nDone.")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--audio-dir", type=Path,
                   default=Path.home() / "Documents/ccc_v2_audio")
    p.add_argument("--manifest", type=Path,
                   default=Path("/tmp/ccc_audio.manifest.json"))
    args = p.parse_args()

    _build_maps(args.manifest)  # validate manifest readable (legacy en-bref move dropped)

    v2_index_path = args.audio_dir / "index.json"
    v2_index = json.loads(v2_index_path.read_text(encoding="utf-8")) if v2_index_path.exists() else {}

    print("=== Rename + re-tag ===")
    _rename_and_tag(args.audio_dir, v2_index)


if __name__ == "__main__":
    main()
