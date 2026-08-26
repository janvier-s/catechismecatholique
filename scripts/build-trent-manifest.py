#!/usr/bin/env python3
"""Build the Trent audio manifest from static/data/trent/.

Outputs:
  --out  trent_audio.manifest.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import trent_audio


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--structure", type=Path,
                   default=Path("static/data/trent/structure.json"))
    p.add_argument("--sections", type=Path,
                   default=Path("static/data/trent/sections"))
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args()

    manifest = trent_audio.build_manifest(
        structure_path=args.structure,
        sections_dir=args.sections,
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    counts = {"chapter_heading": 0, "section_heading": 0, "paragraph": 0}
    for e in manifest["entries"]:
        counts[e["kind"]] = counts.get(e["kind"], 0) + 1
    print(f"manifest: {len(manifest['entries'])} entries → {args.out}")
    for k, v in counts.items():
        print(f"  {k}: {v}")
    groups = trent_audio.build_v2_file_groups(manifest)
    print(f"  v2 file groups: {len(groups)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
