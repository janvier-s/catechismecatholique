# Bible translations · FIL and TOL alongside NCL · Design

> **Status: parked.** This was scoped while the motivation was believed to be
> filling verses the CEC cites but NCL lacks. Those verses turned out not to be
> missing from NCL at all: a parser defect was dropping 20 of them, fixed
> separately. No translation work is needed for that purpose. The design stands
> on its own merits if a translation selector is ever wanted as a feature.

## Goal

The Bible reader serves one text, the Nouvelle Crampon Liturgique (`ncl`). Add a
translation dimension so a reader can switch editions, and ship the Fillion
translation (`fil`) with it. Build the pipeline for the liturgical translation
(`tol`) at the same time, but leave it gated off pending rights.

Out of scope: the side-by-side compare view. It is a natural follow-up once the
address space and registry exist, and it is easier to design after the two texts
have been read side by side in the wild.

## Sources

| id | Edition | Year | Rights | Shape | Books | Verses |
| --- | --- | --- | --- | --- | --- | --- |
| `ncl` | Nouvelle Crampon Liturgique | 1904 | public domain | already prepared | 73 | · |
| `fil` | Fillion | 1888-1904 | public domain | nested | 73 | 35809 |
| `tol` | Traduction liturgique (AELF) | 2013 | **under copyright** | flat | 73 | 35414 |

`fil` lives at
`~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/SCRIPTURA/sources/FR/FIL`.

`tol` lives at
`~/Documents/Bible n stuff/Bible/Catholic/FR/Ignatius NT FR/verses/TOL/JSON`,
with the Old Testament under `OT/` and the New Testament at the root. An earlier
copy under `SCRIPTURA/sources/FR/TOL` is missing Psalms and Baruch · do not use
it.

### Source shapes

`fil` · one file per book, nested:

```json
{ "book": "Gn", "chapters": [ { "chapter": 1, "verses": [ { "verse": 1, "text": "..." } ] } ] }
```

`tol` · one file per book, one flat row per verse:

```json
[ { "id": 1001001, "version_abbr": "TOL", "book_abbr": "gen", "chapter": 1, "verse": 1, "text": "..." } ]
```

Both are numbered `01`-`73` in exactly the order of `BOOKS` in
`src/lib/utils/bibleBookSlug.ts`, so book identity is `ordinal → BOOKS[n-1].usfx`.
No abbreviation table is needed, and the ordinal-to-usfx assumption is asserted
at prepare time.

### Rights

`tol` is the AELF official liturgical translation, identified by its own
`omissions_footnotes.json` as *"La Bible · Traduction liturgique avec notes
explicatives"*. It is under active copyright. Serving 809 days of Mass readings
for the liturgical calendar is a narrow, purpose-bound use; republishing the
complete text as a browsable translation is not the same thing.

The pipeline, registry entry and routes are therefore built and tested, but
`tol` ships with `live: false` and its data is **not** written to `static/`. The
route matcher rejects non-live ids, so `/bible/tol/...` returns 404 until the
flag is flipped. This mirrors how `douayrheimsbible` gates `rsv`.

## Versification

The CEC anchors on Hebrew (Masoretic) psalm numbering, the same scheme as NCL.
Evidence from the CEC's own citations:

| Citation | Text | Vulgate equivalent |
| --- | --- | --- |
| `Ps 22:2` (603, 2605) | "Mon Dieu, mon Dieu, pourquoi m'as-tu abandonné" | Ps 21:2 |
| `Ps 51:12` (298, 431) | Miserere, "Crée en moi un cœur pur" | Ps 50:12 |
| `Ps 130:1` (2559) | De profundis | Ps 129:1 |

`fil` and `tol` both use Greek/Vulgate numbering. Hebrew is therefore the
canonical address space, and the two new editions are converted into it at
ingest.

### Chapter-level divergence

Measured, not assumed. Comparing `fil` against `ncl` across all 73 books:

- **Psalms** · 150 chapters each, offset by the standard Hebrew/Vulgate mapping.
  Three of the four merge/split points agree exactly on verse totals (Hebrew
  114+115 = Vulgate 113 at 26 verses; Hebrew 116 = Vulgate 114+115 at 19;
  Hebrew 147 = Vulgate 146+147 at 20). Only Hebrew 9+10 (38 verses) against
  Vulgate 9 (39) disagrees.
