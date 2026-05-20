#!/usr/bin/env python3
"""Render CCC audio MP3s from the manifest.

V1 (--target v1):
  One MP3 per paragraph / en_bref_combined entry.
  Outputs {out-dir}/ccc_{file_number}.mp3 and {out-dir}/index.json.

V2 (--target v2):
  One MP3 per structural file (article or standalone chapter).
  Outputs {out-dir}/{part}/{section}/{file_number}.mp3 and {out-dir}/index.json.
  Use --file-number to render a single file for spot-checking.
  Use --dry-run to preview paths and segment texts without generating audio.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import ccc_audio
import render_ccc_audio_lib as rlib

CHAPTERS_FULL_DIR = Path(__file__).resolve().parent.parent / "static/data/cec/chapters-full"


# ---------------------------------------------------------------------------
# V1 helpers
# ---------------------------------------------------------------------------

def _v1_out_relpath(entry: dict) -> str:
    if entry["kind"] == "en_bref_combined":
        return f"en-bref/ccc_eb_{entry['chapter_slug']}.mp3"
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


def _run_v1(args: argparse.Namespace, manifest: dict) -> int:
    entries = _v1_target_entries(manifest)

    def _in_range(e: dict) -> bool:
        if e["kind"] == "paragraph":
            n = e["number"]
            if args.start_paragraph is not None and n < args.start_paragraph:
                return False
            if args.end_paragraph is not None and n > args.end_paragraph:
                return False
            return True
        rng = e.get("paragraph_range") or []
        if not rng:
            return True
        n_lo, n_hi = rng[0], rng[-1]
        if args.start_paragraph is not None and n_hi < args.start_paragraph:
            return False
        if args.end_paragraph is not None and n_lo > args.end_paragraph:
            return False
        return True

    if args.start_paragraph is not None or args.end_paragraph is not None:
        entries = [e for e in entries if _in_range(e)]

    args.out_dir.mkdir(parents=True, exist_ok=True)
    jitter = rlib.JitterState(seed=args.seed)

    index_path = args.out_dir / "index.json"
    if index_path.exists():
        try:
            index: dict = json.loads(index_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            index = {"paragraphs": {}, "en_bref_combined": {}}
        index.setdefault("paragraphs", {})
        index.setdefault("en_bref_combined", {})
    else:
        index = {"paragraphs": {}, "en_bref_combined": {}}

    for entry in entries:
        rel = _v1_out_relpath(entry)
        out_path = args.out_dir / rel
        filename = Path(rel).name
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
        loc = entry["location"]
        album = (loc.get("chapter_title") or loc.get("section_title")
                 or loc.get("part_title") or "CCC")
        if entry["kind"] == "paragraph":
            rlib.tag_mp3(
                out_path,
                title=f"CCC §{entry['number']}",
                album=album,
                track=entry["seq"],
                comment=body_preview,
            )
            index["paragraphs"][str(entry["number"])] = {
                "file": rel,
                "duration_ms": duration_ms,
                "has_citation": any(s["voice"] == "fabrice" for s in entry["segments"]),
                "is_en_bref": entry.get("is_en_bref", False),
            }
        else:
            rlib.tag_mp3(
                out_path,
                title=f"CCC en bref — {loc.get('chapter_title') or entry['chapter_slug']}",
                album=album,
                track=entry["seq"],
            )
            index["en_bref_combined"][entry["chapter_slug"]] = {
                "file": rel,
                "duration_ms": duration_ms,
                "paragraphs": entry["paragraph_range"],
            }
        print(f"OK  {label} -> {filename}  ({duration_ms}ms)")

    if not args.dry_run:
        index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


# ---------------------------------------------------------------------------
# V2 helpers
# ---------------------------------------------------------------------------

def _v2_out_relpath(group: dict) -> str:
    """Relative output path within the V2 output dir.

    Structure: {part_slug}/{section_slug}/{file_number}.mp3
    Part-level files (no section) sit directly under {part_slug}/.
    """
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


def _run_v2(args: argparse.Namespace, manifest: dict) -> int:
    groups = ccc_audio.build_v2_file_groups(manifest, chapters_full_dir=CHAPTERS_FULL_DIR)

    # Filter by explicit file number (single-file test mode).
    if args.file_number:
        groups = [g for g in groups if g["file_number"] == args.file_number]
        if not groups:
            print(f"error: no file with file_number={args.file_number!r}", file=sys.stderr)
            print("Available file numbers:", file=sys.stderr)
            for g in ccc_audio.build_v2_file_groups(manifest)[:10]:
                print(f"  {g['file_number']}  §{g['paragraph_range'][0]}–§{g['paragraph_range'][-1]}", file=sys.stderr)
            return 1

    # Paragraph range filter.
    if args.start_paragraph is not None or args.end_paragraph is not None:
        def _in_range(g: dict) -> bool:
            lo, hi = g["paragraph_range"][0], g["paragraph_range"][-1]
            if args.start_paragraph is not None and hi < args.start_paragraph:
                return False
            if args.end_paragraph is not None and lo > args.end_paragraph:
                return False
            return True
        groups = [g for g in groups if _in_range(g)]

    # Limit (useful for quick smoke-tests beyond a single file).
    if args.limit is not None:
        groups = groups[:args.limit]

    if args.dry_run:
        print(f"V2 dry run — {len(groups)} file(s):\n")
        for g in groups:
            rel = _v2_out_relpath(g)
            segs = [s for e in g["entries"] for s in e["segments"] if "v2" in s["targets"]]
            rng = g["paragraph_range"]
            print(f"  {g['file_number']}  §{rng[0]}–§{rng[-1]}  -> {rel}  ({len(segs)} segments)")
            for s in segs:
                print(f"    [{s['voice']:7s}] {s['text'][:90]!r}")
            print()
        return 0

    # Audio generation — requires explicit --confirm flag.
    if not args.confirm:
        print("V2 render is ready but audio generation requires --confirm.")
        print(f"Would render {len(groups)} file(s) into {args.out_dir}")
        print("Re-run with --confirm to proceed, or use --dry-run to preview.")
        return 0

    args.out_dir.mkdir(parents=True, exist_ok=True)

    index_path = args.out_dir / "index.json"
    index: dict = {}
    if index_path.exists():
        try:
            index = json.loads(index_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass

    for group in groups:
        rel = _v2_out_relpath(group)
        out_path = args.out_dir / rel
        rng = group["paragraph_range"]
        label = f"{group['file_number']}  §{rng[0]}–§{rng[-1]}"

        ok, chapter_map = rlib.render_v2_group(
            group=group, out_path=out_path,
            gap_ms=args.gap_ms, section_gap_ms=args.section_gap_ms,
            skip_existing=args.skip_existing,
            macos_gerard_voice=args.macos_gerard,
            macos_gerard_rate_wpm=args.macos_gerard_rate,
        )
        if not ok:
            print(f"FAIL {label}", file=sys.stderr)
            continue

        duration_ms = rlib.probe_duration_ms(out_path)
        loc = group["location"]

        # Boundary heading level decides how to derive the title.
        # Skip chapter preamble headings (single segment, no range announce) to
        # reach the real file boundary (article / en_bref / continuation /
        # standalone chapter).
        def _is_boundary_h(e: dict) -> bool:
            lv = e.get("level")
            if lv in ("article", "en_bref", "continuation"):
                return True
            return lv == "chapter" and len(e.get("segments", [])) >= 2

        boundary = next(
            (e for e in group["entries"] if e["kind"] == "heading" and _is_boundary_h(e)),
            next((e for e in group["entries"] if e["kind"] == "heading"), None),
        )
        level = boundary.get("level") if boundary else None
        para_title = group.get("paragraphe_title")
        if level == "en_bref":
            container = (loc.get("article_title") or loc.get("chapter_title")
                         or loc.get("section_title") or "CCC")
            title_seg = f"En bref · {container}"
        elif level == "continuation":
            container = (loc.get("article_title") or loc.get("chapter_title")
                         or loc.get("section_title") or "CCC")
            title_seg = f"{para_title} (suite)" if para_title else f"{container} (suite)"
        elif level == "article" and para_title:
            art_num = loc.get("article_number")
            prefix = f"Article {art_num} · " if art_num else ""
            title_seg = f"{prefix}{para_title}"
        else:
            # Title = first v2 segment of the boundary heading (skip range announces
            # like 'Paragraphes ...'). Falls back to first heading if no boundary.
            src = boundary["segments"] if boundary else [
                s for e in group["entries"] if e["kind"] == "heading"
                for s in e["segments"]
            ]
            title_seg = next(
                (s["text"] for s in src
                 if "v2" in s["targets"] and not s["text"].startswith(("Paragraphes ", "Paragraphe "))),
                f"CCC {group['file_number']}",
            )
        album = (loc.get("section_title") or loc.get("part_title") or "CCC")
        track_num = int(group["file_number"][1:])  # "h0042" -> 42
        rlib.tag_mp3(out_path, title=title_seg, album=album, track=track_num)

        entry: dict = {
            "file": rel,
            "paragraph_range": group["paragraph_range"],
            "duration_ms": duration_ms,
        }
        if chapter_map is not None:
            entry["chapter_map"] = chapter_map
        index[group["file_number"]] = entry
        print(f"OK  {label} -> {rel}  ({duration_ms}ms)")

    if groups:
        index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--target", choices=["v1", "v2"], default="v1")
    p.add_argument("--manifest", type=Path, required=True)
    p.add_argument("--out-dir", type=Path, required=True)
    p.add_argument("--dry-run", action="store_true",
                   help="Preview what would be rendered without generating audio.")
    p.add_argument("--confirm", action="store_true",
                   help="(V2 only) Required to actually start audio generation.")
    p.add_argument("--file-number",
                   help="(V2 only) Render a single file by its heading file_number, e.g. h0001.")
    p.add_argument("--limit", type=int, default=None,
                   help="(V2 only) Render at most N files.")
    p.add_argument("--start-paragraph", type=int, default=None)
    p.add_argument("--end-paragraph", type=int, default=None)
    p.add_argument("--seed", type=int, default=None,
                   help="(V1 only) RNG seed for Gerard pitch/rate jitter.")
    p.add_argument("--skip-existing", action="store_true", default=True)
    p.add_argument("--gap-ms", type=int, default=300,
                   help="Silence gap between segments (ms). Default 300.")
    p.add_argument("--section-gap-ms", type=int, default=700,
                   help="(V2 only) Wider pause after heading segments (ms). Default 700.")
    p.add_argument("--macos-gerard", metavar="VOICE",
                   help="(V2 only) macOS voice name to use instead of edge-tts Gérard, "
                        "e.g. 'Thomas (Enhanced)'.")
    p.add_argument("--macos-gerard-rate", type=int, default=None, metavar="WPM",
                   help="(V2 only) Words-per-minute rate for --macos-gerard. Default: system default.")
    args = p.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))

    if args.target == "v2":
        return _run_v2(args, manifest)
    return _run_v1(args, manifest)


if __name__ == "__main__":
    sys.exit(main())
