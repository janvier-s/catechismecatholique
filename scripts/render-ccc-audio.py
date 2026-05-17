#!/usr/bin/env python3
"""Render CCC audio MP3s from the manifest.

Filters entries by --target (currently only v1 supported in Phase 1).
Produces:
  - {out-dir}/ccc_{file_number}.mp3 for paragraph + en_bref_combined entries
  - {out-dir}/index.json mapping paragraph numbers and en_bref slugs to files
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import render_ccc_audio_lib as rlib


def _v1_out_filename(entry: dict) -> str:
    if entry["kind"] == "en_bref_combined":
        return f"ccc_eb_{entry['chapter_slug']}.mp3"
    return f"ccc_{entry['file_number']}.mp3"


def _v1_target_entries(manifest: dict) -> list[dict]:
    out: list[dict] = []
    for entry in manifest["entries"]:
        if entry["kind"] == "paragraph":
            if any("v1" in s["targets"] for s in entry["segments"]):
                out.append(entry)
        elif entry["kind"] == "en_bref_combined":
            out.append(entry)
    return out


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--target", choices=["v1"], default="v1",
                   help="V2 is Phase 2 — not yet implemented here.")
    p.add_argument("--manifest", type=Path, required=True)
    p.add_argument("--out-dir", type=Path, required=True)
    p.add_argument("--seed", type=int, default=None)
    p.add_argument("--start-paragraph", type=int, default=None)
    p.add_argument("--end-paragraph", type=int, default=None)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--skip-existing", action="store_true", default=True)
    p.add_argument("--gap-ms", type=int, default=200)
    args = p.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    entries = _v1_target_entries(manifest)

    if args.start_paragraph is not None:
        entries = [e for e in entries if e.get("number") is None or e["number"] >= args.start_paragraph]
    if args.end_paragraph is not None:
        entries = [e for e in entries if e.get("number") is None or e["number"] <= args.end_paragraph]

    args.out_dir.mkdir(parents=True, exist_ok=True)
    jitter = rlib.JitterState(seed=args.seed)

    index: dict = {"paragraphs": {}, "en_bref_combined": {}}

    for entry in entries:
        filename = _v1_out_filename(entry)
        out_path = args.out_dir / filename
        label = f"§{entry.get('number')}" if entry["kind"] == "paragraph" else f"eb {entry['chapter_slug']}"
        if args.dry_run:
            print(f"DRY {label} -> {filename}")
            continue
        if not rlib.render_entry(
            entry=entry, target="v1", out_path=out_path,
            jitter=jitter, gap_ms=args.gap_ms, skip_existing=args.skip_existing,
        ):
            print(f"FAIL {label}", file=sys.stderr)
            continue

        duration_ms = rlib.probe_duration_ms(out_path)
        body_preview = ""
        for seg in entry["segments"]:
            if seg["voice"] == "remy":
                body_preview = seg["text"][:80]
                break
        if entry["kind"] == "paragraph":
            rlib.tag_mp3(
                out_path,
                title=f"CCC §{entry['number']}",
                album=entry["location"].get("chapter_title", "CCC"),
                track=entry["seq"],
                comment=body_preview,
            )
            has_citation = any(s["voice"] == "fabrice" for s in entry["segments"])
            is_eb = entry.get("is_en_bref", False)
            index["paragraphs"][str(entry["number"])] = {
                "file": filename,
                "duration_ms": duration_ms,
                "has_citation": has_citation,
                "is_en_bref": is_eb,
            }
        else:
            rlib.tag_mp3(
                out_path,
                title=f"CCC en bref — {entry['location'].get('chapter_title', entry['chapter_slug'])}",
                album=entry["location"].get("chapter_title", "CCC"),
                track=entry["seq"],
            )
            index["en_bref_combined"][entry["chapter_slug"]] = {
                "file": filename,
                "duration_ms": duration_ms,
                "paragraphs": entry["paragraph_range"],
            }
        print(f"OK  {label} -> {filename}  ({duration_ms}ms)")

    if not args.dry_run:
        (args.out_dir / "index.json").write_text(
            json.dumps(index, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
