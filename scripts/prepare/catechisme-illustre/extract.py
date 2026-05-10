#!/usr/bin/env python3
"""
Extract `Catéchisme illustré des vérités nécessaires` (Wikisource EPUB) into
clean per-chapter JSON + optimized WebP illustrations.

Input  : scripts/data-sources/catechisme-illustre/source.epub
Output :
  static/data/catechisme-illustre/structure.json
  static/data/catechisme-illustre/chapters/<slug>.json   (per chapter)
  static/data/catechisme-illustre/images/<slug>.webp     (≤900px wide)

The EPUB is a Wikisource export; XHTML is full of Parsoid markup
(`about="#mwt..."`, `<span class="pagenum">`, MediaWiki templates).
We strip all that and reduce each chapter to:

  { ordinal, roman, slug, title, subtitle, image{src,alt,caption},
    blocks[ {kind: 'para', n, html}, … ],
    questions[ {n, q, a} ],
    image_explanation_html }

Front-matter chapters (Préface, Introduction, Avis, Prières) emit a
flatter shape with `kind: 'flat'` and a single `html` body.
"""

from __future__ import annotations

import io
import json
import os
import re
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent
EPUB_PATH = ROOT / "scripts/data-sources/catechisme-illustre/source.epub"
OUT_DIR = ROOT / "static/data/catechisme-illustre"
OUT_CHAPTERS = OUT_DIR / "chapters"
OUT_IMAGES = OUT_DIR / "images"

NS = "{http://www.w3.org/1999/xhtml}"

# Roman → ordinal for the 12 numbered chapters.
ROMAN_ORDER = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]

CHAPTER_TITLES: dict[str, str] = {
    "I": "Dieu",
    "II": "L’Homme",
    "III": "L’Homme après le Péché",
    "IV": "Le Sauveur",
    "V": "L’Enseignement du Sauveur",
    "VI": "Le Rachat du Monde",
    "VII": "La Mission des Apôtres",
    "VIII": "Le Baptême",
    "IX": "Les deux Routes",
    "X": "La Fin",
    "XI": "L’Enfer",
    "XII": "Le Ciel",
}

CHAPTER_SLUGS: dict[str, str] = {
    "I": "1-dieu",
    "II": "2-homme",
    "III": "3-homme-apres-le-peche",
    "IV": "4-sauveur",
    "V": "5-enseignement-du-sauveur",
    "VI": "6-rachat-du-monde",
    "VII": "7-mission-des-apotres",
    "VIII": "8-bapteme",
    "IX": "9-deux-routes",
    "X": "10-fin",
    "XI": "11-enfer",
    "XII": "12-ciel",
}

FRONT_MATTER = [
    ("preface", "Préface", "c1_Catechisme_illustre_des_verites_necessaires_Preface.xhtml"),
    ("introduction", "Introduction", "c2_Catechisme_illustre_des_verites_necessaires_Introduction.xhtml"),
]
BACK_MATTER = [
    ("avis", "Avis", "c15_Catechisme_illustre_des_verites_necessaires_Avis.xhtml"),
    ("prieres", "Prières", "c16_Catechisme_illustre_des_verites_necessaires_Prieres.xhtml"),
]

# Sup roman digits used in chapters (I, II, III, …).
ROMAN_RE = re.compile(r"^(?P<roman>[IVX]+)\.?\s*[—–-]\s*(.*)$")


# ─── EPUB plumbing ──────────────────────────────────────────────────────────


def open_epub() -> zipfile.ZipFile:
    if not EPUB_PATH.exists():
        sys.stderr.write(f"missing source EPUB at {EPUB_PATH}\n")
        sys.exit(1)
    return zipfile.ZipFile(EPUB_PATH, "r")


def read_xhtml(zf: zipfile.ZipFile, name: str) -> ET.Element:
    raw = zf.read(f"OPS/{name}")
    # Strip the standalone XML declaration; ElementTree's bundled XHTML is fine.
    text = raw.decode("utf-8")
    return ET.fromstring(text)


