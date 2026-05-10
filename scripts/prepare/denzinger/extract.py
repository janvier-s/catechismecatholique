#!/usr/bin/env python3
"""
Extract `Denzinger, Enchiridion Symbolorum` (édition française, 37e édition,
JesusMarie / Ictus 3) from catho.org. The HTML structure is far more
extractable than the JesusMarie PDF: clean anchors per entry, explicit pope
blocks, document headings as `<h2>` / `<center><b>…</b></center>`.

Strategy:

1. Fetch the TOC page (`9.php?d=g0`) into a local cache, discover every
   body page referenced (`bvx`, `bvy`, …, `bxi`). Cache each body page too.
2. Walk the TOC and stream each `<a name=...>` block, classifying it as
   one of: PART header, SECTION header, document line, pope/period line,
   or entry row. This gives us the structural hierarchy (parts → sections
   → documents → pope blocks) AND the per-entry titles in document order.
3. Walk each body page and split it on `<a name=anchor>` markers to
   recover the body HTML for each entry.
4. Combine: emit per-entry JSON
       { n, title, html, part_slug, section, document, pope }
   plus a structure.json with the part hierarchy and the index.

Cache lives under scripts/data-sources/denzinger/cache/. Re-runs are
offline.

Server etiquette: 1.5-second sleep between requests on first fetch; 1
parallelism. Total ~25 small HTML pages.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any, Iterator

from bs4 import BeautifulSoup, NavigableString, Tag

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent
CACHE_DIR = ROOT / "scripts/data-sources/denzinger/cache"
OUT_DIR = ROOT / "static/data/denzinger"
OUT_ENTRIES = OUT_DIR / "entries"

BASE_URL = "http://catho.org/9.php?d="
TOC_KEY = "g0"
USER_AGENT = (
    "catechismecatholique.fr/denzinger-import (one-time, contact: "
    "janvier.sabates@gmail.com)"
)


# ─── Fetch + cache ──────────────────────────────────────────────────────────


def fetch_cached(key: str) -> str:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cached = CACHE_DIR / f"{key}.html"
    if cached.exists():
        return cached.read_bytes().decode("iso-8859-1")
    url = BASE_URL + key
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    cached.write_bytes(raw)
    time.sleep(1.5)  # be polite
    return raw.decode("iso-8859-1")


def fetch_toc() -> BeautifulSoup:
    html = fetch_cached(TOC_KEY)
    return BeautifulSoup(html, "html.parser")


def fetch_body_page(key: str) -> BeautifulSoup:
    html = fetch_cached(key)
    return BeautifulSoup(html, "html.parser")


# ─── TOC walker ─────────────────────────────────────────────────────────────


PART_TITLES = {
    "PREMIERE PARTIE": "Première partie",
    "DEUXIEME PARTIE": "Deuxième partie",
    "TROISIEME PARTIE": "Troisième partie",
}
PART_SLUGS = {
    "PREMIERE PARTIE": "1-symboles-de-foi",
    "DEUXIEME PARTIE": "2-magistere-de-leglise",
    "TROISIEME PARTIE": "3-tables",
}


def normalize_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def parse_toc(soup: BeautifulSoup) -> tuple[
    list[dict[str, Any]],  # entries: {n, title, page, anchor, pope, document, section, part_slug, part_title}
    list[dict[str, Any]],  # structure_parts: {slug, title, range, count}
    list[dict[str, Any]],  # structure_sections: {slug, title, part_slug, range}
]:
    """Walk the TOC table row-by-row and emit one record per entry plus a
    structural summary by part and section."""
    entries: list[dict[str, Any]] = []

    # Track running context
    current_part_slug: str | None = None
    current_part_title: str | None = None
    current_section_slug: str | None = None
    current_section_title: str | None = None
    current_document: str | None = None
    current_pope: str | None = None

    section_counter = 0

    def slugify(s: str) -> str:
        s = re.sub(r"[^a-z0-9 ]", "", s.lower())
        s = re.sub(r"\s+", "-", s.strip())
        return s[:60] or "section"

    def update_context_from_chunks(chunks: list[tuple[str, str]]) -> None:
        nonlocal current_part_slug, current_part_title
        nonlocal current_section_slug, current_section_title
        nonlocal current_document, current_pope, section_counter
        for kind, val in chunks:
            if kind == "text":
                current_document = val
            elif kind == "pope":
                current_pope = val
            elif kind == "section":
                if val in PART_TITLES:
                    current_part_slug = PART_SLUGS[val]
                    current_part_title = PART_TITLES[val]
                    current_section_slug = None
                    current_section_title = None
                else:
                    section_counter += 1
                    current_section_slug = f"sec-{section_counter}-{slugify(val)}"
                    current_section_title = val

    def chunks_from_td(td: Tag) -> list[tuple[str, str]]:
        """Walk a TD recursively and emit (kind, value) chunks: text /
        pope / section. The TOC HTML is malformed — `<a name=…>` tags are
        opened but never closed, so BeautifulSoup wraps the next <center>
        inside the unclosed <a>. We can't trust child structure; instead
        we walk descendants in order and treat each <center> as a heading
        regardless of nesting depth."""
        chunks: list[tuple[str, str]] = []
        buf: list[str] = []

        def flush_buf() -> None:
            text = normalize_ws(" ".join(buf))
            if text:
                chunks.append(("text", text))
            buf.clear()

        def classify_heading(inner: str) -> tuple[str, str]:
            # Pope blocks have the shape "NAME : DATE/YEAR …" where the
            # name is mixed-case (e.g. "CLEMENT 1er DE ROME") and the date
            # contains digits. Match by structure: a colon present, AND
            # something digit-y after it.
            if ":" in inner:
                left, right = inner.split(":", 1)
                if re.search(r"\d", right) and len(left.strip()) >= 2:
                    return ("pope", inner)
            return ("section", inner)

        # Walk in document order, but skip into <center> tags atomically
        # (collect their text and emit a heading chunk).
        skip_until: Tag | None = None

        def emit_heading(inner: str) -> None:
            # Headings in the source often wrap onto a second <center>
            # ("PAUL III: 13 octobre" / "1534-10 novembre 1549" or "II.
            # Schéma bipartite" / "trinitaire-christologique."). Merge a
            # continuation that starts with a lowercase letter or a digit
            # into the previous heading instead of emitting a new one.
            if chunks:
                last_kind, last_val = chunks[-1]
                if last_kind in ("section", "pope") and re.match(
                    r"^[a-z0-9\-]", inner
                ):
                    chunks[-1] = (last_kind, f"{last_val} {inner}")
                    # Re-classify: if the merged result now has a colon +
                    # date, upgrade section→pope.
                    merged = chunks[-1][1]
                    new_kind = classify_heading(merged)[0]
                    chunks[-1] = (new_kind, merged)
                    return
            chunks.append(classify_heading(inner))

        for el in td.descendants:
            if skip_until is not None:
                # Wait until we exit the current <center> subtree.
                # BS doesn't make this easy without checking ancestors —
                # easier path: skip elements whose ancestor list includes
                # the skip target.
                if el is skip_until or skip_until in getattr(el, "parents", []):
                    continue
                skip_until = None
            if isinstance(el, NavigableString):
                # Skip strings inside a <center> (handled by its parent).
                if any(p.name == "center" for p in el.parents):
                    continue
                buf.append(str(el))
                continue
            if isinstance(el, Tag):
                if el.name == "br":
                    flush_buf()
                    continue
                if el.name == "center":
                    flush_buf()
                    inner = normalize_ws(el.get_text())
                    if inner:
                        emit_heading(inner)
                    skip_until = el
                    continue
                # Other tags (a, b, i, …) — let descendants iteration
                # surface their text children separately.
                continue
        flush_buf()
        return chunks

    # Filter to leaf TRs only (skip wrapper TRs whose TD contains a nested
    # <table>) — otherwise the outer wrapper TR is treated as if it owned
    # entry 1 with all part headings concatenated as its post-chunks.
    leaf_trs = [tr for tr in soup.select("tr") if not tr.select_one("table")]
    for tr in leaf_trs:
        link = tr.select_one("td:first-child a[href*='#']")
        if not link:
            # Heading-only row — second TD carries part / section headings.
            tds = tr.select("td")
            if len(tds) >= 2:
                update_context_from_chunks(chunks_from_td(tds[1]))
            continue

        # Parse the entry number.
        href = link.get("href", "")
        m = re.match(r"9\.php\?d=([^#]+)#(.+)", href)
        if not m:
            continue
        page_key = m.group(1)
        anchor = m.group(2)
        try:
            n = int(link.get_text(strip=True))
        except ValueError:
            continue

        body_td = tr.select("td")[1] if len(tr.select("td")) > 1 else None
        if body_td is None:
            continue

        chunks = chunks_from_td(body_td)
        # Title = the LEADING text chunk(s) — i.e. text that appears
        # BEFORE any section/pope chunk in the TD. Text chunks that come
        # AFTER a heading are document context for the NEXT entry, not
        # this one's title. (E.g. entry 76's row contains the Part 2
        # transition headings + pope blocks + "Lettre aux Corinthiens";
        # the latter is the document for entry 101, not 76's title.)
        first_text = ""
        post_chunks: list[tuple[str, str]] = []
        seen_heading = False
        for kind, val in chunks:
            if not seen_heading and kind == "text" and not first_text:
                first_text = val
                continue
            if kind in ("section", "pope"):
                seen_heading = True
            post_chunks.append((kind, val))

        entries.append(
            {
                "n": n,
                "title": first_text,
                "page": page_key,
                "anchor": anchor,
                "part_slug": current_part_slug,
                "part_title": current_part_title,
                "section_slug": current_section_slug,
                "section_title": current_section_title,
                "document": current_document,
                "pope": current_pope,
            }
        )

        update_context_from_chunks(post_chunks)

    # Build summary by part/section.
    parts_struct: list[dict[str, Any]] = []
    by_part: dict[str, list[int]] = {}
    for e in entries:
        if e["part_slug"]:
            by_part.setdefault(e["part_slug"], []).append(e["n"])
    for slug in ["1-symboles-de-foi", "2-magistere-de-leglise", "3-tables"]:
        ns = by_part.get(slug, [])
        if not ns:
            continue
        title = next((e["part_title"] for e in entries if e["part_slug"] == slug), slug)
        parts_struct.append(
            {
                "slug": slug,
                "title": title,
                "range": [ns[0], ns[-1]],
                "count": len(ns),
            }
        )

    sections_struct: list[dict[str, Any]] = []
    seen_sections: set[str] = set()
    for e in entries:
        if not e["section_slug"] or e["section_slug"] in seen_sections:
            continue
        seen_sections.add(e["section_slug"])
        ns_in_sec = [x["n"] for x in entries if x["section_slug"] == e["section_slug"]]
        sections_struct.append(
            {
                "slug": e["section_slug"],
                "title": e["section_title"],
                "part_slug": e["part_slug"],
                "range": [ns_in_sec[0], ns_in_sec[-1]],
                "count": len(ns_in_sec),
            }
        )

    return entries, parts_struct, sections_struct


# ─── Body-page walker ───────────────────────────────────────────────────────


def clean_body_segment(html: str) -> str:
    """Tidy an entry's raw segment into clean paragraph HTML."""
    # Truncate at the page footer / navigation block. The catho.org body
    # pages all end with the same footer markers.
    cut_re = re.compile(
        r"<a\s+name\s*=\s*\"?vers\"?|<table[^>]*bgcolor=#3366cc",
        flags=re.IGNORECASE,
    )
    m = cut_re.search(html)
    if m:
        html = html[: m.start()]
    # Drop the per-paragraph icon/decoration links (LA.gif / c.gif) that
    # link to the Latin counterpart and the cross-ref index.
    html = re.sub(r"<a [^>]*><img [^>]*></a>", "", html, flags=re.IGNORECASE)
    # Strip catho.org internal cross-reference anchors — they'd 404
    # against our routing. Keep the link text inline.
    html = re.sub(
        r"<a\s+href=[^>]*9\.php[^>]*>([^<]*)</a>",
        r"\1",
        html,
        flags=re.IGNORECASE,
    )
    # Strip any remaining stray <a href=...> opening/closing pairs.
    html = re.sub(r"<a\s+href=[^>]*>", "", html, flags=re.IGNORECASE)
    html = re.sub(r"</a>", "", html, flags=re.IGNORECASE)
    # Convert blocks of 2+ <br> into paragraph breaks. Single <br> stays.
    html = re.sub(r"(?:\s*<br\s*/?>\s*){2,}", "</p><p>", html, flags=re.IGNORECASE)
    # Drop centered headings that crept in (rare).
    html = re.sub(r"<center>.*?</center>", "", html, flags=re.IGNORECASE | re.DOTALL)
    # Wrap in <p>; collapse whitespace.
    html = "<p>" + html + "</p>"
    html = re.sub(r"<p>\s*</p>", "", html)
    html = re.sub(r"\s+", " ", html).strip()
    # Strip stray remaining inline anchors.
    html = re.sub(r"<a\s+(?:name|Name)\s*=\s*\"?[^\">]+\"?\s*>", "", html)
    return html


