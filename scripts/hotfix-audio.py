#!/usr/bin/env python3
"""Re-render specific V1 paragraphs or V2 file groups and upload to R2.

V1 example (phonetic fix in a few paragraphs):
  python scripts/hotfix-audio.py \\
    --manifest /tmp/ccc_audio.manifest.json \\
    --paragraphs 58 1333 1350 1544 \\
    --upload

V2 example (re-render a handful of files):
  python scripts/hotfix-audio.py \\
    --manifest /tmp/ccc_audio.manifest.json \\
    --file-numbers h0008 h0042 \\
    --v2-dir /path/to/v2-output \\
    --upload

Use --dry-run to preview what would be re-rendered without touching any files.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))

import ccc_audio
import render_ccc_audio_lib as rlib


def _v2_out_relpath(group: dict) -> str:
    loc = group["location"]
    part_num = loc.get("part_number") or 0
    part_slug = loc.get("part_slug") or "unknown"
    sec_num = loc.get("section_number")
    sec_slug = loc.get("section_slug")
    fname = f"{group['file_number']}.mp3"
    part_dir = f"{part_num:02d}-{part_slug}"
    if sec_num is not None and sec_slug:
        return f"{part_dir}/{sec_num:02d}-{sec_slug}/{fname}"
    return f"{part_dir}/{fname}"


def _upload(keys: list[str]) -> None:
    uploader = ROOT / "scripts/upload-audio-to-r2.mjs"
    keys_arg = "--keys=" + ",".join(keys)
    subprocess.run(["node", str(uploader), keys_arg], check=True)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--manifest", type=Path, required=True,
                   help="Path to ccc_audio.manifest.json.")
    p.add_argument("--paragraphs", type=int, nargs="+", metavar="N",
                   help="V1 paragraph numbers to re-render.")
    p.add_argument("--file-numbers", nargs="+", metavar="H",
                   help="V2 file numbers to re-render (e.g. h0008 h0042).")
    p.add_argument("--v1-dir", type=Path, default=ROOT / "static/audio/cec",
                   help="V1 audio directory. Default: static/audio/cec")
    p.add_argument("--v2-dir", type=Path, default=None,
                   help="V2 audio output directory (required with --file-numbers).")
    p.add_argument("--v2-r2-prefix", default="cec/v2",
                   help="R2 key prefix for V2 files. Default: cec/v2")
    p.add_argument("--gap-ms", type=int, default=300)
    p.add_argument("--section-gap-ms", type=int, default=700)
    p.add_argument("--upload", action="store_true",
                   help="Upload changed files to R2 after rendering.")
    p.add_argument("--dry-run", action="store_true",
                   help="Preview what would be re-rendered without touching files.")
    args = p.parse_args()

    if not args.paragraphs and not args.file_numbers:
        p.error("Specify at least one of --paragraphs or --file-numbers.")

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    jitter = rlib.JitterState()
    changed_keys: list[str] = []

    # ------------------------------------------------------------------ V1 --
    if args.paragraphs:
        para_index = {
            e["number"]: e
            for e in manifest["entries"]
            if e["kind"] == "paragraph"
        }

        index_path = args.v1_dir / "index.json"
        v1_index: dict = {}
        if index_path.exists():
            try:
                v1_index = json.loads(index_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                pass
        v1_index.setdefault("paragraphs", {})

        for n in args.paragraphs:
            entry = para_index.get(n)
            if entry is None:
                print(f"WARN  §{n} not found in manifest", file=sys.stderr)
                continue
            rel = f"ccc_{entry['file_number']}.mp3"
            out_path = args.v1_dir / rel
            r2_key = f"cec/{rel}"
            if args.dry_run:
                print(f"DRY   §{n}  ->  {rel}  (r2: {r2_key})")
                continue
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.unlink(missing_ok=True)
            if not rlib.render_entry(
                entry=entry, target="v1", out_path=out_path,
                jitter=jitter, gap_ms=args.gap_ms, skip_existing=False,
            ):
                print(f"FAIL  §{n}", file=sys.stderr)
                continue
            duration_ms = rlib.probe_duration_ms(out_path)
            print(f"OK    §{n}  ->  {rel}  ({duration_ms}ms)")
            v1_index["paragraphs"][str(n)] = {
                **v1_index["paragraphs"].get(str(n), {}),
                "file": rel,
                "duration_ms": duration_ms,
                "has_citation": any(s["voice"] == "fabrice" for s in entry["segments"]),
                "is_en_bref": entry.get("is_en_bref", False),
            }
            changed_keys.append(r2_key)

        if changed_keys and not args.dry_run:
            index_path.write_text(
                json.dumps(v1_index, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            changed_keys.append("cec/index.json")
            print(f"index.json updated  ({len(changed_keys) - 1} paragraphs)")

    # ------------------------------------------------------------------ V2 --
    if args.file_numbers:
        if args.v2_dir is None:
            p.error("--v2-dir is required when --file-numbers is set.")
        groups = {g["file_number"]: g for g in ccc_audio.build_v2_file_groups(manifest)}
        for fn in args.file_numbers:
            group = groups.get(fn)
            if group is None:
                print(f"WARN  {fn} not found in manifest", file=sys.stderr)
                continue
            rel = _v2_out_relpath(group)
            out_path = args.v2_dir / rel
            rng = group["paragraph_range"]
            label = f"{fn} §{rng[0]}–§{rng[-1]}"
            r2_key = f"{args.v2_r2_prefix}/{rel}"
            if args.dry_run:
                print(f"DRY   {label}  ->  {rel}  (r2: {r2_key})")
                continue
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.unlink(missing_ok=True)
            if not rlib.render_v2_group(
                group=group, out_path=out_path,
                gap_ms=args.gap_ms, section_gap_ms=args.section_gap_ms,
                skip_existing=False,
            ):
                print(f"FAIL  {label}", file=sys.stderr)
                continue
            duration_ms = rlib.probe_duration_ms(out_path)
            print(f"OK    {label}  ->  {rel}  ({duration_ms}ms)")
            changed_keys.append(r2_key)

    # ---------------------------------------------------------------- upload --
    if args.dry_run:
        print(f"\n(dry run — nothing rendered or uploaded)")
        return 0

    if args.upload and changed_keys:
        print(f"\nUploading {len(changed_keys)} file(s) to R2...")
        _upload(changed_keys)
    elif args.upload and not changed_keys:
        print("Nothing to upload (all renders failed).")

    return 0


if __name__ == "__main__":
    sys.exit(main())
