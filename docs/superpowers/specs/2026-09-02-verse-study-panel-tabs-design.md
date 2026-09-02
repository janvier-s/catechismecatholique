# Verse Study Panel · Compendium and Liturgie tabs · Design

## Goal

The study panel currently offers a single tab when the reader clicks a verse in
the Bible reader: `CEC`, listing the Catechism paragraphs that cite the verse.
Add two more, so a verse opens into the same depth of study a Catechism
paragraph already does:

- **Compendium** · the Compendium questions related to the verse.
- **Liturgie** · when the verse is proclaimed at Mass, and when the paragraphs
  citing it are proposed for meditation.

## Context

The panel is driven by `studyPanel` (`src/lib/stores/studyPanel.ts`), whose
`PanelContext` is a discriminated union. Two of its members matter here:

- `{ kind: 'paragraph', paragraph }` · from a Catechism paragraph click. Gets
  the full tab strip, including `TabCompendium` and `TabLiturgie`.
- `{ kind: 'verse', verseUsfx, verseChapter, verseVerse }` · from a Bible verse
  click (`BibleChapter.openVerse`). `StudyPanel.visibleGroups` currently
  hard-codes a single group for it.

`StudyPanel` renders only the active tab (an `{:else if}` chain on
`activeTab`), so tab bodies already load their data lazily. What is *not* lazy
is deciding which tabs to show: a `$effect` pre-loads enough of each index to
know whether a tab has content. That distinction drives the file layout below.

Relevant existing data:

- `static/data/cec/bible-verse-index.json` (76KB) · `usfx → chapter → verse →
  paragraph[]`. Already loaded by the verse tab.
- `static/data/compendium/cited-by.json` · CEC paragraph → Compendium question
  numbers. Already used by `TabCompendium`.
- `static/data/calendrier/cec/{bucket}.json` · the CEC liturgy index, sharded
  by paragraph hundred. Covers Sundays, solemnities, fixed feasts and the
  propre; **not** the ferial cycles.
- `static/data/calendrier/readings/*.json` (809 files) · one per day, carrying
  `lectures[]` with a `ref` string and the full text.

### Spike findings

A throwaway script parsed every reading ref in all 809 day files with
`parseAelfRef` (`scripts/prepare/concordanceRefParser.ts`, written for exactly
these AELF-shaped strings). Results, which the decisions below rest on:

- 2683 refs, 2576 parsed (96%), 66 distinct books.
- The verse→day map alone is 137KB. Largest book: `psaumes` 24KB, then `luc`
  15KB, `matthieu` 13KB, `jean` 11KB.
- All 107 failures are psalm refs that omit the book because the reading's
  `type` already says it (`"79 (80), 2ac.3bc, 15-16a, 18-19"`). Prefixing
  `"Ps "` when the ref starts with a digit and the type is `psaume` or
  `cantique` recovers them.
- Restricted to the day types the CEC index covers (Sundays, solemnities,
  fixed feasts, propre) the map is only 51KB across 220 days. Including
  weekdays takes it to 809 days.

Weekdays are **in scope**. The marginal implementation cost is small (weekday
days are already built in the same `prepareCalendrier` function, from
`weekdayTargets` + `readingsFile`, and the route
`/calendrier-liturgique/feries/[cycle]/[slug]` already exists), but the size
difference decides the file layout, so deferring them would mean rewriting the
generator's output shape and the loader rather than extending them.

## Data

### New generator: `scripts/prepare/verseLiturgyIndex.ts`

Pure function `buildVerseLiturgyIndex(sources: VerseLiturgySource[])`, mirroring
`buildCecLiturgyIndex`'s shape and testability. A source is one day: its
identity, display fields, and its reading refs.

Output is split in two, because visibility and content have different urgency:

```
static/data/calendrier/verse-liturgy/days.json        // the day table
static/data/calendrier/verse-liturgy/{bookSlug}.json  // 66 shards
```

