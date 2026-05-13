#!/usr/bin/env python3
"""
Scrapes the 3 missing Vatican II decrees from vatican.va and writes them
to static/data/vatican-ii/docs/{slug}.json, then updates structure.json.

Run from project root:
  python3 scripts/scrape-vatii-missing.py
"""

import html as htmlmod
import json
import re
import sys
import unicodedata
from pathlib import Path
from urllib.request import urlopen, Request

DOCS_DIR   = Path("static/data/vatican-ii/docs")
STRUCT_PATH = Path("static/data/vatican-ii/structure.json")

# ── Document registry ────────────────────────────────────────────────────────
DOCS = [
    {
        "slug": "apostolicam-actuositatem",
        "abbr": "AA",
        "kind": "decree",
        "date": "1965-11-18",
        "title": "Apostolicam Actuositatem",
        "subtitle": "Décret sur l'apostolat des laïcs",
        "url": "https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decree_19651118_apostolicam-actuositatem_fr.html",
    },
    {
        "slug": "ad-gentes",
        "abbr": "AG",
        "kind": "decree",
        "date": "1965-12-07",
        "title": "Ad Gentes",
        "subtitle": "Décret sur l'activité missionnaire de l'Église",
        "url": "https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decree_19651207_ad-gentes_fr.html",
    },
    {
        "slug": "presbyterorum-ordinis",
        "abbr": "PO",
        "kind": "decree",
        "date": "1965-12-07",
        "title": "Presbyterorum Ordinis",
        "subtitle": "Décret sur le ministère et la vie des prêtres",
        "url": "https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decree_19651207_presbyterorum-ordinis_fr.html",
    },
]

# ── Helpers ──────────────────────────────────────────────────────────────────
def slugify(text: str) -> str:
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")

def plain(h: str) -> str:
    h = re.sub(r"<br\s*/?>", " ", h, flags=re.IGNORECASE)
    h = re.sub(r"<[^>]+>", "", h)
    return re.sub(r"\s+", " ", h.replace("\xa0", " ")).strip()

def strip_fn_refs(body: str) -> tuple[str, list[int]]:
    """Remove inline footnote links, return cleaned HTML + ref numbers."""
    refs: list[int] = []
    def _repl(m: re.Match) -> str:
        n = int(m.group(1))
        refs.append(n)
        return f'<sup class="vat-ii-fn-ref" data-fn="{n}">{n}</sup>'
    # [<a href="#_ftnN" ...>N</a>]
    out = re.sub(r"\[<a[^>]*>(\d+)</a>\]", _repl, body)
    # Remove leftover <a name=...> anchors
    out = re.sub(r'<a\s+(?:name|id)="[^"]*"\s*/?>', "", out)
    out = re.sub(r"</a>", "", out)
    return out, refs

def clean_body(raw: str) -> str:
    """Strip markup that shouldn't appear in paragraph html."""
    # Remove bold/italic wrappers around the number at the start
    s = re.sub(r"<b><i>\d+\.</i></b>\s*", "", raw)
    # Normalize whitespace
    s = re.sub(r"\s+", " ", s.replace("\xa0", " ")).strip()
    return s

def level_from_title(title: str) -> int:
    if re.match(r"^CHAPITRE\b", title, re.IGNORECASE):
        return 2
    if re.match(r"^(?:I{1,3}|I[VX]|V|VI{0,3}|IX|X{1,3}|XI{0,3})\b[\s.:\-]", title):
        return 3
    if re.match(r"^[A-Z][.)]\s", title):
        return 4
    return 3

# ── Fetcher ──────────────────────────────────────────────────────────────────
def fetch(url: str) -> str:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=30) as r:
        raw = r.read()
    # Vatican pages are latin-1 with HTML entities
    text = raw.decode("latin-1")
    return htmlmod.unescape(text)