- **Joël** · `fil` 3 chapters, `ncl` 4. Hebrew splits Joel 2:28-32 into chapter 3.
- **Malachie** · `fil` 4 chapters, `ncl` 3. The Vulgate splits Malachi 3 into 3+4.
- Every other book matches.

In the plain `n-1` stretch of the Psalter, 123 of 133 chapters match on verse
count; the 10 that differ are off by exactly one, the superscription that Hebrew
folds into verse 1 and the Vulgate splits out.

### Verse-level divergence

Outside the Psalter, 171 of 1177 compared chapters (14.5%), across 40 books,
have different verse counts between `fil` and `ncl`. Fillion follows Vulgate
versification throughout.

This is why **no feature maps a verse number across translations.** Chapter-level
addressing is the whole contract. See "Reader" below.

## Data pipeline

New module `scripts/prepare/translations.ts`, called from
`scripts/prepare-data.ts` alongside the existing NCL step.

One adapter per source shape, both emitting the format `ncl` already uses, so
every downstream loader stays unchanged:

```
{ "1": { "1": "Au commencement…", "2": "…" }, "2": { … } }
```

Steps per translation:

1. Read each source book, resolve `ordinal → usfx`.
2. Normalise to `{chapter: {verse: text}}`.
3. Apply the Vulgate → Hebrew renumbering for `PSA`, `JOL` and `MAL`.
4. Write `static/data/bible/{tid}/{USFX}.json` plus `manifest.json`, mirroring
   the existing `static/data/bible/ncl/` layout.

Only translations with `live: true` are written, so `tol` produces no files.

### Renumbering

The Vulgate → Hebrew tables live in `src/lib/utils/psalm-numbering.ts`, next to
the existing `vulgatePsalmLabel`, which already encodes the same
correspondences in the other direction. Extend rather than duplicate.

`JOL` and `MAL` are single fixed splits and are expressed as small explicit
tables in the same module, not as special cases inside the adapter.

Renumbering operates at **chapter granularity only**. Verses are carried across
with their source numbers intact; no verse is renumbered, merged or
interpolated. Nothing in the shipped feature reads a verse number across
editions, so no verse-level alignment is invented.

Three of the conversions are chapter splits or merges, and each needs an
explicit boundary in the table:

- Vulgate Ps 9 splits into Hebrew 9 and 10 at the verse the table names. Vulgate
  Ps 9 carries 39 verses against Hebrew's 20 + 18 = 38, so one verse of
  difference remains after the split. It stays with Hebrew 10 rather than being
  dropped. This is a genuine versification difference, not a mapping error, and
  no feature depends on the placement.
- Vulgate Joel 2 splits into Hebrew 2 and 3 at Joel 2:28; Vulgate Joel 3 becomes
  Hebrew 4.
- Vulgate Malachi 3 and 4 merge into Hebrew 3.

The reverse cases in the Psalter (Vulgate 113 into Hebrew 114 + 115, Vulgate 114
and 115 into Hebrew 116, Vulgate 146 and 147 into Hebrew 147) agree exactly on
verse totals and need no tolerance.

### Build-time guards

`prepare-data.ts` fails the build if:

- a converted book's chapter count does not match the `ncl` shard for the same
  usfx. After renumbering this holds for every book including `PSA`, `JOL` and
  `MAL`, so there are no exemptions; a mismatch means the mapping is wrong;
- a source ordinal does not resolve to a `BOOKS` entry;
- a translation marked `live` produces fewer than 73 books.

These make a numbering regression a build failure rather than a silent bad page.

### Footprint

`static/` currently holds 16532 files against Cloudflare's 20000 cap. `fil` adds
73 shards plus a manifest; `tol`, when enabled, adds the same. 3468 files of
headroom, so ~148 is comfortable.

## Registry

New `src/lib/bible-translations.ts`, modelled on `src/lib/corpora.ts` and on
`compare.ts` in `douayrheimsbible`. Single source of truth; adding a translation
means adding one record.

