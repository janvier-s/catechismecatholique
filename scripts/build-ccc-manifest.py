#!/usr/bin/env python3
"""Build the CCC audio manifest from source paragraph + chapter data.

Outputs:
  --out          ccc_audio.manifest.json
  --audit        ccc_audio.citation_audit.csv
  --leakage      ccc_audio.leakage_report.txt

With --lint, scans the manifest for Latin/Greek leakage and exits non-zero
when unknown French words remain after the allowlist filter.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import ccc_audio


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--chapters-full", type=Path, required=True)
    p.add_argument("--paragraphs", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--audit", type=Path, required=True)
    p.add_argument("--leakage", type=Path, required=True)
    p.add_argument("--structure", type=Path, default=None,
                   help="Path to structure.json (default: <chapters-full>/../structure.json).")
    p.add_argument("--allowlist", type=Path, default=None,
                   help="Newline-separated extra words to consider known.")
    p.add_argument("--lint", action="store_true",
                   help="Block (exit !=0) when leakage report non-empty.")
    args = p.parse_args()

    manifest, audit_rows = ccc_audio.build_manifest(
        chapters_full_dir=args.chapters_full,
        paragraphs_dir=args.paragraphs,
        structure_path=args.structure,
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"manifest: {len(manifest['entries'])} entries → {args.out}")

    # Audit CSV
    args.audit.parent.mkdir(parents=True, exist_ok=True)
    with args.audit.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "paragraph", "citation_index", "mref_type",
            "mref_idx", "mref_raw", "tier_used", "derived_intro",
        ])
        writer.writeheader()
        writer.writerows(audit_rows)
    print(f"audit: {len(audit_rows)} citations → {args.audit}")

    # Leakage report: collect every segment text
    texts: list[tuple[str, str]] = []  # (label, text)
    for entry in manifest["entries"]:
        if entry["kind"] == "heading":
            rng = entry.get("paragraph_range", [])
            label = f"h({entry['level']} §{rng[0] if rng else '?'})"
        elif entry["kind"] == "paragraph":
            label = f"§{entry['number']}"
        else:
            label = f"eb({entry.get('chapter_slug')})"
        for seg in entry["segments"]:
            texts.append((label, seg["text"]))
    flagged = ccc_audio.run_leakage_check(
        [t for _, t in texts],
        allowlist=args.allowlist,
    )
    args.leakage.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []
    if not flagged:
        lines.append("=== Latin/Greek leakage report ===")
        lines.append("0 entries — clean")
    else:
        lines.append("=== Latin/Greek leakage report ===")
        for idx, word in flagged:
            label, text = texts[idx]
            lines.append(f"{label}\t{word}\t{text[:120]!r}")
        lines.append(f"=== {len(flagged)} flagged ===")
    args.leakage.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"leakage: {len(flagged)} flagged → {args.leakage}")

    # Print en-bref clusters for human eyeball review.
    en_bref_paragraphs = []
    for entry in manifest["entries"]:
        if entry["kind"] != "paragraph":
            continue
        # detect en bref by looking at segments — quicker than re-loading source
        # (skipped for cleanliness; manifest does not preserve is_en_bref directly,
        #  but the en_bref_combined entries themselves enumerate the cluster).
        pass
    print("\nEn bref clusters (from en_bref_combined entries):")
    for entry in manifest["entries"]:
        if entry["kind"] == "en_bref_combined":
            r = entry["paragraph_range"]
            print(f"  {entry['chapter_slug']}: §{r[0]}–§{r[1] if len(r) > 1 else r[0]}")

    if args.lint and flagged:
        print("\nlint FAILED — clean the leakage report or extend the allowlist.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
