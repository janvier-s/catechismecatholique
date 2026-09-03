# Missing verses in the Néo-Crampon Libre text

Found 2026-09-03 while checking that every scripture reference in the
Catechism resolves to a verse the reader can actually show. Three chapters of
the NCL have interior gaps: verse numbers that are absent between verses that
are present. 18 verses in all, out of 1334 chapters.

The source lives outside this repo (`scripts/data-sources/ncl/francl_usfx.xml`),
so this is a note, not a fix.

## The gaps

| Book | Chapter | Present | Missing |
| --- | --- | --- | --- |
| Matthieu | 11 | 1-6, 16-30 (21 of 30) | **7-15** |
| Matthieu | 24 | 1-35, 37-51 (50 of 51) | **36** |
| Sagesse | 7 | 1-6, 15-30 (22 of 30) | **7-14** |

Matthieu 11:7-15 is the passage on John the Baptist ("Qu'êtes-vous allés voir
au désert ?" through "que celui qui a des oreilles entende"), and Sagesse
7:7-14 is the prayer for wisdom. Both are substantial, contiguous runs · this
looks like two dropped blocks in the conversion rather than scattered loss.
Matthieu 24:36 ("Quant à ce jour et à cette heure, nul ne les connaît") is a
single verse.

## How it shows

Three Catechism references point into the gaps. They are correct as written ·
there is nothing to fix on the Catechism side:

- §443 cites Mt 24:36
- §523 cites Mt 11:13
- §719 cites Mt 11:13-14

They are the only unresolvable references left in the corpus, out of 4012.
`/api/cec/523?include=bible` still returns a URL for them, and the reader
serves the chapter without the verse.

## Detecting a regression

The sweep is a few lines over the generated data · walk
`static/data/cec/paragraphs/*.json`, run each `bible_refs[].text` through
`parseBibleRefText`, and look the verse up in `static/data/bible/ncl/<USFX>.json`.
Anything that comes back missing is either a new gap here or a new bad
reference for `scripts/prepare/bibleRefCorrections.ts`.

## Related

- `scripts/prepare/bibleRefCorrections.ts` · the eight references that were
  genuinely wrong upstream, with the evidence for each.
- `src/lib/utils/bibleRefText.ts` · the parser these checks run through.
