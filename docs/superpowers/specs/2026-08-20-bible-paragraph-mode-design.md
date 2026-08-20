# Bible reading mode: verse-by-verse vs. paragraph

## Problem

The Bible reader (`/bible/{book}/{chapter}`) renders every verse as its own row, always — even prose narrative and epistles that read naturally as flowing paragraphs. There is no way to read the text as a printed Bible reads: paragraphs for prose, indented stanzas for poetry (Psalms, Job's dialogues, Proverbs, Song of Songs, prophetic poetry, etc.).

The source XML that already generates every NCL verse on the site (`scripts/data-sources/ncl/francl_usfx.xml`, parsed by `scripts/prepare/ncl.ts`) carries exactly the structural markup needed to do this correctly — paragraph breaks, poetic line levels, stanza breaks, Psalm superscriptions, divine-name markup, translator-added-word markup, and Selah markers — none of which the current parser preserves; it flattens every verse straight to plain text.

## Goals

- A reading-mode toggle: **verse-by-verse** (today's behavior, unchanged) vs. **paragraph** (prose merges into flowing paragraphs; poetry renders as indented, stanza-broken lines).
- Typographic polish applied to verse text in **both** modes: small-caps divine name (Yahweh), italicized translator-added words, styled Selah markers, and recovered Psalm/Canticle superscriptions (currently silently dropped by the parser).
- No risk to any existing consumer of NCL verse text (search index, concordance, compare view, today's reader).

## Non-goals (deferred to v2)

- `\qt` (embedded OT-in-NT / cross-quoted text)
- `\sc` (small caps inside section-outline headings — cosmetic, rare)
- `\it` (italics marker — 7 occurrences total, rare)
- Cross-references (`\x`/`\xt`/`\xo`/`\rq`) and alternate/Vulgate verse numbers (`\va`) — both under ~45 occurrences across the whole Bible, low value for the effort.
- Interactive/study-mode features (citation counts, study-panel click-through) in paragraph mode — see "Two modes, two purposes" below.

## Source data

`scripts/data-sources/ncl/francl_usfx.xml` is a symlink into an external `SCRIPTURA` source tree, already checked into the build pipeline (`scripts/prepare-data.ts` reads it at `ncl/francl_usfx.xml` under `SOURCES`). It is the **same source**, not a different translation, that already produces every plain verse string in `static/data/bible/ncl/{usfx}.json` today. Verified present for all 73 books (NT, OT, and deuterocanon) with the needed markers:

| Marker | Count (whole Bible) | Meaning |
|---|---|---|
| `<p style="p">` | 8,731 | prose paragraph break |
| `<q style="q1/q2/q3">` | ~2,518 | poetic line, indent level 1–3 |
| `<b style="b">` | 10 | stanza break (blank line) |
| `<d style="d">` | 85 | Psalm/Canticle superscription |
| `<nd>` | 6,941 | divine name (Yahweh) |
| `<add>` | 569 | translator-added word(s), conventionally italicized |
| `<qs>` | 70 | Selah |

`scripts/prepare/ncl.ts`'s `parseUSFX` currently treats `<d>` as a skip-container (comment: "that verse is dropped") and treats `<nd>`/`<add>`/`<qs>` as transparent — their text already ends up in the plain verse string today, undecorated. Recovering all of this is exact and lossless: it is NCL's own content, not a foreign translation graft. (An earlier version of this investigation mistakenly treated a separately-supplied plain-USFM export of the same "francl" source family as a different translation and recommended dropping `\d`/`\add` on that basis — corrected once the shared XML source was found.)

Confirmed alignment: comparing chapter verse-counts between this source and the site's own `static/data/bible/ncl/*.json`, 1,332 of 1,334 chapters match exactly. The two exceptions (Mark 4, off by one; Tobit 3, a known short/long Greek-recension divergence specific to Tobit) are pre-existing facts about the current NCL data, not something this feature needs to resolve.

## Two modes, two purposes

- **Verse-by-verse = study mode.** Exactly today's behavior: one row per verse, `citedCount` lookups, clickable verses, study-panel click-through for CCC citations. Only change: the verse text itself carries the new inline typographic markup (divine name, added words, Selah).
- **Paragraph = reading mode.** No interactivity. No citation counts, no click handlers, no study-panel wiring. Verse numbers render as small, unobtrusive superscripts for reference only — standard printed-Bible convention — not as buttons. Prose blocks merge into flowing `<p>` text; poetry blocks render as indented, stanza-broken lines. A chapter's superscription (when present) renders above verse 1.

This split removes the fiddliest constraint from an earlier draft of this design (keeping every verse independently clickable inside merged prose) — paragraph mode is markup and CSS only, no interaction logic to carry over.

## Data pipeline

New module `scripts/prepare/ncl-paragraphs.ts`, structurally similar to `ncl.ts` (same tag-walking state machine over the same XML) but preserving structure instead of flattening it. Wired into `scripts/prepare-data.ts` immediately after the existing NCL step, reading the same already-loaded XML string.

**`scripts/prepare/ncl.ts` is not modified.** `static/data/bible/ncl/{usfx}.json` keeps its exact current shape (`Record<chapter, Record<verse, string>>`) — every existing consumer (search indexing, concordance, compare view, today's verse-by-verse reader) is untouched and carries zero risk from this change.

New output: `static/data/bible/ncl-paragraphs/{usfx}.json` (sharded per book, plus a manifest, mirroring the existing `ncl/` directory convention), shaped as:

```ts
type RichVerse = {
  v: number;
  // Plain verse text with a small, fixed set of inline tags:
  // <span class="dn">Yahweh</span>, <em class="add">…</em>,
  // <span class="selah">— Séla.</span>. Rendered via {@html}, never
  // used for search indexing or plain-text contexts.
  html: string;
};

type Block =
  | { kind: 'prose'; verses: RichVerse[] }
  | { kind: 'poetry'; level: 1 | 2 | 3; verse: RichVerse; stanzaBreak?: boolean };

type ChapterBlocks = {
  superscription?: string; // \d text, e.g. "Chant de David. À l'occasion de sa fuite devant Absalon, son fils."
  blocks: Block[];
};

type BookParagraphs = Record<string /* chapter number */, ChapterBlocks>;
```

Rationale for a fully self-contained file (duplicating verse text) rather than storing only span offsets into the existing plain-text file: offsets are fragile — any future change to `ncl.ts`'s `normalizeVerseText()` whitespace/punctuation handling would silently desync offsets from the text they're meant to mark, with no error, just wrong highlighting. A self-contained file with its own text costs a few more MB (the whole Bible is small either way) for real robustness.

**Known edge case to handle in the parser:** a single verse can span more than one poetic line without a fresh `\v` between the `\q` markers (mid-verse line break). The extraction logic must treat a `\q`-marker with no intervening `\v` as a continuation line within the current verse's block, not silently dropped. Verified this pattern's general shape against the plain-USFM export during investigation; final confirmation happens against test fixtures during implementation (see Testing).

## Rendering (`BibleReader.svelte`)

- Fetches `ncl-paragraphs/{usfx}.json` for the current chapter alongside existing data.
- **Verse-by-verse mode** (default): today's `<li>`-per-verse structure, unchanged, with `v.text` swapped for the corresponding `RichVerse.html` (rendered via `{@html}`).
- **Paragraph mode**: iterates `ChapterBlocks.blocks`. `prose` blocks render as one `<p>` per block, verses joined with a small leading superscript verse number before each verse's first word. `poetry` blocks render as one line per block (CSS indent by `level`), grouped into stanza `<div>`s that break on `stanzaBreak`. `superscription`, when present, renders as its own styled line above verse 1.
- **Fallback:** if a chapter has no entry in `ncl-paragraphs` (should not happen given 73/73 book coverage, but guards against a partial/stale build), paragraph mode silently falls back to verse-by-verse rendering for that chapter rather than erroring.

## Prefs & toggle

- `ReadingPrefs` (`src/lib/stores/prefs.ts`) gains `bibleLayout: 'verse' | 'paragraph'`, default `'verse'`, persisted the same way as every other reading pref (existing `localStorage` key, existing migration-safe `{...DEFAULTS, ...parsed}` merge).
- `ReadingPrefs.svelte` gains a new pill pair ("Verset par verset" / "Paragraphe"), gated to Bible routes only (`page.url.pathname.startsWith('/bible')`), following the existing `isCecOnly`-style gating pattern already used for CEC-only controls.

## Testing

- **Unit** (`tests/unit/`): new parser tested against known fixtures — Matthew 1's four paragraph breaks (verses 1, 6, 12, 18), Psalm 3's superscription + two Selah markers, a Job chapter with mixed prose (narrator frame) and poetry (dialogue) blocks in the same chapter, a verse confirmed to span two poetic lines (mid-verse line break edge case).
- **E2e** (`tests/e2e/`): toggle switches layout and persists across reload; paragraph mode renders poetry as distinct indented lines with visible stanza gaps; verse-by-verse mode's existing citation/study-panel e2e coverage continues to pass unmodified (regression guard that the new inline `{@html}` text swap didn't break click-through).