# ── Parser ───────────────────────────────────────────────────────────────────
def parse_doc(decoded: str, meta: dict) -> tuple[dict, int]:
    # Crop to main body: after first <hr>, before footnotes
    start = decoded.find("<hr")
    if start < 0:
        start = 0

    # Find footnote section start
    end = len(decoded)
    for marker in ['name="_ftn1"', 'id="_ftn1"']:
        idx = decoded.find(marker)
        if 0 < idx < end:
            pre = decoded.rfind("<p", 0, idx)
            if pre > start:
                end = pre
            break

    content = decoded[start:end]

    # Extract all <p> tags
    paras: list[tuple[str, str]] = re.findall(
        r"<p([^>]*)>(.*?)</p>", content, re.DOTALL | re.IGNORECASE
    )

    blocks: list[dict] = []
    toc: list[dict] = []
    taken: set[str] = set()

    # State machine
    cur_n: int | None = None
    cur_title: str | None = None
    cur_bodies: list[str] = []
    cur_refs: list[int] = []
    pending_title: str | None = None   # center heading before para §1
    first_heading_done = False

    def unique_anchor(base: str) -> str:
        a = base
        i = 2
        while a in taken:
            a = f"{base}-{i}"
            i += 1
        taken.add(a)
        return a

    def emit_heading(title: str, level: int) -> None:
        nonlocal first_heading_done
        if not title:
            return
        if not first_heading_done:
            first_heading_done = True
            return
        anchor = unique_anchor(f"h-{slugify(title)[:50] or 'sec'}")
        blocks.append({"kind": "heading", "level": level, "anchor": anchor, "title": title})
        toc.append({"level": level, "anchor": anchor, "title": title})

    def flush() -> None:
        nonlocal cur_n, cur_title, cur_bodies, cur_refs
        if cur_n is None:
            return
        anchor = f"p{cur_n}"
        html_parts = [f"<p>{b}</p>" for b in cur_bodies if b.strip()]
        block: dict = {
            "kind": "paragraph",
            "n": cur_n,
            "anchor": anchor,
            "html": "\n".join(html_parts),
            "footnoteRefs": cur_refs,
        }
        if cur_title:
            block["title"] = cur_title
            toc.append({"level": 5, "anchor": anchor, "title": cur_title, "n": cur_n})
        blocks.append(block)
        cur_n = None
        cur_title = None
        cur_bodies = []
        cur_refs = []

    for attrs, body in paras:
        body_s = body.strip()
        if not body_s:
            continue
        pt = plain(body_s)
        if not pt or pt == "\xa0":
            continue

        al = attrs.lower()
        is_center = 'align="center"' in al or "align='center'" in al

        # ── Center-aligned: heading or doc title ─────────────────────────
        if is_center:
            flush()
            emit_heading(pt, level_from_title(pt))
            continue

        # ── Left-aligned ─────────────────────────────────────────────────

        # Normalise all markup variants so the two patterns below can match:
        #  · <i><b>…</b></i>  →  <b><i>…</i></b>
        #  · </i> </b>        →  </i></b>          (trailing space between closing tags)
        #  · <b><i> N.        →  <b><i>N.          (leading space before number)
        #  · <a name="N.">N.</a>  inside <b><i>   →  bare number
        body_n = re.sub(r"<i><b>", "<b><i>", body_s)
        body_n = re.sub(r"</b></i>", "</i></b>", body_n)
        body_n = re.sub(r"</i>\s+</b>", "</i></b>", body_n)
        body_n = re.sub(r"(<b><i>)\s*<a[^>]*>(\d+\.)</a>\s*", r"\1\2 ", body_n)
        # Leading space inside the bold-italic opening: <b><i> 11. → <b><i>11.
        body_n = re.sub(r"(<b><i>)\s+(\d+\.)", r"\1\2", body_n)

        # Pattern A: ONLY <b><i>N. Title text</i></b>  → title-only line
        m_title = re.match(r"^\s*<b><i>(\d+)\.\s+(.*?)\s*</i></b>\s*$", body_n, re.DOTALL)
        if m_title:
            flush()
            cur_n = int(m_title.group(1))
            cur_title = plain(m_title.group(2))
            continue

        # Pattern B: <b><i>N.</i></b> content...  → inline numbered para
        # Also matches <b><i>N.  </i></b>content after anchor normalisation
        m_inline = re.match(r"^\s*<b><i>(\d+)\.\s*</i></b>\s*(.*)", body_n, re.DOTALL)
        if m_inline:
            flush()
            cur_n = int(m_inline.group(1))
            cur_title = None
            rest = m_inline.group(2).strip()
            cleaned, refs = strip_fn_refs(rest)
            cleaned = re.sub(r"\s+", " ", cleaned.replace("\xa0", " ")).strip()
            if cleaned:
                cur_bodies.append(cleaned)
                cur_refs.extend(refs)
            continue

        # Pattern C: plain "N. text..." (no markup around number)
        m_plain = re.match(r"^\s*(\d+)\.\s+(.*)", body_s, re.DOTALL)
        if m_plain and cur_n is not None and int(m_plain.group(1)) == cur_n + 1:
            # Only accept plain-number form when it's strictly sequential
            flush()
            cur_n = int(m_plain.group(1))
            cur_title = None
            rest = m_plain.group(2).strip()
            cleaned, refs = strip_fn_refs(rest)
            cleaned = re.sub(r"\s+", " ", cleaned.replace("\xa0", " ")).strip()
            if cleaned:
                cur_bodies.append(cleaned)
                cur_refs.extend(refs)
            continue

        # Continuation paragraph
        if cur_n is not None:
            cleaned, refs = strip_fn_refs(body_s)
            cleaned = re.sub(r"\s+", " ", cleaned.replace("\xa0", " ")).strip()
            if cleaned:
                cur_bodies.append(cleaned)
                cur_refs.extend(refs)

    flush()

    total = sum(1 for b in blocks if b["kind"] == "paragraph" and b.get("n", 0) > 0)

    doc = {
        "slug":     meta["slug"],
        "abbr":     meta["abbr"],
        "kind":     meta["kind"],
        "date":     meta["date"],
        "title":    meta["title"],
        "subtitle": meta["subtitle"],
        "blocks":   blocks,
        "toc":      toc,
        "footnotes": [],
    }
    return doc, total


# ── Main ─────────────────────────────────────────────────────────────────────
def main() -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    results: list[tuple[str, int]] = []

    for meta in DOCS:
        slug = meta["slug"]
        print(f"  Fetching {meta['title']}...")
        decoded = fetch(meta["url"])
        doc, total = parse_doc(decoded, meta)

        out_path = DOCS_DIR / f"{slug}.json"
        out_path.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
        print(f"  ✓  {slug}.json  ({total} paragraphs, {len(doc['blocks'])} blocks)")
        results.append((slug, total))

    # ── Update structure.json ─────────────────────────────────────────────
    structure = json.loads(STRUCT_PATH.read_text(encoding="utf-8"))
    slug_to_total = dict(results)
    for doc_ref in structure["docs"]:
        if doc_ref["slug"] in slug_to_total:
            doc_ref["present"] = True
            doc_ref["totalParagraphs"] = slug_to_total[doc_ref["slug"]]
    STRUCT_PATH.write_text(
        json.dumps(structure, ensure_ascii=False), encoding="utf-8"
    )
    print(f"\nUpdated structure.json — {len(results)} docs now present.")


if __name__ == "__main__":
    main()