# ─── Tree cleanup ───────────────────────────────────────────────────────────


def strip_node(el: ET.Element) -> None:
    """Drop Wikisource/Parsoid noise in-place."""
    # Remove style blocks, page-number markers, mw:DisplaySpace pseudo-spans
    for child in list(el):
        tag = child.tag.replace(NS, "")
        cls = (child.get("class") or "").split()
        type_ = child.get("typeof") or ""
        if tag in ("style", "link", "meta"):
            el.remove(child)
            continue
        if tag == "span" and ("pagenum" in cls or "ws-pagenum" in cls):
            # Remove page markers entirely.
            el.remove(child)
            continue
        if tag == "span" and type_ == "mw:DisplaySpace":
            # Replace with NBSP text.
            tail = child.tail or ""
            child.clear()
            child.tag = NS + "span"  # keep harmless
            # Replace the element with its NBSP textual content by collapsing it.
            idx = list(el).index(child)
            el.remove(child)
            # Stitch NBSP onto previous tail / parent text.
            if idx > 0:
                prev = list(el)[idx - 1]
                prev.tail = (prev.tail or "") + " " + tail
            else:
                el.text = (el.text or "") + " " + tail
            continue
        if tag == "span" and "sc" in cls:
            # MediaWiki <span class="sc"> = small caps. Keep text, drop wrapper.
            inline_html_inplace(child)
            continue
        # Recurse.
        strip_node(child)


def inline_html_inplace(child: ET.Element) -> None:
    """Replace a child element with its text + tail in its parent."""
    # We can't replace nodes mid-iteration cleanly with ElementTree; this is a
    # placeholder — rendering pass instead converts <span class="sc"> to a
    # <span class="small-caps"> wrapper for downstream styling.
    child.set("class", "small-caps")


def clean_attrs(el: ET.Element) -> None:
    """Recursively drop noisy Parsoid attrs."""
    keep = {"href", "src", "alt", "id", "class"}
    bad_classes = {
        "mw-content-ltr",
        "sitedir-ltr",
        "ltr",
        "mw-body-content",
        "parsoid-body",
        "mediawiki",
        "mw-parser-output",
        "mw-halign-center",
        "mw-file-description",
        "mw-file-element",
        "tmp",
        "prp-pages-output",
    }
    for k in list(el.attrib.keys()):
        if k in ("about", "typeof", "data-mw-parsoid-version", "data-mw-html-version",
                 "xml:lang", "dir", "data-file-type", "data-title", "decoding",
                 "resource", "itemprop", "itemscope", "itemtype", "content",
                 "style"):
            del el.attrib[k]
            continue
        if k == "class":
            classes = [c for c in el.attrib[k].split() if c not in bad_classes]
            if classes:
                el.attrib[k] = " ".join(classes)
            else:
                del el.attrib[k]
            continue
        if k not in keep:
            del el.attrib[k]
    for c in list(el):
        clean_attrs(c)


def to_html(el: ET.Element) -> str:
    """Serialize an element subtree to HTML with no XML namespace prefixes."""
    # Strip the XHTML namespace from tag names (`html:span` → `span`) and any
    # `xmlns` attribute Python's ElementTree may emit.
    raw = ET.tostring(el, encoding="unicode")
    raw = re.sub(r"\s+xmlns(?::\w+)?=\"[^\"]*\"", "", raw)
    raw = re.sub(r"<(/?)html:", r"<\1", raw)
    return raw


def text_of(el: ET.Element) -> str:
    """Plain-text concatenation of an element subtree."""
    parts: list[str] = []
    if el.text:
        parts.append(el.text)
    for c in el:
        parts.append(text_of(c))
        if c.tail:
            parts.append(c.tail)
    return "".join(parts)


def normalize_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


# ─── Chapter parsing ────────────────────────────────────────────────────────


@dataclass
class Block:
    kind: str
    n: int | None
    html: str


