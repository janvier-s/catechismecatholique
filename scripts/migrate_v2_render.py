#!/usr/bin/env python3
"""Migrate existing V2 render into a fresh directory aligned with the current manifest.

Steps:
  1. Build the manifest from current source data.
  2. Compute new V2 file groups.
  3. For each group whose paragraph range already exists in the OLD directory
     AND whose content hasn't changed (no chapter-preamble bundling), copy the
     old MP3 to the new h-numbered path so the render can skip it.
  4. Write a fresh index.json for the copied files.
  5. Print the render command to finish off the remaining files.

Usage:
  python scripts/migrate_v2_render.py \\
    --old-dir   ~/Documents/ccc_v2_audio_new \\
    --new-dir   ~/Documents/ccc_v2_audio_v3 \\
    [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ccc_audio
import render_ccc_audio_lib as rlib

CHAPTERS_FULL = Path(__file__).resolve().parent.parent / "static/data/cec/chapters-full"
PARAGRAPHS    = Path(__file__).resolve().parent.parent / "static/data/cec/paragraphs"
STRUCTURE     = Path(__file__).resolve().parent.parent / "static/data/cec/structure.json"


def _v2_out_relpath(group: dict) -> str:
    loc = group["location"]
    part_num  = loc.get("part_number") or 0
    part_slug = loc.get("part_slug") or "unknown"
    sec_num   = loc.get("section_number")
    sec_slug  = loc.get("section_slug")
    fname     = f"{group['file_number']}.mp3"
    part_dir  = f"{part_num:02d}-{part_slug}"
    if sec_num is not None and sec_slug:
        return f"{part_dir}/{sec_num:02d}-{sec_slug}/{fname}"
    return f"{part_dir}/{fname}"


def _has_chapter_preamble(group: dict) -> bool:
    """True if this group's audio changed: range-fix + preamble-heading injection."""
    headings = [e for e in group["entries"] if e["kind"] == "heading"]
    if not headings:
        return False
    first = headings[0]
    return first["level"] == "chapter" and len(first.get("segments", [])) == 1


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--old-dir", type=Path, required=True)
    p.add_argument("--new-dir", type=Path, required=True)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    print("Building manifest from current source data…")
    manifest, _ = ccc_audio.build_manifest(
        chapters_full_dir=CHAPTERS_FULL,
        paragraphs_dir=PARAGRAPHS,
        structure_path=STRUCTURE,
    )
    groups = ccc_audio.build_v2_file_groups(manifest, chapters_full_dir=CHAPTERS_FULL)
    print(f"  {len(groups)} groups total")

    # Load old index: paragraph_range → relative file path
    old_index_path = args.old_dir / "index.json"
    if not old_index_path.exists():
        print(f"error: {old_index_path} not found", file=sys.stderr)
        return 1
    old_idx: dict = json.loads(old_index_path.read_text(encoding="utf-8"))
    old_by_range: dict[tuple, str] = {
        tuple(v["paragraph_range"]): v["file"] for v in old_idx.values()
    }
    print(f"  {len(old_by_range)} files in old index")

    # Identify which groups have changed audio content.
    changed_ranges: set[tuple] = {
        tuple(g["paragraph_range"]) for g in groups if _has_chapter_preamble(g)
    }
    print(f"  {len(changed_ranges)} groups have changed audio content (will re-render)")

    new_index: dict = {}
    copied = 0
    to_render_count = 0

    for group in groups:
        fn   = group["file_number"]
        rng  = tuple(group["paragraph_range"])
        rel  = _v2_out_relpath(group)
        dest = args.new_dir / rel

        if rng in old_by_range and rng not in changed_ranges:
            # Reuse old file.
            src = args.old_dir / old_by_range[rng]
            if not src.exists():
                print(f"  WARN {fn}: old file missing at {src}, will re-render")
                to_render_count += 1
                continue
            if not args.dry_run:
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dest)
                duration_ms = rlib.probe_duration_ms(dest)
                new_index[fn] = {
                    "file": rel,
                    "paragraph_range": list(rng),
                    "duration_ms": duration_ms,
                }
            else:
                print(f"  DRY copy {fn}: {old_by_range[rng]} → {rel}")
            copied += 1
        else:
            to_render_count += 1

    if not args.dry_run and new_index:
        (args.new_dir / "index.json").write_text(
            json.dumps(new_index, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    print(f"\nResult: {copied} files copied, {to_render_count} need rendering")
    if not args.dry_run:
        manifest_path = args.new_dir / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
        print(f"\nManifest saved to: {manifest_path}")

    print(f"""
Next step — render the remaining {to_render_count} files:

  python scripts/render-ccc-audio.py \\
    --target v2 \\
    --manifest {args.new_dir / 'manifest.json'} \\
    --out-dir {args.new_dir} \\
    --skip-existing \\
    --confirm
""")
    return 0


if __name__ == "__main__":
    sys.exit(main())
