#!/usr/bin/env python3
"""Swap re-rendered V2 files into the audio dir, then re-run rename+tag.

After re-rendering affected files into RERENDER_DIR (same sub-path structure
as audio_dir), this script:
  1. Finds each h00xx.mp3's current (renamed) counterpart in audio_dir by
     matching para_start in the filename (e.g. *-0026-*.mp3).
  2. Deletes the old file.
  3. Moves the fresh h00xx.mp3 into the same section dir.
  4. Runs reorganize_v2_audiobook.py to rename + re-tag everything.

Usage:
  python scripts/swap_rerendered_v2.py \\
    --audio-dir   ~/Documents/ccc_v2_audio \\
    --rerender-dir ~/Documents/ccc_v2_rerender \\
    --manifest    /tmp/ccc_audio.manifest.json
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ccc_audio


def swap(audio_dir: Path, rerender_dir: Path, manifest_path: Path) -> None:
    m = json.loads(manifest_path.read_text(encoding="utf-8"))
    groups = ccc_audio.build_v2_file_groups(m)
    group_by_fn = {g["file_number"]: g for g in groups}

    fresh_files = list(rerender_dir.rglob("*.mp3"))
    print(f"Found {len(fresh_files)} re-rendered file(s) in {rerender_dir}")

    swapped = 0
    for fresh in sorted(fresh_files):
        fn = fresh.stem  # e.g. h0002
        g = group_by_fn.get(fn)
        if g is None:
            print(f"  WARN  no group for {fn} — skipping")
            continue

        # Relative section dir (same structure in both dirs)
        rel_dir = fresh.relative_to(rerender_dir).parent
        section_dir = audio_dir / rel_dir
        if not section_dir.exists():
            print(f"  WARN  {section_dir} not found in audio_dir — skipping {fn}")
            continue

        para_start = g["paragraph_range"][0]
        pattern = f"*-{para_start:04d}-*.mp3"
        old_files = list(section_dir.glob(pattern))

        if not old_files:
            print(f"  WARN  no file matching {section_dir}/{pattern} — skipping {fn}")
            continue
        if len(old_files) > 1:
            print(f"  WARN  multiple matches for {pattern} in {section_dir}:")
            for f in old_files:
                print(f"    {f.name}")
            print(f"  Skipping {fn}")
            continue

        old = old_files[0]
        dest = section_dir / fresh.name
        old.unlink()
        shutil.copy2(str(fresh), str(dest))
        print(f"  SWAP  {old.name}  →  {fresh.name}")
        swapped += 1

    print(f"\nSwapped {swapped}/{len(fresh_files)} files.")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--audio-dir",    type=Path,
                   default=Path.home() / "Documents/ccc_v2_audio")
    p.add_argument("--rerender-dir", type=Path,
                   default=Path.home() / "Documents/ccc_v2_rerender")
    p.add_argument("--manifest",     type=Path,
                   default=Path("/tmp/ccc_audio.manifest.json"))
    p.add_argument("--no-rename",    action="store_true",
                   help="Skip the reorganize step (useful for dry inspection).")
    args = p.parse_args()

    swap(args.audio_dir, args.rerender_dir, args.manifest)

    if not args.no_rename:
        print("\nRunning reorganize_v2_audiobook.py …")
        here = Path(__file__).resolve().parent
        subprocess.run(
            [sys.executable, str(here / "reorganize_v2_audiobook.py"),
             "--audio-dir", str(args.audio_dir),
             "--manifest",  str(args.manifest)],
            check=True,
        )


if __name__ == "__main__":
    main()
