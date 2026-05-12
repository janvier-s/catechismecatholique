#!/usr/bin/env python3
"""
prieres.txt → flow.json

State machine: walk lines top to bottom maintaining "current prayer"
state. Lines fall into one of:
  - SECTION  (top-level heading: "I. PRIÈRES À DIEU", "II. ...")
  - SUB      (sub-heading: "AVANT LA CONFESSION", "APRÈS LA COMMUNION")
  - DIVIDER  ("--" — separates Latin from French within one prayer)
  - TITLE    (a prayer title — short, Title-Case, no terminal punctuation)
  - BODY     (everything else)

Bilingual handling: when a `--` divider appears inside the current prayer,
everything before it is the Latin block, everything after is the French
block. Single-block prayers default to French-only.

Detection: TITLE is the trickiest. A line is a title iff:
  - it's the first non-blank line after a blank gap
  - length <= 70
  - starts with an uppercase letter
  - contains lowercase letters (rules out ALL CAPS sub-headings)
  - doesn't end in '.', '!', '?', ';' (unless trailing parenthetical like '(Ps 129)')
  - doesn't start with bullet markers or V./R.
"""
import json, re, unicodedata
from pathlib import Path

SRC = Path('scripts/data-sources/prieres/source.txt')
OUT = Path('static/data/prieres/flow.json')


def slugify(s: str) -> str:
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[''`]", '', s.lower())
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:50]


def is_section(t: str) -> bool:
    """Roman-numbered top-level heading (`I. PRIÈRES À DIEU`). Distinguish
    from versicle/response lines (`V. Angelus…`) by requiring the rest of
    the line to be ALL CAPS — section headings shout, liturgical
    versicles do not."""
    m = re.match(r'^([IVX]+)\.\s+(.+)$', t)
    if not m:
        return False
    body = m.group(2)
    return body == body.upper() and len(body) > 3


def is_sub(t: str) -> bool:
    if not (3 <= len(t) <= 50):
        return False
    if not t == t.upper():
        return False
    if re.match(r'^[IVX]+\.', t):
        return False
    if re.match(r'^[VR]\.', t):
        return False
    return bool(re.search(r'[A-ZÉÈÔ]{2}', t))


def is_title(t: str, prev_blank: bool) -> bool:
    if not prev_blank:
        return False
    if len(t) > 70:
        return False
    if not t[:1].isupper():
        return False
    if not re.search(r'[a-zéèôïùàâû]', t):
        return False
    if t.startswith(('•', '-', 'V.', 'R.', 'P.', 'D.')):
        return False
    if is_section(t) or is_sub(t):
        return False
    # tolerate trailing parens
    clean = re.sub(r'\s*\([^)]*\)$', '', t).rstrip()
    if clean.endswith(('.', '!', '?', ';')):
        return False
    return True


def looks_latin(text: str) -> bool:
    lo = text.lower()
    latin_hits = sum(
        lo.count(t)
        for t in (
            'dómine ', 'christe', 'sancta', 'sancte', 'maría', 'génetrix',
            'iesu', 'oratión', 'tibi', 'nobis', 'peccát', 'ámen', 'gloriósa',
            'sit nomen', 'magnifi', 'spíritu', 'pater de cælis', 'cæli'
        )
    )
    diac = sum(1 for c in text if c in 'áíóúýǽÆǢ')
    # Heuristic: more than 3 Latin tokens OR many liturgical-Latin diacritics
    return latin_hits >= 3 or diac >= 6


class Builder:
    def __init__(self) -> None:
        self.flow: list[dict] = []
        self.title: str | None = None
        self.latin: list[str] = []
        self.french: list[str] = []
        self.in_latin = True  # collected lines go here until a `--` flips us

    def flush(self) -> None:
        """Close out the current prayer."""
        if not (self.title or self.latin or self.french):
            return
        latin_text = '\n\n'.join(s.strip() for s in self._regroup(self.latin) if s.strip())
        french_text = '\n\n'.join(s.strip() for s in self._regroup(self.french) if s.strip())
        # Decide whether to label the leading block as Latin or French.
        if latin_text and not french_text:
            # Single block — auto-detect.
            if looks_latin(latin_text):
                la, fr = latin_text, ''
            else:
                la, fr = '', latin_text
        else:
            la, fr = latin_text, french_text
        title = self.title or ''
        # Sanitise stray glyphs
        if title:
            title = re.sub(r'\s+', ' ', title).strip()
        if fr or la or title:
            self.flow.append(
                {
                    'kind': 'prayer',
                    'fr': {'title': title if fr else '', 'body': fr},
                    'la': {'title': title if (la and not fr) else '', 'body': la},
                }
            )
        self.title = None
        self.latin = []
        self.french = []
        self.in_latin = True

    @staticmethod
    def _regroup(lines: list[str]) -> list[str]:
        """Re-pack a flat list of lines (some blank) back into paragraph-
        separated stanzas. Consecutive non-blank lines join with a newline
        so the renderer can <br>-break them; blank lines separate stanzas."""
        out: list[str] = []
        cur: list[str] = []
        for ln in lines:
            if ln.strip() == '':
                if cur:
                    out.append('\n'.join(cur))
                    cur = []
            else:
                cur.append(ln)
        if cur:
            out.append('\n'.join(cur))
        return out

    def add_body(self, line: str) -> None:
        bucket = self.latin if self.in_latin else self.french
        bucket.append(line)

    def divider(self) -> None:
        """`--` flips from Latin collection to French collection."""
        self.in_latin = False

    def section(self, title: str) -> None:
        self.flush()
        self.flow.append({'kind': 'heading', 'level': 2, 'id': slugify(title), 'title': title})

    def sub(self, title: str) -> None:
        self.flush()
        # Convert ALL CAPS to title case for display
        display = title[:1] + title[1:].lower()
        self.flow.append({'kind': 'heading', 'level': 3, 'id': slugify(title), 'title': display})

    def title_start(self, title: str) -> None:
        self.flush()
        self.title = title


def main() -> None:
    text = SRC.read_text(encoding='utf-8').replace('\r\n', '\n').replace('\r', '\n')
    lines = text.split('\n')
    b = Builder()
    prev_blank = True
    for raw in lines:
        line = raw.rstrip()
        t = line.strip()
        if t == '':
            # Inside a prayer body, blank lines separate stanzas.
            if b.title or b.latin or b.french:
                b.add_body('')
            prev_blank = True
            continue
        if t == '--':
            b.divider()
            prev_blank = False
            continue
        if is_section(t):
            b.section(t)
            prev_blank = False
            continue
        if is_sub(t):
            b.sub(t)
            prev_blank = False
            continue
        if is_title(t, prev_blank):
            b.title_start(t)
            prev_blank = False
            continue
        # Body line
        b.add_body(line)
        prev_blank = False
    b.flush()

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(b.flow, ensure_ascii=False, indent=2), encoding='utf-8')
    counts: dict[str, int] = {}
    for n in b.flow:
        counts[n['kind']] = counts.get(n['kind'], 0) + 1
    print(f'wrote {OUT} ({len(b.flow)} nodes, {counts})')


if __name__ == '__main__':
    main()
