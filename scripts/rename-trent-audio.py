#!/usr/bin/env python3
"""Rename Trent V2 audiobook files to use full descriptive titles.

New scheme:
  {NN}-{slug(part_title)}/                     # part dir
    {NN}-{slug(chapter_spoken_title)}/         # chapter dir (continuation resolved)
      {NN}-{slug(section_title)}.mp3           # section file

Renames files on disk and rewrites index.json with the new keys + file paths.

Use --dry-run to preview every rename without touching disk.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import trent_audio


def slugify(text: str) -> str:
    """Lowercase, strip accents, collapse non-alphanum into single hyphens."""
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--audio-dir", type=Path, required=True)
    p.add_argument("--manifest", type=Path, required=True)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    groups = trent_audio.build_v2_file_groups(manifest)

    # Load existing index.json (keyed by current file_key).
    idx_path = args.audio_dir / "index.json"
    old_idx = json.loads(idx_path.read_text(encoding="utf-8")) if idx_path.exists() else {}

    # Discover parts in manifest order; assign ordinals (0..N-1) per first encounter.
    part_order: list[str] = []
    part_title_by_slug: dict[str, str] = {}
    for g in groups:
        loc = g["location"]
        if loc["part_slug"] not in part_title_by_slug:
            part_title_by_slug[loc["part_slug"]] = loc["part_title"]
            part_order.append(loc["part_slug"])

    # Compute current and new paths for every group.
    plan: list[dict] = []
    seen_new: set[Path] = set()
    for g in groups:
        loc = g["location"]
        # Current path scheme (what render-trent-audio.py wrote).
        cur_rel = (
            f"{loc['part_index']:02d}-{loc['part_slug']}/"
            f"{loc['chapter_slug']}/"
            f"{loc['section_slug']}.mp3"
        )
        cur_abs = args.audio_dir / cur_rel

        # New path scheme.
        new_part_dir = f"{loc['part_index']:02d}-{slugify(loc['part_title'])}"
        new_chapter_dir = (
            f"{loc['chapter_number']:02d}-{slugify(loc['chapter_spoken_title'])}"
        )
        new_section_file = (
            f"{loc['section_ordinal']:02d}-{slugify(loc['section_title'])}.mp3"
        )
        new_rel = f"{new_part_dir}/{new_chapter_dir}/{new_section_file}"
        new_abs = args.audio_dir / new_rel

        if new_abs in seen_new:
            print(f"COLLISION: two groups map to {new_rel}", file=sys.stderr)
            return 1
        seen_new.add(new_abs)

        plan.append({
            "file_key_old": g["file_key"],
            "file_key_new": new_rel[:-len(".mp3")],
            "cur_rel": cur_rel,
            "new_rel": new_rel,
            "cur_abs": cur_abs,
            "new_abs": new_abs,
        })

    # Sanity check: every current MP3 we expect must exist.
    missing = [p for p in plan if not p["cur_abs"].exists()]
    if missing:
        print(f"ERROR: {len(missing)} expected MP3(s) missing on disk:", file=sys.stderr)
        for m in missing[:10]:
            print(f"  {m['cur_rel']}", file=sys.stderr)
        return 1

    # Dry run: just print the plan.
    if args.dry_run:
        print(f"=== {len(plan)} files would be renamed ===\n")
        for entry in plan[:10] + (["..."] if len(plan) > 20 else []) + plan[-10:]:
            if isinstance(entry, str):
                print(f"  {entry}")
                continue
            print(f"  {entry['cur_rel']}")
            print(f"    -> {entry['new_rel']}")
        # Also report directory-level renames
        old_dirs = sorted({p["cur_rel"].rsplit("/", 1)[0] for p in plan})
        new_dirs = sorted({p["new_rel"].rsplit("/", 1)[0] for p in plan})
        print(f"\n=== {len(old_dirs)} chapter dirs → {len(new_dirs)} chapter dirs ===")
        for o, n in list(zip(old_dirs[:3], new_dirs[:3])) + [("...","...")] + list(zip(old_dirs[-3:], new_dirs[-3:])):
            print(f"  {o:60s} -> {n}")
        return 0

    # Apply: move files to new paths.
    new_index: dict = {}
    for entry in plan:
        entry["new_abs"].parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(entry["cur_abs"]), str(entry["new_abs"]))

        # Copy the old index entry (preserves chapter_map when present) and
        # update its `file` field to the new path.
        idx_entry = dict(old_idx.get(entry["file_key_old"], {}))
        idx_entry["file"] = entry["new_rel"]
        new_index[entry["file_key_new"]] = idx_entry

    # Write updated index.
    idx_path.write_text(
        json.dumps(new_index, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Clean up now-empty old part / chapter directories.
    for sub in sorted(args.audio_dir.glob("*"), reverse=True):
        if not sub.is_dir():
            continue
        for sub2 in sorted(sub.glob("*"), reverse=True):
            if sub2.is_dir() and not any(sub2.iterdir()):
                sub2.rmdir()
        if not any(sub.iterdir()):
            sub.rmdir()

    print(f"Renamed {len(plan)} files. index.json rewritten with {len(new_index)} entries.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