def parse_body_page_html(html: str) -> dict[str, dict[str, Any]]:
    """Return {anchor → {n, html}} for one body page.

    Strategy: split the raw HTML on `<a name=ANCHOR>` markers. For each
    segment, recognise an entry marker if the leading inline content is
    `<b>NUM</b><br>`; otherwise the anchor is a section/heading anchor
    with no entry attached and we skip it.
    """
    m = re.search(r"<body[^>]*>(.*)</body>", html, flags=re.DOTALL | re.IGNORECASE)
    body_html = m.group(1) if m else html

    anchor_re = re.compile(
        r'<a\s+(?:name|Name)\s*=\s*"?([A-Za-z0-9_]+)"?\s*>',
        flags=re.IGNORECASE,
    )
    pieces = anchor_re.split(body_html)
    out: dict[str, dict[str, Any]] = {}
    i = 1
    while i < len(pieces):
        anchor = pieces[i]
        content = pieces[i + 1] if i + 1 < len(pieces) else ""
        i += 2
        m_num = re.match(
            r"^\s*<b>\s*(\d+)\s*</b>\s*(?:<br\s*/?>\s*)+",
            content,
            flags=re.IGNORECASE,
        )
        if not m_num:
            continue
        n = int(m_num.group(1))
        body = content[m_num.end() :]
        out[anchor] = {"n": n, "html": clean_body_segment(body)}
    return out


