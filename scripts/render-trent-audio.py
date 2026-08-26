#!/usr/bin/env python3
"""Render Trent V2 audiobook MP3s from the manifest.

Each manifest section becomes one MP3:
  {out-dir}/{NN}-{part_slug}/{chapter_slug}/{ordinal}-{section_slug}.mp3

Also writes {out-dir}/index.json with per-file durations and chapter_maps.

Use --dry-run to preview which sections would be rendered without generating
any audio. Use --confirm to actually start rendering (guards against accidental
fleet-wide renders, mirroring render-ccc-audio.py).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import trent_audio
import render_ccc_audio_lib as rlib

from mutagen.id3 import ID3, TIT2, TALB, TPE1, TRCK, TPOS, TCON, ID3NoHeaderError


ALBUM = "Catéchisme du concile de Trente"
ARTIST = "Magistère de l'Église catholique"


def _out_relpath(group: dict) -> str:
    """Section MP3 path relative to --out-dir. file_key already encodes the layout."""
    return group["file_key"] + ".mp3"


def _tag_mp3(
    path: Path,
    *,
    title: str,
    track: int,
    disc: int,
    disc_total: int,
) -> None:
    try:
        tags = ID3(str(path))
    except ID3NoHeaderError:
        tags = ID3()
    for frame in ("TIT2", "TALB", "TPE1", "TRCK", "TPOS", "TCON"):
        tags.delall(frame)
    tags.add(TIT2(encoding=3, text=title))
    tags.add(TALB(encoding=3, text=ALBUM))
    tags.add(TPE1(encoding=3, text=ARTIST))
    tags.add(TRCK(encoding=3, text=f"{track:04d}"))
    tags.add(TPOS(encoding=3, text=f"{disc}/{disc_total}"))
    tags.add(TCON(encoding=3, text="Audiobook"))
    tags.save(str(path))


def _filter_groups(groups: list[dict], args: argparse.Namespace) -> list[dict]:
    if args.part is not None:
        groups = [g for g in groups if g["location"]["part_slug"] == args.part]
    if args.chapter is not None:
        groups = [g for g in groups
                  if g["location"]["chapter_slug"] == args.chapter]
    if args.chapter_number is not None:
        groups = [g for g in groups
                  if g["location"]["chapter_number"] == args.chapter_number]
    if args.section_slug is not None:
        groups = [g for g in groups
                  if g["location"]["section_slug"] == args.section_slug]
    if args.start_paragraph is not None or args.end_paragraph is not None:
        lo = args.start_paragraph if args.start_paragraph is not None else 1
        hi = args.end_paragraph if args.end_paragraph is not None else 10**9
        groups = [g for g in groups
                  if g["paragraph_range"][1] >= lo
                  and g["paragraph_range"][0] <= hi]
    if args.limit is not None:
        groups = groups[: args.limit]
    return groups


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--manifest", type=Path, required=True)
    p.add_argument("--out-dir", type=Path, required=True)
    p.add_argument("--dry-run", action="store_true",
                   help="Preview what would be rendered without generating audio.")
    p.add_argument("--confirm", action="store_true",
                   help="Required to actually start audio generation.")
    p.add_argument("--part", type=str, default=None,
                   help="Filter by part slug (e.g. 'symbole', 'sacrements').")
    p.add_argument("--chapter", type=str, default=None,
                   help="Filter by chapter slug (e.g. '1-foi-et-symbole').")
    p.add_argument("--chapter-number", type=int, default=None,
                   help="Filter by chapter number.")
    p.add_argument("--section-slug", type=str, default=None,
                   help="Filter by exact section slug.")
    p.add_argument("--start-paragraph", type=int, default=None)
    p.add_argument("--end-paragraph", type=int, default=None)
    p.add_argument("--limit", type=int, default=None,
                   help="Render at most N sections.")
    p.add_argument("--skip-existing", action="store_true", default=True)
    p.add_argument("--gap-ms", type=int, default=300,
                   help="Silence gap between paragraph segments (ms). Default 300.")
    p.add_argument("--section-gap-ms", type=int, default=700,
                   help="Wider pause after chapter / section heading (ms). Default 700.")
    args = p.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    groups = trent_audio.build_v2_file_groups(manifest)
    all_groups = groups
    groups = _filter_groups(groups, args)

    # Stable track + disc numbering across the WHOLE corpus (don't change
    # when filters narrow the run).
    disc_total = max(g["location"]["part_index"] for g in all_groups) + 1
    track_lookup: dict[str, int] = {
        g["file_key"]: idx + 1 for idx, g in enumerate(all_groups)
    }

    if args.dry_run:
        print(f"DRY RUN — {len(groups)} of {len(all_groups)} sections:")
        for g in groups:
            loc = g["location"]
            rel = _out_relpath(g)
            rng = g["paragraph_range"]
            segs = [s for e in g["entries"] for s in e["segments"]
                    if "v2" in s["targets"]]
            print(f"  ch{loc['chapter_number']:>2} §{rng[0]}-§{rng[1]}  "
                  f"({len(segs)} segments)  -> {rel}")
        return 0

    if not args.confirm:
        print(f"Ready to render {len(groups)} section(s) into {args.out_dir}")
        print("Re-run with --confirm to start, or --dry-run to preview.")
        return 0

    args.out_dir.mkdir(parents=True, exist_ok=True)
    index_path = args.out_dir / "index.json"
    index: dict = {}
    if index_path.exists():
        try:
            index = json.loads(index_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass

    for g in groups:
        loc = g["location"]
        rel = _out_relpath(g)
        out_path = args.out_dir / rel
        rng = g["paragraph_range"]
        label = (f"ch{loc['chapter_number']:>2}/"
                 f"{loc['section_ordinal']}-{loc['section_slug']}  "
                 f"§{rng[0]}-§{rng[1]}")

        ok, chapter_map = rlib.render_v2_group(
            group=g, out_path=out_path,
            gap_ms=args.gap_ms, section_gap_ms=args.section_gap_ms,
            skip_existing=args.skip_existing,
        )
        if not ok:
            print(f"FAIL {label}", file=sys.stderr)
            continue

        duration_ms = rlib.probe_duration_ms(out_path)
        title = (f"Chapitre {loc['chapter_number']} · {loc['section_title']}"
                 if loc["chapter_number"] is not None else loc["section_title"])
        _tag_mp3(
            out_path,
            title=title,
            track=track_lookup[g["file_key"]],
            disc=loc["part_index"] + 1,
            disc_total=disc_total,
        )

        idx_entry: dict = {
            "file": rel,
            "part_slug": loc["part_slug"],
            "part_title": loc["part_title"],
            "chapter_number": loc["chapter_number"],
            "chapter_slug": loc["chapter_slug"],
            "chapter_title": loc["chapter_title"],
            "section_ordinal": loc["section_ordinal"],
            "section_slug": loc["section_slug"],
            "section_title": loc["section_title"],
            "paragraph_range": rng,
            "duration_ms": duration_ms,
        }
        if chapter_map is not None:
            idx_entry["chapter_map"] = chapter_map
        index[g["file_key"]] = idx_entry
        print(f"OK  {label} -> {rel}  ({duration_ms}ms)")

    if groups:
        index_path.write_text(
            json.dumps(index, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