**`{bookSlug}.json`** · `chapter → verse → dayIndex[]`. Nothing else. This is
what the panel fetches to decide whether the Liturgie tab has anything, so it
must stay small: the largest, `psaumes.json`, is ~24KB and most are under 3KB.

**`days.json`** · the indexed day table:

```ts
interface VerseLiturgyDay {
  slug: string;
  title: string;
  season: SeasonKey;
  color: LiturgicalColor;
  kind: 'year' | 'fixed' | 'proper' | 'weekday';
  cycle?: 'a' | 'b' | 'c'; // year days
  weekdayCycle?: 'I' | 'II'; // weekday days
  date?: string; // fixed feasts, e.g. "2 Février"
  monthIndex?: number; // fixed feasts, for ordering
  readingsKey?: string;
  readings: { type: string; ref: string }[];
}
```

Deliberately carries no `clusters`: the verse tab's second section gets its
paragraph programme from the CEC index instead, and omitting clusters is most
of why the shards stay small.

`kind` is new relative to `CecLiturgyOccasion`, which infers the day type from
the presence of `cycle` / `date`. Weekdays break that inference (they have a
cycle that is not a/b/c), so the type is stated rather than derived.

### Generator wiring

In `scripts/prepare/calendrier.ts`, alongside the existing `liturgySources`
block. Sources come from four places, all already in scope at that point:

1. `yearFiles` × their feasts (kind `year`, cycle a/b/c).
2. `fixed` (kind `fixed`).
3. `PROPER_DAYS` (kind `proper`).
4. `weekdayTargets` × cycles I/II (kind `weekday`) · the same list the
   `feries-{i,ii}.json` writer iterates, filtered the same way (`readingsKey`
   present in `readingsFile`).

Refs come from `readingsFile[key].lectures`, the same accessor `refsFor` uses.

### Ref parsing

`parseAelfRef` is reused as-is, wrapped by a small helper that applies the
psalm/cantique book-prefix fallback before calling it. `parseAelfRef` returns a
book **slug**; shards are keyed by slug, and the frontend maps its `usfx` to a
slug through `BOOKS` in `src/lib/utils/bibleBookSlug.ts`.

Refs `parseAelfRef` rejects (notably ones spanning two chapters, `"Mt 26, 14 -
27, 66"`) are skipped, as they are for the concordance. The generator logs a
count of skipped refs so a regression in the source data is visible in build
output.

## Loaders

Two additions to `src/lib/data/loaders.ts`, both following the existing
module-level promise-cache pattern:

- `loadVerseLiturgyBook(bookSlug)` → the shard, cached per book. 404 yields an
  empty object, as `loadCecLiturgy` does for a missing bucket.
- `loadVerseLiturgyDays()` → `days.json`, cached once.

## Frontend

### Compendium

No new component. `TabCompendium`'s effect currently derives a single paragraph
from a `paragraph` context; it widens to derive a `number[]`:

- `paragraph` context → `[ctx.paragraph]`.
- `verse` context → the citing paragraphs from `bible-verse-index.json`.

The Q numbers become the deduped union over those paragraphs, sorted
ascending. Everything downstream (the part-bundle grouping, the fetch, the
rendering) is unchanged, since it already operates on a list of Q numbers.

Only the empty-state copy branches on context kind:

- paragraph · "Aucune question du Compendium ne cite ce paragraphe."
- verse · "Aucune question du Compendium n'est liée à ce verset."

A question surfaces here because it cites a paragraph that cites the verse, not
because it quotes the verse. That is indirect, and the tab says so in a short
note above the list: "Questions liées aux paragraphes du Catéchisme qui citent
ce verset."

### Liturgie

`TabLiturgie`'s card markup and CSS (roughly 200 of its 570 lines) move into a
new `src/lib/components/panels/LiturgyDayCards.svelte`, so the new tab renders
identical cards instead of a near-copy.

The extraction changes one thing in the moved code: `TabLiturgie` tracks a
single `current: number` used to highlight the paragraph in view and to break
runs in `tokens()`. `LiturgyDayCards` takes `highlight: Set<number>` instead,
and `tokens()` breaks a run at any member. `TabLiturgie` passes a one-element
set, so its rendering is unchanged.