@dataclass
class QA:
    n: int
    q: str
    a: str


def find_body(el: ET.Element) -> ET.Element:
    body = el.find(f".//{NS}body")
    assert body is not None
    return body


def serialize_inline(el: ET.Element) -> str:
    """Return inner HTML of an element (children only, no opening tag)."""
    out: list[str] = []
    if el.text:
        out.append(el.text)
    for c in el:
        out.append(to_html(c))
        if c.tail:
            out.append(c.tail)
    return "".join(out)


def child_paras(body: ET.Element) -> list[ET.Element]:
    """Flatten <body><section><div>… → list of <p>/<h2>/<figure>/<hr>/<div>.

    `div` elements with a non-trivial style/class (e.g. centered title or
    section-divider divs like "QUESTIONS") are kept as nodes; layout
    wrapper divs are descended into.
    """
    nodes: list[ET.Element] = []

    def walk(el: ET.Element) -> None:
        for c in el:
            tag = c.tag.replace(NS, "")
            if tag in ("p", "h2", "h3", "figure", "hr", "ol", "ul"):
                nodes.append(c)
            elif tag == "div":
                # Treat div as content if it's a styled center-block (no
                # children that are themselves block-level), otherwise
                # descend into it.
                child_tags = {child.tag.replace(NS, "") for child in c}
                is_wrapper = bool(
                    child_tags & {"p", "h2", "h3", "figure", "hr", "ol", "ul", "div"}
                )
                if is_wrapper:
                    walk(c)
                else:
                    nodes.append(c)
            elif tag in ("section", "span"):
                walk(c)

    walk(body)
    return nodes


# Q. number prefix: "1. Qui est-ce qui …"
QA_PREFIX_RE = re.compile(r"^\s*(\d+)\.\s+")