def parse_body_page(soup: BeautifulSoup) -> dict[str, str]:
    """[Legacy stub kept for backward compat — unused.]"""
    body = soup.body
    if body is None:
        return {}

    # Walk all descendants in document order, splitting on <a Name=…>.
    out: dict[str, str] = {}
    current_anchor: str | None = None
    current_chunks: list[str] = []

    def flush() -> None:
        if current_anchor is None:
            return
        # Body content may include the leading "<b>NUM</b><br>" that we want
        # to drop (the page renders the entry number visually before the
        # body — we already have it in the index).
        html = "".join(current_chunks).strip()
        # Strip leading <b>NUM</b><br>
        html = re.sub(r"^\s*<b>\s*\d+\s*</b>\s*(<br\s*/?>\s*)+", "", html)
        # Strip trailing footnote-link decorations <a href=…><img …></a>
        html = re.sub(
            r"<a [^>]*><img [^>]*></a>",
            "",
            html,
        )
        # Convert sequences of <br> into paragraph breaks.
        # Two-or-more <br> → end-paragraph + new-paragraph.
        html = re.sub(r"(?:\s*<br\s*/?>\s*){2,}", "</p><p>", html, flags=re.IGNORECASE)
        # Single <br> stays as-is (line breaks within a stanza).
        # Wrap whole thing in <p>.
        html = "<p>" + html + "</p>"
        # Tidy up empty paragraphs.
        html = re.sub(r"<p>\s*</p>", "", html)
        # Collapse internal whitespace runs.
        html = re.sub(r"\s+", " ", html)
        out[current_anchor] = html.strip()

    # We need to walk children at body level but consider deeply-nested
    # content — anchor markers appear at multiple depths. Use recursive
    # traversal preserving order.
    def walk(node: Tag) -> Iterator:
        for child in node.children:
            yield child

    # Flatten into a stream of (kind, payload) events. We iterate the body
    # and split on `<a name="...">` markers.
    for el in body.descendants:
        if isinstance(el, Tag) and el.name == "a" and (el.get("name") or el.get("Name")):
            name = el.get("name") or el.get("Name")
            flush()
            current_anchor = name
            current_chunks = []
            continue
        # Drop the entire <a href=...><img.../></a> footer/icon decorations.
        if (
            isinstance(el, Tag)
            and el.name == "a"
            and el.get("href")
            and not el.get("name")
            and not el.get("Name")
        ):
            # Skip — usually nav/icon links.
            continue
        if isinstance(el, NavigableString):
            if current_anchor is None:
                continue
            current_chunks.append(str(el))
            continue
        if isinstance(el, Tag):
            if current_anchor is None:
                continue
            # Keep only inline-style tags (br, b, i, em, strong, sup, span,
            # center). For container tags (table, td, tr, html, head, body)
            # we rely on the .descendants iteration to surface their text
            # children separately.
            if el.name in ("br", "b", "i", "em", "strong", "sup"):
                # Emit the tag itself as a marker so we preserve it in
                # output.
                if el.name == "br":
                    current_chunks.append("<br>")
                # For other inline tags, descendants walk also yields their
                # text children — to avoid duplication, we don't emit the
                # opening/closing tags here; we just rely on the text nodes.
                continue
            if el.name == "center":
                # A centered heading inside an entry's body is rare; drop.
                continue
    flush()
    return out