```ts
export interface TranslationRecord {
	id: TranslationId;          // 'ncl' | 'fil' | 'tol'
	label: string;              // 'Fillion'
	abbr: string;               // 'Fil'
	year: string;               // '1888-1904'
	live: boolean;              // false gates the route and the pipeline
	isDefault?: boolean;        // ncl only · owns the bare /bible/... routes
	versification: 'hebrew' | 'vulgate';  // source scheme, before conversion
	notice?: string;            // rights/attribution line for the reader
	seoName: string;
	seoDesc: string;            // {book} and {chapter} placeholders
}
```

`versification` records what the source used, so the reader can label a psalm
honestly ("Ps 23 · Vg 22") through the existing `vulgatePsalmLabel`, even though
the address is Hebrew.

Helpers: `translationById`, `liveTranslations`, `defaultTranslation`.

## Routing

`ncl` keeps the bare routes. `/bible/{book}/{ch}` is untouched, so the ~1400
Bible URLs already in the sitemap keep their ranking and no redirects are
introduced.

New param matcher `src/params/translation.ts`, accepting only live, non-default
ids. New route tree:

```
src/routes/bible/[tid=translation]/[book=biblebook]/[ch]/+page.ts
src/routes/bible/[tid=translation]/[book=biblebook]/[ch]/+page.svelte
```

The `biblebook` matcher only accepts known book slugs, so a translation segment
cannot collide with a book segment.

`+page.ts` mirrors the existing chapter loader, reading
`static/data/bible/{tid}/` instead of `bible/ncl/`. Paragraph and section data
are NCL-specific apparatus and are not loaded for other translations.

Sitemap gains chapter URLs for every live non-default translation. Each page
carries a self-referential `rel=canonical` and per-translation title and
description from the registry.

## Reader

`BibleChapter` gains a `translation` prop, defaulting to `ncl`.

**A translation switcher** in the chapter header, listing live translations and
preserving book and chapter. Selection persists to the existing prefs store.
Because the address space is shared, switching from `/bible/psaumes/23` to
Fillion lands on `/bible/fil/psaumes/23` · the same psalm, under the number the
CEC uses, with "Vg 22" shown as a secondary label.

**Non-default translations render as plain reading text.** Verse rows are not
clickable and the study panel does not open. The CCC verse index, the Compendium
citer index and the liturgy index are all built on NCL versification, and 14.5%
of chapters disagree with it; rather than show citations that may be off by a
verse, non-NCL pages are reading pages only. NCL keeps the full study
experience unchanged.

This also keeps the change contained: no panel context, no verse-click plumbing,
and no index has to learn about translations.

`notice`, when present, renders once at the foot of the chapter as an
attribution line.

## Testing

Unit:

- Vulgate → Hebrew psalm mapping, including the four merge/split points and the
  three books with chapter divergence. Table-driven, extending
  `tests/unit/psalm-numbering.test.ts`.
- Adapters: each source shape normalises to `{chapter: {verse: text}}`.
- `ordinal → usfx` resolution across all 73 ordinals.
- Registry helpers, including that `tol` is excluded from `liveTranslations`.
- The `translation` param matcher accepts `fil`, rejects `ncl`, `tol` and junk.

E2E:

- `/bible/fil/psaumes/23` renders Fillion's text of "Le Seigneur est mon berger"
  · the psalm the CEC calls 23.
- The switcher moves between `/bible/psaumes/23` and `/bible/fil/psaumes/23`
  keeping book and chapter.
- `/bible/tol/genese/1` returns 404 while `tol` is gated.
- `/bible/genese/1` still opens the study panel; `/bible/fil/genese/1` has no
  clickable verse rows.
- Joël and Malachie render the expected chapter count under `fil`.

## Open follow-ups

Deliberately deferred, not forgotten:

- The compare view.
- `tol` rights. Flipping `live` to `true` is the only change needed once
  resolved, plus an attribution `notice`.
- The `tol` source also carries book introductions (USFM) and an omissions
  apparatus (`omissions_footnotes.json`, 614 entries). Neither is consumed.
- AELF attribution for the 809 Mass-reading files already shipped is a separate
  question this design does not address.