def parse_chapter(body: ET.Element, roman: str) -> dict[str, Any]:
    """Extract a numbered chapter (I–XII)."""
    paras = child_paras(body)

    # Single pass with a section state machine.
    image: dict[str, Any] | None = None
    subtitle = ""
    body_paras: list[ET.Element] = []
    questions_paras: list[ET.Element] = []
    image_paras: list[ET.Element] = []
    section = "preamble"  # preamble → body → questions → image

    for n in paras:
        tag = n.tag.replace(NS, "")
        text = normalize_ws(text_of(n))

        # Image: extract first figure; do not switch sections on it.
        if tag == "figure":
            img = n.find(f".//{NS}img")
            cap = n.find(f"{NS}figcaption")
            if img is not None and image is None:
                image = {
                    "epub_src": img.get("src", ""),
                    "alt": (img.get("alt") or "").strip(),
                    "caption": normalize_ws(text_of(cap)) if cap is not None else "",
                }
            continue

        # Chapter heading "I. — Dieu." opens the prose body.
        if tag == "h2":
            section = "body"
            continue

        # Centered styled divs act as section dividers ("QUESTIONS", "L'IMAGE").
        if tag == "div":
            t_upper = text.upper().strip()
            if t_upper == "QUESTIONS":
                section = "questions"
                continue
            if t_upper.startswith("L’IMAGE") or t_upper.startswith("L'IMAGE"):
                section = "image"
                continue
            # Other styled divs (e.g. the all-caps title "DIEU") — discard.
            continue

        if tag == "hr":
            continue
        if tag == "p" and not text:
            continue
        if tag != "p":
            continue

        if section == "preamble":
            # The first non-empty <p> in the preamble is the subtitle caption.
            if not subtitle:
                subtitle = text
        elif section == "body":
            body_paras.append(n)
        elif section == "questions":
            questions_paras.append(n)
        elif section == "image":
            image_paras.append(n)

    # Body blocks: each numbered paragraph "I. — …" / "II. — …" — emit as
    # `kind: 'para'` with a synthetic `n` counter (1-based).
    blocks: list[dict[str, Any]] = []
    for i, p in enumerate(body_paras, start=1):
        html = serialize_inline(p).strip()
        # Strip the leading roman/numeric counter so the marginal `n` doesn't
        # double up with the printed prefix.
        plain = normalize_ws(text_of(p))
        m = re.match(r"^([IVX]+|\d+)\.\s*[—–-]\s*", plain)
        if m:
            html = re.sub(
                r"^(\s*<[^>]*>\s*)*" + re.escape(m.group(0)),
                "",
                html,
                count=1,
            )
        blocks.append({"kind": "para", "n": i, "html": html.strip()})

    # Questions: each <p> contains "N. Q? — A."; split on the em-dash.
    questions: list[dict[str, Any]] = []
    for q_el in questions_paras:
        plain = normalize_ws(text_of(q_el))
        m = QA_PREFIX_RE.match(plain)
        if not m:
            continue
        n = int(m.group(1))
        rest = plain[m.end():]
        # Split at the first em-dash, en-dash, or hyphen with surrounding spaces.
        split = re.split(r"\s+[—–-]\s+", rest, maxsplit=1)
        if len(split) == 2:
            q, a = split[0].strip(" ;:"), split[1].strip()
        else:
            q, a = rest.strip(), ""
        questions.append({"n": n, "q": q, "a": a})

    # L'IMAGE explanation: concatenate the remaining <p>s as paragraphs.
    # The printed source flows "L’image / représente Dieu, unique…" — i.e.
    # the section heading "L’image" is the implicit subject of the first
    # paragraph. We render the heading separately, so prepend a feminine
    # pronoun ("Elle") so the first sentence reads as a complete clause.
    image_html_parts: list[str] = []
    for i, p in enumerate(image_paras):
        inner = serialize_inline(p).strip()
        if not inner:
            continue
        if i == 0:
            # Find the first run of visible text in the inner HTML and
            # prepend "Elle " before it (skipping leading <br/> / whitespace).
            inner = re.sub(
                r"^((?:\s*<br\s*/?>\s*)*)",
                lambda m: m.group(1) + "Elle ",
                inner,
                count=1,
            )
        image_html_parts.append(f"<p>{inner}</p>")
    image_explanation_html = "".join(image_html_parts)

    return {
        "kind": "chapter",
        "ordinal": ROMAN_ORDER.index(roman) + 1,
        "roman": roman,
        "slug": CHAPTER_SLUGS[roman],
        "title": CHAPTER_TITLES[roman],
        "subtitle": subtitle,
        "image": image,
        "blocks": blocks,
        "questions": questions,
        "image_explanation_html": image_explanation_html,
    }


def parse_flat(body: ET.Element, slug: str, title: str) -> dict[str, Any]:
    """Front/back-matter pages: just dump the cleaned <p>/<h2>/<h3> stream."""
    paras = child_paras(body)
    parts: list[str] = []
    for n in paras:
        tag = n.tag.replace(NS, "")
        text = normalize_ws(text_of(n))
        if not text:
            continue
        if tag == "p":
            parts.append(f"<p>{serialize_inline(n).strip()}</p>")
        elif tag in ("h2", "h3"):
            parts.append(f"<{tag}>{text}</{tag}>")
        elif tag == "div":
            t_upper = text.upper().strip()
            if t_upper in ("QUESTIONS",):
                parts.append(f'<p class="div-eyebrow">{text}</p>')
            else:
                parts.append(f"<p>{serialize_inline(n).strip()}</p>")
    return {
        "slug": slug,
        "title": title,
        "kind": "flat",
        "html": "".join(parts),
    }


# ─── Image optimization ─────────────────────────────────────────────────────