`LiturgyDayCards` props:

- `cards: Card[]`
- `highlight: Set<number>` (default empty)
- `showParagraphs: boolean` (default true) · the proclamation section lists
  days, not paragraph programmes.

`feastHref` gains a weekday branch → `/calendrier-liturgique/feries/{cycle
lowercased}/{slug}`, and `meta()` renders "Semaine I" / "Semaine II" for them.

New `src/lib/components/panels/TabVerseLiturgie.svelte`, two sections:

1. **Proclamé à la messe** · days from the verse index containing this verse.
   Grouped the way `TabLiturgie` groups: Dimanches et solennités / Fêtes fixes
   / Autres jours du calendrier / Jours de semaine. Cards show the day, its
   readings, and the "Lire les textes" expander, with `showParagraphs={false}`.
2. **Paragraphes à méditer** · the union of `loadCecLiturgy()` over the
   paragraphs citing the verse, with all of them highlighted. Shards are cached
   per paragraph-hundred, so ten paragraphs is typically two or three requests.

Each section renders only when non-empty; if both are empty the tab is not
shown at all.

Wording follows the house rule that Catechism paragraphs are *proposed for
meditation*, never read or proclaimed. Only section 1, which is about scripture
actually read at Mass, uses "proclamé".

### Panel wiring

`StudyPanel.visibleGroups` returns up to three groups for a verse context
(`CEC`, `Compendium`, `Liturgie`), each included only when it has content. Its
availability `$effect` gains a verse branch computing, from the citing
paragraphs: whether any Compendium question cites one, and whether either
Liturgie section would be non-empty. The Liturgie check needs only the book
shard, not `days.json`.

The `{:else if}` chain gains `activeTab === 'liturgie' && context.kind ===
'verse'` → `TabVerseLiturgie`, sitting beside the existing paragraph-context
branch for `TabLiturgie`. `PanelTab` needs no new members: `compendium` and
`liturgie` already exist and are reused.

## Links opening in a new tab

Separate, smaller change, shipped first as its own commit so it does not ride
along with the above.

Page links inside the panel get `target="_blank" rel="noopener"`:
`TabCompendium`'s question links, `TabLiturgie`'s feast titles and reading
refs, `TabBibleRefs`'s verse refs. (`TabBibleRefs`'s "Lire le chapitre entier"
already does this, so there is precedent in the file.)

Explicitly **not** changed: `ParagraphList`'s "CEC 305" links, which serve the
Renvois, Cité dans and verse tabs. They re-target the panel in place as well as
navigating, and that drill-down is the point of those lists.

## Testing

- `tests/unit/prepare/verseLiturgyIndex.test.ts` · the pure builder: shard
  keying, day deduplication across refs, verse-range expansion, the
  psalm-prefix fallback, and skipping of cross-chapter refs. Mirrors
  `cecLiturgyIndex.test.ts`.
- `tests/unit/` · the ref-normalisation helper, on the real failing strings
  from the spike.
- `tests/e2e/study-panel.test.ts` · from `/bible/matthieu/6`, verse 33: the
  three tabs appear; the Compendium tab lists questions; the Liturgie tab shows
  both sections; a feast link carries `target="_blank"`.
- Existing `tests/e2e/liturgie-tab.test.ts` must keep passing unchanged · it is
  the regression guard for the `LiturgyDayCards` extraction.

## Out of scope

- Compendium questions matched by their own `bible_refs`. Only 123 of 598
  questions carry any, so a direct lookup would be empty for most verses.
  Decided against in favour of the paragraph-derived route.
- Changing how the CEC liturgy index (`calendrier/cec/`) is built or what it
  covers. The new index is additive.
- The Bible reader's verse pill, which still renders a `§` against the house
  rule, and `BibleChapter`'s verse-row `aria-label`, which still contains an em
  dash. Both are pre-existing and unrelated.