# ─── Driver ─────────────────────────────────────────────────────────────────


def html_clean(html: str) -> str:
    """Light cleanup applied to entry bodies before saving."""
    # Remove common navigational debris.
    html = re.sub(r"<a[^>]*\bname=\"?vers\"?[^>]*>\s*", "", html, flags=re.IGNORECASE)
    html = re.sub(r"<table[^>]*>.*?</table>", "", html, flags=re.IGNORECASE | re.DOTALL)
    # Trim multiple paragraph-breaks.
    html = re.sub(r"(<p>\s*</p>)+", "", html)
    return html.strip()


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_ENTRIES.mkdir(parents=True, exist_ok=True)

    print("fetching TOC…")
    toc_soup = fetch_toc()
    entries, parts_struct, sections_struct = parse_toc(toc_soup)
    print(f"  {len(entries)} entries, {len(parts_struct)} parts, {len(sections_struct)} sections")

    pages_needed = sorted({e["page"] for e in entries})
    print(f"fetching {len(pages_needed)} body pages…")
    for k in pages_needed:
        was_cached = (CACHE_DIR / f"{k}.html").exists()
        fetch_cached(k)
        if not was_cached:
            print(f"  {k} (fetched)")

    # Discover ALL body pages by walking the alphabetical sequence used by
    # catho.org. We fetched the ones the TOC mentions, but body pages may
    # also exist for entries not surfaced in the TOC (sub-numbered passages
    # within a long document). Probe forward until we get a 404 / empty.
    print("probing for additional body pages…")
    extra_pages: list[str] = []
    last_page = pages_needed[-1] if pages_needed else "bvx"

    def next_page_key(k: str) -> str | None:
        # The catho.org keys roll bv* → bw* → bx*; within each cluster the
        # last char goes a..z then 0..9. Build the next key.
        prefix = k[:-1]
        last = k[-1]
        order = "abcdefghijklmnopqrstuvwxyz0123456789"
        if last in order:
            idx = order.index(last)
            if idx + 1 < len(order):
                return prefix + order[idx + 1]
            # Roll over: bv9 → bwa, bw9 → bxa, bx9 → bya etc.
            if len(prefix) >= 2:
                next_prefix = prefix[:-1] + chr(ord(prefix[-1]) + 1)
                return next_prefix + order[0]
        return None

    cur = next_page_key(last_page)
    while cur and cur < "bya":
        try:
            html = fetch_cached(cur)
        except Exception:
            break
        if "<a name=" not in html.lower():
            break
        extra_pages.append(cur)
        nxt = next_page_key(cur)
        if not nxt:
            break
        cur = nxt
    if extra_pages:
        print(f"  extra pages: {extra_pages}")

    all_pages = pages_needed + extra_pages

    print("parsing body pages…")
    # Parse each body page; result is {(page, anchor) → {n, html}}.
    bodies: dict[tuple[str, str], dict[str, Any]] = {}
    by_n: dict[int, dict[str, Any]] = {}
    for k in all_pages:
        html = (CACHE_DIR / f"{k}.html").read_bytes().decode("iso-8859-1")
        page_entries = parse_body_page_html(html)
        for anchor, info in page_entries.items():
            bodies[(k, anchor)] = info
            n = info["n"]
            if n not in by_n:
                by_n[n] = {"n": n, "html": info["html"], "page": k, "anchor": anchor}
    print(f"  parsed {len(bodies)} body anchors, {len(by_n)} unique entry numbers")

    # Merge: combine body-discovered entries with TOC metadata. For entries
    # in the TOC, use the TOC title + context. For entries only in the body
    # pages, inherit context from the previous entry that DID have it.
    toc_by_n = {e["n"]: e for e in entries}
    sorted_ns = sorted(by_n.keys())

    print("writing per-entry JSON…")
    inherited_part_slug: str | None = None
    inherited_part_title: str | None = None
    inherited_section_slug: str | None = None
    inherited_section_title: str | None = None
    inherited_document: str | None = None
    inherited_pope: str | None = None
    written = 0
    for n in sorted_ns:
        body_info = by_n[n]
        meta = toc_by_n.get(n)
        if meta:
            if meta["part_slug"]:
                inherited_part_slug = meta["part_slug"]
                inherited_part_title = meta["part_title"]
            if meta["section_slug"]:
                inherited_section_slug = meta["section_slug"]
                inherited_section_title = meta["section_title"]
            if meta["document"]:
                inherited_document = meta["document"]
            if meta["pope"]:
                inherited_pope = meta["pope"]
            title = meta["title"]
        else:
            title = ""

        record = {
            "n": n,
            "title": title,
            "html": body_info["html"],
            "part_slug": inherited_part_slug,
            "part_title": inherited_part_title,
            "section_slug": inherited_section_slug,
            "section_title": inherited_section_title,
            "document": inherited_document,
            "pope": inherited_pope,
        }
        with open(OUT_ENTRIES / f"{n}.json", "w", encoding="utf-8") as fh:
            json.dump(record, fh, ensure_ascii=False, indent=2)
        written += 1

    # Rebuild parts_struct using the actual emitted entry numbers (which
    # include body-only entries inheriting from the previous TOC context).
    final_by_part: dict[str, list[int]] = {}
    for n in sorted_ns:
        meta = toc_by_n.get(n)
        # Resolve the part from the merged record we just wrote.
        path = OUT_ENTRIES / f"{n}.json"
        with open(path, "r", encoding="utf-8") as fh:
            r = json.load(fh)
        if r.get("part_slug"):
            final_by_part.setdefault(r["part_slug"], []).append(n)
    final_parts_struct: list[dict[str, Any]] = []
    for slug in ["1-symboles-de-foi", "2-magistere-de-leglise", "3-tables"]:
        ns = final_by_part.get(slug, [])
        if not ns:
            continue
        title = next((p["title"] for p in parts_struct if p["slug"] == slug), slug)
        final_parts_struct.append(
            {
                "slug": slug,
                "title": title,
                "range": [ns[0], ns[-1]],
                "count": len(ns),
            }
        )

    structure = {
        "corpus": "denzinger",
        "title": "Denzinger — Enchiridion Symbolorum",
        "subtitle": "Symboles et définitions de la Foi catholique (37e édition)",
        "parts": final_parts_struct,
        "sections": sections_struct,
        "all_numbers": sorted_ns,
    }
    with open(OUT_DIR / "structure.json", "w", encoding="utf-8") as fh:
        json.dump(structure, fh, ensure_ascii=False, indent=2)
    # Build the slim index from the on-disk records (so it matches what the
    # site will actually load, including inherited context).
    index: dict[str, Any] = {}
    for n in sorted_ns:
        with open(OUT_ENTRIES / f"{n}.json", "r", encoding="utf-8") as fh:
            r = json.load(fh)
        index[str(n)] = {
            "title": r.get("title") or "",
            "part_slug": r.get("part_slug"),
            "section_slug": r.get("section_slug"),
            "document": r.get("document"),
            "pope": r.get("pope"),
        }
    with open(OUT_DIR / "index.json", "w", encoding="utf-8") as fh:
        json.dump(index, fh, ensure_ascii=False, separators=(",", ":"))

    print(f"wrote {written} entries")


if __name__ == "__main__":
    main()