def optimize_image(zf: zipfile.ZipFile, epub_src: str, slug: str) -> str:
    """Read the EPUB-internal image, resize/encode WebP, return relative URL."""
    # epub_src is relative to the chapter XHTML, e.g. "images/c20_…jpeg_…thumbnail"
    inner = "OPS/" + epub_src
    raw = zf.read(inner)
    img = Image.open(io.BytesIO(raw))
    img = img.convert("RGB")
    max_w = 900
    if img.width > max_w:
        h = int(img.height * (max_w / img.width))
        img = img.resize((max_w, h), Image.LANCZOS)
    OUT_IMAGES.mkdir(parents=True, exist_ok=True)
    out = OUT_IMAGES / f"{slug}.webp"
    img.save(out, format="WEBP", quality=80, method=6)
    return f"/data/catechisme-illustre/images/{slug}.webp"


# ─── Driver ─────────────────────────────────────────────────────────────────


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_CHAPTERS.mkdir(parents=True, exist_ok=True)

    zf = open_epub()
    chapters: list[dict[str, Any]] = []
    flats: list[dict[str, Any]] = []

    # Front matter
    for slug, title, fname in FRONT_MATTER:
        root = read_xhtml(zf, fname)
        body = find_body(root)
        strip_node(body)
        clean_attrs(body)
        flat = parse_flat(body, slug, title)
        flats.append(flat)
        with open(OUT_CHAPTERS / f"{slug}.json", "w", encoding="utf-8") as fh:
            json.dump(flat, fh, ensure_ascii=False, indent=2)
        print(f"  {slug}: flat ({len(flat['html'])} chars)")

    # Numbered chapters
    for roman in ROMAN_ORDER:
        idx = ROMAN_ORDER.index(roman)
        # Filename pattern: c{3+idx}_..._{roman}.xhtml
        fname = f"c{3 + idx}_Catechisme_illustre_des_verites_necessaires_{roman}.xhtml"
        root = read_xhtml(zf, fname)
        body = find_body(root)
        strip_node(body)
        clean_attrs(body)
        ch = parse_chapter(body, roman)
        # Optimize illustration
        img = ch["image"]
        if img and img.get("epub_src"):
            url = optimize_image(zf, img["epub_src"], ch["slug"])
            ch["image"] = {"src": url, "alt": img["alt"], "caption": img["caption"]}
        chapters.append(ch)
        with open(OUT_CHAPTERS / f"{ch['slug']}.json", "w", encoding="utf-8") as fh:
            json.dump(ch, fh, ensure_ascii=False, indent=2)
        print(
            f"  {ch['slug']}: {len(ch['blocks'])} blocks, "
            f"{len(ch['questions'])} questions, "
            f"image={'yes' if ch['image'] else 'no'}"
        )

    # Back matter
    for slug, title, fname in BACK_MATTER:
        root = read_xhtml(zf, fname)
        body = find_body(root)
        strip_node(body)
        clean_attrs(body)
        flat = parse_flat(body, slug, title)
        flats.append(flat)
        with open(OUT_CHAPTERS / f"{slug}.json", "w", encoding="utf-8") as fh:
            json.dump(flat, fh, ensure_ascii=False, indent=2)
        print(f"  {slug}: flat ({len(flat['html'])} chars)")

    structure = {
        "corpus": "catechisme-illustre",
        "title": "Catéchisme illustré des vérités nécessaires",
        "subtitle": "12 Images, 12 Leçons",
        "author": "A. L. R.",
        "year": 1897,
        "front_matter": [{"slug": s["slug"], "title": s["title"]} for s in flats[:2]],
        "chapters": [
            {
                "slug": c["slug"],
                "ordinal": c["ordinal"],
                "roman": c["roman"],
                "title": c["title"],
                "subtitle": c["subtitle"],
                "image_url": c["image"]["src"] if c["image"] else None,
            }
            for c in chapters
        ],
        "back_matter": [{"slug": s["slug"], "title": s["title"]} for s in flats[2:]],
    }
    with open(OUT_DIR / "structure.json", "w", encoding="utf-8") as fh:
        json.dump(structure, fh, ensure_ascii=False, indent=2)
    print(f"wrote structure.json ({len(chapters)} chapters, {len(flats)} flat pages)")


if __name__ == "__main__":
    main()
