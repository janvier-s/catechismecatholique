#!/usr/bin/env python3
"""Extract logical lines from the Catéchisme de la Doctrine Chrétienne (Pie X petit).

Reads pages whose PDF page label matches Sec2:13 through Sec2:141 inclusive
(the main Q&A body, before the recueil de prières and appendice).

For each visual line, emits a JSON record describing the spans, fonts,
classification flags (diamond / dagger / Bodoni-orn / bold / italic), the
running-header heuristic, and the actual Unicode runs. Wingdings glyphs are
captured as flags only — their `text` is replaced with "" so downstream
text-joining doesn't pick up the raw `v`/`t` symbols.

Output: static/data/pius-x-petit/_raw/lines.json
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import fitz  # PyMuPDF

PDF_PATH = (
    Path.home()
    / "Library/Mobile Documents/com~apple~CloudDocs"
    / "for-the-kingdom/DOCTRINA/sources/tradi"
    / "Catéchisme de la Doctrine Chrétienne.pdf"
)

OUT_PATH = (
    Path(__file__).resolve().parents[3]
    / "static/data/pius-x-petit/_raw/lines.json"
)

START_LABEL = "Sec2:13"
END_LABEL = "Sec2:141"

# Tolerance for grouping spans by y-coordinate into the same visual line.
# 4pt copes with mixed-size superscript / subscript stacks like the small-caps
# "Iᴱʀ Cᴏᴍᴍᴀɴᴅᴇᴍᴇɴᴛ" dividers (where 5pt "ER" sits on the same baseline as
# 12pt "I").
Y_TOLERANCE = 4.0


def decode_label(raw: str | None) -> str:
    """Decode a PDF page label, stripping the FEFF UTF-16BE prefix wrapper.

    PyMuPDF returns labels like '<FEFF0053006500630032003A>14' for entries
    whose prefix was stored as a UTF-16BE PDFDocEncoded string. We unwrap
    that into 'Sec2:14'.
    """
    if not raw:
        return ""
    if raw.startswith("<FEFF"):
        try:
            end = raw.index(">")
            hex_body = raw[5:end]
            prefix = bytes.fromhex(hex_body).decode("utf-16-be")
            suffix = raw[end + 1 :]
            return prefix + suffix
        except Exception:
            return raw
    return raw


def font_family(font: str) -> str:
    """First word before hyphen — e.g. 'Cheltenham-BookItalic' -> 'Cheltenham'."""
    if not font:
        return ""
    return font.split("-", 1)[0]


def is_bold_font(font: str) -> bool:
    f = font or ""
    if "Light" in f:
        return False
    return ("Bold" in f) or ("Medium" in f)


def is_italic_font(font: str) -> bool:
    f = font or ""
    return ("Italic" in f) or ("Oblique" in f)


def is_wingdings(font: str) -> bool:
    return "Wingdings" in (font or "")


def is_bodoni_orn(font: str) -> bool:
    return "Bodoni" in (font or "")


def find_page_range(doc: fitz.Document) -> tuple[int, int]:
    """Return (start_idx, end_idx) inclusive for Sec2:13..Sec2:141."""
    start_idx = None
    end_idx = None
    for i in range(doc.page_count):
        lbl = decode_label(doc[i].get_label())
        if lbl == START_LABEL and start_idx is None:
            start_idx = i
        if lbl == END_LABEL:
            end_idx = i  # take the last matching, just in case
    if start_idx is None or end_idx is None:
        raise SystemExit(
            f"Could not locate page range {START_LABEL}..{END_LABEL} via PDF labels"
        )
    if end_idx < start_idx:
        raise SystemExit(
            f"Bad page range: start={start_idx}, end={end_idx}"
        )
    return start_idx, end_idx


def extract_lines_from_page(
    page: fitz.Page, page_idx: int, page_label: str
) -> list[dict]:
    """Group spans into visual lines by y-coordinate, emit one record per line.

    PyMuPDF's get_text("dict") already returns lines, but they can be split or
    merged unpredictably across blocks. We re-cluster spans across the page by
    y-center to get reliable visual lines.

    Some pages in this PDF render the same line twice (a kerned word-by-word
    layer plus a consolidated single-span layer with the same y/font/size and
    overlapping x-range). We deduplicate by detecting consolidated spans that
    cover the same x-range as a group of word-spans and dropping the
    word-spans.
    """
    page_height = page.rect.height
    spans: list[dict] = []
    d = page.get_text("dict")
    for block in d.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            for s in line.get("spans", []):
                bbox = s.get("bbox", (0, 0, 0, 0))
                # Some rotated / vertical running headers report a huge bbox
                # (height > 30pt) that wreaks havoc on y-clustering. Detect
                # via bbox-height > 4× font-size and synthesize a y_center
                # tied to y_top instead — and pre-mark these as running
                # headers so they get filtered out at line level.
                bbox_h = bbox[3] - bbox[1]
                size = s.get("size", 0.0)
                rotated_header = size > 0 and bbox_h > 4 * size
                if rotated_header:
                    y_center = bbox[1] + size / 2
                else:
                    y_center = (bbox[1] + bbox[3]) / 2
                spans.append(
                    {
                        "x0": bbox[0],
                        "x1": bbox[2],
                        "y_top": bbox[1],
                        "y_center": y_center,
                        "font": s.get("font", ""),
                        "size": size,
                        "text": s.get("text", ""),
                        "rotated_header": rotated_header,
                    }
                )

    # Cluster by y_center within ±Y_TOLERANCE. Refuse to cluster spans whose
    # font sizes differ by more than 1.7× — that breaks the "II" (44pt) vs
    # "La morale chrétienne" (18pt) accidental overlap on Part-divider pages.
    # Wingdings spans are exempt from the size-ratio check: their nominal
    # size is the (small) glyph height, but the diamond/dagger marker still
    # belongs on the text line that follows it.
    spans.sort(key=lambda s: (s["y_center"], s["x0"]))
    clusters: list[list[dict]] = []
    for sp in spans:
        if clusters and abs(sp["y_center"] - clusters[-1][-1]["y_center"]) <= Y_TOLERANCE:
            sp_is_marker = is_wingdings(sp["font"]) or is_bodoni_orn(sp["font"])
            existing_marker_only = all(
                is_wingdings(s["font"]) or is_bodoni_orn(s["font"]) for s in clusters[-1]
            )
            if sp_is_marker or existing_marker_only:
                # Always cluster markers with adjacent text.
                clusters[-1].append(sp)
                continue
            existing_sizes = [s["size"] for s in clusters[-1] if s["size"] > 0]
            if existing_sizes:
                dom_size = max(existing_sizes, key=lambda sz: sum(1 for s in clusters[-1] if abs(s["size"] - sz) < 0.5))
                ratio = max(sp["size"], dom_size) / max(min(sp["size"], dom_size), 0.1)
                if ratio > 1.7:
                    clusters.append([sp])
                    continue
            clusters[-1].append(sp)
        else:
            clusters.append([sp])

    # Dedupe within each cluster. Some pages render the same line twice — once
    # as a kerned word-by-word layer and once as a consolidated layer. Two
    # passes:
    #   1. Heavy x-overlap with the same font+size: drop the smaller-text
    #      span (keeps the long consolidated form). This catches "390."
    #      duplicates where two spans cover x≈45-71 and x≈49-74 simultaneously.
    #   2. Whole-line dup: if one span's normalised text equals the joined text
    #      of all the other same-style spans, drop the others.
    def _norm(s: str) -> str:
        return " ".join(s.split()).strip()

    def _x_overlap(a: dict, b: dict) -> float:
        lo = max(a["x0"], b["x0"])
        hi = min(a["x1"], b["x1"])
        return max(0.0, hi - lo)

    cleaned_clusters: list[list[dict]] = []
    for cluster in clusters:
        drop: set[int] = set()

        # Pass 1: pairwise x-overlap check.
        for i in range(len(cluster)):
            if i in drop:
                continue
            for j in range(len(cluster)):
                if i == j or j in drop:
                    continue
                a, b = cluster[i], cluster[j]
                if a["font"] != b["font"] or abs(a["size"] - b["size"]) > 0.1:
                    continue
                a_w = max(a["x1"] - a["x0"], 0.1)
                b_w = max(b["x1"] - b["x0"], 0.1)
                overlap = _x_overlap(a, b)
                # If overlap covers >70% of the SHORTER span and the shorter
                # span has shorter text, treat shorter as a duplicate.
                if overlap / min(a_w, b_w) > 0.7:
                    a_t = _norm(a["text"])
                    b_t = _norm(b["text"])
                    if len(a_t) < len(b_t):
                        drop.add(i)
                        break
                    elif len(b_t) < len(a_t):
                        drop.add(j)
                    elif a_t == b_t:
                        # Same text, same style, heavy overlap — pure duplicate.
                        # Drop the one that starts further left (the kerned one
                        # tends to have leading whitespace and starts earlier).
                        # Keeping `j` is arbitrary but stable.
                        drop.add(i if a["x0"] < b["x0"] else j)
                        if i in drop:
                            break

        # Pass 2: long-span equals joined-others.
        from collections import defaultdict

        groups: dict[tuple, list[int]] = defaultdict(list)
        for i, s in enumerate(cluster):
            if i in drop:
                continue
            key = (s["font"], round(s["size"], 1))
            groups[key].append(i)

        for key, idxs in groups.items():
            if len(idxs) < 2:
                continue
            for i in idxs:
                long_text = _norm(cluster[i]["text"])
                if len(long_text) < 8:
                    continue
                others = [k for k in idxs if k != i]
                joined = _norm("".join(cluster[k]["text"] for k in others))
                if joined and (joined == long_text or joined in long_text):
                    drop.update(others)
                    break

        cleaned_clusters.append([s for k, s in enumerate(cluster) if k not in drop])
    clusters = cleaned_clusters

    records: list[dict] = []
    for cluster in clusters:
        cluster.sort(key=lambda s: s["x0"])
        runs = []
        has_diamond = False
        has_dagger = False
        has_bodoni_orn = False
        any_bold = False
        any_italic = False
        max_size = 0.0
        # Pick dominant font family by char count.
        family_chars: dict[str, int] = {}
        y_top_min = min(s["y_top"] for s in cluster)
        x_min = min(s["x0"] for s in cluster)

        for s in cluster:
            font = s["font"]
            text = s["text"]
            size = s["size"]
            max_size = max(max_size, size)

            # Daggers ('‡' / '†') in this PDF come from the 'Times-Catho-SC700'
            # font (small caps Times) not Wingdings; flag them by raw character.
            if "‡" in text or "†" in text:
                has_dagger = True

            # Wingdings: classify and replace text with "".
            run_text = text
            if is_wingdings(font):
                # Diamond: PDF byte 'v' or actual U+25C7. Some PDFs map this to
                # 'l' or other glyphs depending on encoding — check both.
                if "v" in text or "◇" in text or "l" in text:
                    has_diamond = True
                # Wingdings dagger fallback (rare): 't' byte.
                if "t" in text:
                    has_dagger = True
                run_text = ""
            elif is_bodoni_orn(font):
                has_bodoni_orn = True
                # Keep the BodoniOrnaments glyph in runs as empty too — its
                # rendering is decorative; the logical role is captured by the
                # flag.
                run_text = ""
            elif "‡" in run_text or "†" in run_text:
                # Strip the dagger character itself from the visible run; the
                # has_dagger flag carries the meaning.
                run_text = run_text.replace("‡", "").replace("†", "")

            bold = is_bold_font(font)
            italic = is_italic_font(font)
            # A bold span that's just whitespace shouldn't flip the line's
            # is_bold flag — printers often kern with a Formata-Medium space
            # between two Formata-Light words. Only count bold runs that
            # actually contribute non-whitespace text.
            stripped = (run_text or "").strip()
            if bold and stripped:
                any_bold = True
            if italic and stripped:
                any_italic = True

            runs.append({"text": run_text, "bold": bold, "italic": italic})

            # Track dominant font family by visible-text char count.
            if run_text:
                fam = font_family(font)
                family_chars[fam] = family_chars.get(fam, 0) + len(run_text)

        if family_chars:
            dom_font = max(family_chars.items(), key=lambda kv: kv[1])[0]
        else:
            # No visible text — fall back to the longest run's font family.
            dom_font = font_family(cluster[0]["font"])

        # Running-header heuristic.
        is_running_header = y_top_min < 55 or y_top_min > (page_height - 45)
        # If any span in the cluster was a rotated header (huge bbox), drop
        # the whole cluster as a header.
        if any(s.get("rotated_header") for s in cluster):
            is_running_header = True

        records.append(
            {
                "page_idx": page_idx,
                "page_label": page_label,
                "y": round(y_top_min, 2),
                "x": round(x_min, 2),
                "is_running_header": is_running_header,
                "has_diamond": has_diamond,
                "has_dagger": has_dagger,
                "has_bodoni_orn": has_bodoni_orn,
                "is_bold": any_bold,
                "is_italic": any_italic,
                "dom_font": dom_font,
                "max_size": round(max_size, 2),
                "runs": runs,
            }
        )

    return records


def main() -> int:
    if not PDF_PATH.exists():
        print(f"PDF not found: {PDF_PATH}", file=sys.stderr)
        return 1
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(PDF_PATH)
    start_idx, end_idx = find_page_range(doc)
    print(
        f"Page range: idx {start_idx}..{end_idx} "
        f"({START_LABEL}..{END_LABEL}, {end_idx - start_idx + 1} pages)"
    )

    all_records: list[dict] = []
    for idx in range(start_idx, end_idx + 1):
        page = doc[idx]
        label = decode_label(page.get_label())
        records = extract_lines_from_page(page, idx, label)
        all_records.extend(records)

    OUT_PATH.write_text(
        json.dumps(all_records, ensure_ascii=False, indent=0),
        encoding="utf-8",
    )

    n_diamond = sum(1 for r in all_records if r["has_diamond"])
    n_dagger = sum(1 for r in all_records if r["has_dagger"])
    n_bodoni = sum(1 for r in all_records if r["has_bodoni_orn"])
    n_pages = end_idx - start_idx + 1
    print(f"Pages processed:     {n_pages}")
    print(f"Lines emitted:       {len(all_records)}")
    print(f"  has_diamond:       {n_diamond}")
    print(f"  has_dagger:        {n_dagger}")
    print(f"  has_bodoni_orn:    {n_bodoni}")
    print(f"Output:              {OUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
