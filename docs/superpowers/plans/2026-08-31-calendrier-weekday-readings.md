# Calendrier Weekday Readings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CCC paragraph cross-references for weekday (ferial) Mass readings to the calendrier feature, generated automatically from the archived Didache concordance instead of hand-curated.

**Architecture:** Four small, independently-testable build-time modules (ref parser → concordance matcher → CCC-heading clusterer → Romcal weekday enumerator) feed a new orchestrator that emits `feries-i.json`/`feries-ii.json` (same shape as the existing `annee-a.json`) and extends `dates-index.json` with `corpus: 'weekday'` rows. The frontend (`CalendrierPicker`, `FeastBlock`, `PickedDateCard`) is already generic over these types and needs only a new loader branch.

**Tech Stack:** TypeScript (strict), tsx (build scripts), vitest, Romcal (already a dependency), Node `fs`.

**Spec:** `docs/superpowers/specs/2026-08-31-calendrier-weekday-readings-design.md`

## Global Constraints

- Svelte 5 runes only where any `.svelte` file is touched (not expected — see Task 10).
- No em dashes in any string shown to users or written in commit messages/comments; use middot (`·`), comma, or rewrite.
- No French thousands separators in numerals.
- No `§` markers in new user-facing calendrier text (matches the existing `.par-num` fix already applied to `FeastBlock.svelte`).
- Cluster cap is **7**, not a fixed low number — matches the maximum cluster count already present in `scripts/data-sources/calendrier/CCC_Liturgy_List.txt` (verified: `awk` count over the file gives 7 as the max).
- Reuse `CalendrierCluster` / `CalendrierFeast` (`scripts/prepare/calendrier.ts`) unchanged — no new feast/cluster types.
- Build scripts under `scripts/prepare/` may import runtime values (not just types) from `src/lib/` via relative paths with an explicit `.ts` extension (verified working with `tsx`: `import { bookByAbbr } from '../../src/lib/utils/bibleBookSlug.ts';`) — this project's tsconfig has `allowImportingTsExtensions: true`.
- Commit after every task, Conventional Commit prefixes (`feat:`, `fix:`, `test:`, `chore:`, `refactor:`).
- Run `npx prettier --write <files>` on every file you create/edit before committing it, and `npm run check` after any `.ts`/`.svelte` change that touches shared types.

---

## Task 1: Concordance ref parser

**Files:**
- Create: `scripts/prepare/concordanceRefParser.ts`
- Test: `tests/unit/prepare/concordanceRefParser.test.ts`

**Interfaces:**
- Produces: `export interface ParsedRef { slug: string; chapter: number; ranges: [number, number][] }` and `export function parseAelfRef(raw: string): ParsedRef | null`.

AELF `ref` strings observed in production (verified live against `api.aelf.org` during the design spike): `"Ep 1, 1-10"`, `"1 R  17, 1-6"` (double space after numbered-book prefix), `"Jn 3, 7b- 15"` (lowercase verse-letter suffix, irregular spacing around the dash), `"Mi 6, 1-4.6-8"` (two disjoint ranges joined by `.`), `"Ps 118 (119), 97-98, 99-100, 101-102"` (psalm dual-numbering plus multiple comma-separated ranges — psalm content uses only the first, Septuagint number, since that's what the AELF text itself is keyed on and it's what `data-archive/concordance/psaumes/` is organized by).

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/prepare/concordanceRefParser.test.ts
import { describe, it, expect } from 'vitest';
import { parseAelfRef } from '../../../scripts/prepare/concordanceRefParser';

describe('parseAelfRef', () => {
	it('parses a plain single-range ref', () => {
		expect(parseAelfRef('Ep 1, 1-10')).toEqual({
			slug: 'ephesiens',
			chapter: 1,
			ranges: [[1, 10]]
		});
	});

	it('parses a numbered-book ref with a double space', () => {
		expect(parseAelfRef('1 R  17, 1-6')).toEqual({
			slug: '1-rois',
			chapter: 17,
			ranges: [[1, 6]]
		});
	});

	it('strips lowercase verse-letter suffixes and irregular dash spacing', () => {
		expect(parseAelfRef('Jn 3, 7b- 15')).toEqual({
			slug: 'jean',
			chapter: 3,
			ranges: [[7, 15]]
		});
	});

	it('parses dot-separated compound ranges', () => {
		expect(parseAelfRef('Mi 6, 1-4.6-8')).toEqual({
			slug: 'michee',
			chapter: 6,
			ranges: [
				[1, 4],
				[6, 8]
			]
		});
	});

	it('parses a single verse with no range', () => {
		expect(parseAelfRef('Lc 4, 24')).toEqual({
			slug: 'luc',
			chapter: 4,
			ranges: [[24, 24]]
		});
	});

	it('uses the first (Septuagint) number of a dual-numbered psalm ref', () => {
		expect(parseAelfRef('Ps 118 (119), 97-98, 99-100, 101-102')).toEqual({
			slug: 'psaumes',
			chapter: 118,
			ranges: [
				[97, 98],
				[99, 100],
				[101, 102]
			]
		});
	});

	it('returns null for an unresolvable book abbreviation', () => {
		expect(parseAelfRef('Xyz 1, 1-5')).toBeNull();
	});

	it('returns null for a malformed ref', () => {
		expect(parseAelfRef('not a reference')).toBeNull();
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/prepare/concordanceRefParser.test.ts`
Expected: FAIL with "Cannot find module '../../../scripts/prepare/concordanceRefParser'"

- [ ] **Step 3: Implement the parser**

```typescript
// scripts/prepare/concordanceRefParser.ts
import { bookByAbbr } from '../../src/lib/utils/bibleBookSlug.ts';

export interface ParsedRef {
	slug: string;
	chapter: number;
	ranges: [number, number][];
}

/**
 * Parses an AELF `ref` string ("Ep 1, 1-10", "1 R  17, 1-6", "Jn 3, 7b- 15",
 * "Mi 6, 1-4.6-8", "Ps 118 (119), 97-98") into a book slug + chapter +
 * verse ranges. Verse-letter suffixes (7b, 15a) are dropped - the concordance
 * matches at verse granularity, not half-verse. Psalm dual numbering keeps
 * only the first (Septuagint) number, since that's what both the AELF text
 * and data-archive/concordance/psaumes/ are keyed on.
 */
export function parseAelfRef(raw: string): ParsedRef | null {
	const cleaned = raw.replace(/\s+/g, ' ').trim();
	// Drop a parenthesised Hebrew-numbering psalm suffix before the main match,
	// e.g. "Ps 118 (119), 97-98" -> "Ps 118, 97-98".
	const withoutAltNumbering = cleaned.replace(/^(\D*\d+)\s*\([^)]+\)/, '$1');

	const m = withoutAltNumbering.match(/^(\d\s+)?([A-Za-zÀ-ÿ]+)\s+(\d+)\s*,\s*(.+)$/);
	if (!m) return null;
	const [, numPrefix, abbrWord, chapterStr, versePart] = m;
	const abbr = numPrefix ? `${numPrefix.trim()} ${abbrWord}` : abbrWord!;
	const book = bookByAbbr(abbr!);
	if (!book) return null;

	const chapter = parseInt(chapterStr!, 10);
	const ranges: [number, number][] = [];
	for (const part of versePart!.split('.')) {
		const vm = part.trim().match(/^(\d+)\s*[a-z]?\s*-?\s*(\d+)?\s*[a-z]?$/);
		if (!vm) continue;
		const start = parseInt(vm[1]!, 10);
		const end = vm[2] ? parseInt(vm[2], 10) : start;
		ranges.push([start, end]);
	}
	if (ranges.length === 0) return null;

	return { slug: book.slug, chapter, ranges };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/prepare/concordanceRefParser.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write scripts/prepare/concordanceRefParser.ts tests/unit/prepare/concordanceRefParser.test.ts
git add scripts/prepare/concordanceRefParser.ts tests/unit/prepare/concordanceRefParser.test.ts
git commit -m "feat(calendrier): parse AELF reading refs for concordance matching"
```

---

## Task 2: Concordance matcher

**Files:**
- Create: `scripts/prepare/concordanceMatcher.ts`
- Test: `tests/unit/prepare/concordanceMatcher.test.ts`
- Test fixtures: `tests/unit/prepare/concordance-matcher-fixtures/ephesiens/1.json`, `tests/unit/prepare/concordance-matcher-fixtures/luc/4.json`

**Interfaces:**
- Consumes: `ParsedRef` from Task 1 (`{ slug, chapter, ranges }`).
- Produces: `export interface CccCitation { from: number; to: number }` and `export function matchConcordance(ref: ParsedRef, concordanceDir: string): CccCitation[]`.

**Step 1: Write the fixture files**

- [ ] Create `tests/unit/prepare/concordance-matcher-fixtures/ephesiens/1.json`:

```json
{
	"pericopes": [
		{
			"verseRef": "Éphésiens 1:1-2",
			"startCh": 1,
			"endCh": 1,
			"startVerse": 1,
			"endVerse": 2,
			"pericopeTitle": null,
			"cccRanges": [{ "from": 442, "to": 442 }]
		},
		{
			"verseRef": "Éphésiens 1:3-14",
			"startCh": 1,
			"endCh": 1,
			"startVerse": 3,
			"endVerse": 14,
			"pericopeTitle": null,
			"cccRanges": [
				{ "from": 257, "to": 258 },
				{ "from": 381, "to": 381 }
			]
		},
		{
			"verseRef": "Éphésiens 1:15-23",
			"startCh": 1,
			"endCh": 1,
			"startVerse": 15,
			"endVerse": 23,
			"pericopeTitle": null,
			"cccRanges": [{ "from": 1088, "to": 1088 }]
		}
	],
	"verseEntryCounts": {},
	"totalEntries": 3
}
```

- [ ] Create `tests/unit/prepare/concordance-matcher-fixtures/luc/4.json` (real shard, trimmed to the entries the test needs — copy verbatim from `data-archive/concordance/luc/4.json`'s entries whose `startVerse`/`endVerse` fall in 16-30, or write the minimal equivalent):

```json
{
	"pericopes": [
		{
			"verseRef": "Luc 4:18-19",
			"startCh": 4,
			"endCh": 4,
			"startVerse": 18,
			"endVerse": 19,
			"pericopeTitle": null,
			"cccRanges": [
				{ "from": 453, "to": 453 },
				{ "from": 695, "to": 695 }
			]
		},
		{
			"verseRef": "Luc 4:24",
			"startCh": 4,
			"endCh": 4,
			"startVerse": 24,
			"endVerse": 24,
			"pericopeTitle": null,
			"cccRanges": [{ "from": 558, "to": 558 }]
		}
	],
	"verseEntryCounts": {},
	"totalEntries": 2
}
```

- [ ] **Step 2: Write the failing tests**

```typescript
// tests/unit/prepare/concordanceMatcher.test.ts
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { matchConcordance } from '../../../scripts/prepare/concordanceMatcher';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'concordance-matcher-fixtures');

describe('matchConcordance', () => {
	it('collects cccRanges from every pericope overlapping the ref', () => {
		const result = matchConcordance(
			{ slug: 'ephesiens', chapter: 1, ranges: [[1, 10]] },
			FIXTURES
		);
		expect(result).toEqual([
			{ from: 442, to: 442 },
			{ from: 257, to: 258 },
			{ from: 381, to: 381 }
		]);
	});

	it('excludes pericopes outside the cited verse range', () => {
		const result = matchConcordance({ slug: 'luc', chapter: 4, ranges: [[16, 20]] }, FIXTURES);
		expect(result).toEqual([
			{ from: 453, to: 453 },
			{ from: 695, to: 695 }
		]);
	});

	it('matches across multiple disjoint ranges (compound refs)', () => {
		const result = matchConcordance(
			{
				slug: 'luc',
				chapter: 4,
				ranges: [
					[18, 19],
					[24, 24]
				]
			},
			FIXTURES
		);
		expect(result).toEqual([
			{ from: 453, to: 453 },
			{ from: 695, to: 695 },
			{ from: 558, to: 558 }
		]);
	});

	it('returns an empty array when the chapter file does not exist', () => {
		expect(matchConcordance({ slug: 'genese', chapter: 999, ranges: [[1, 1]] }, FIXTURES)).toEqual(
			[]
		);
	});
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/prepare/concordanceMatcher.test.ts`
Expected: FAIL with "Cannot find module '../../../scripts/prepare/concordanceMatcher'"

- [ ] **Step 4: Implement the matcher**

```typescript
// scripts/prepare/concordanceMatcher.ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ParsedRef } from './concordanceRefParser.ts';

export interface CccCitation {
	from: number;
	to: number;
}

interface ConcordancePericope {
	startCh: number;
	endCh: number;
	startVerse: number;
	endVerse: number;
	cccRanges: { from: number; to: number }[];
}

interface ConcordanceChapterFile {
	pericopes: ConcordancePericope[];
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
	return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Looks up every concordance pericope overlapping any of the ref's verse
 * ranges, in file order, and returns the union of their cccRanges - not
 * deduplicated or merged yet (the clusterer in Task 3 does that, since range
 * boundaries matter for the heading lookup).
 */
export function matchConcordance(ref: ParsedRef, concordanceDir: string): CccCitation[] {
	const path = join(concordanceDir, ref.slug, `${ref.chapter}.json`);
	if (!existsSync(path)) return [];

	const data = JSON.parse(readFileSync(path, 'utf8')) as ConcordanceChapterFile;
	const citations: CccCitation[] = [];
	for (const pericope of data.pericopes) {
		const matches = ref.ranges.some(([start, end]) =>
			overlaps(pericope.startVerse, pericope.endVerse, start, end)
		);
		if (matches) citations.push(...pericope.cccRanges);
	}
	return citations;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/prepare/concordanceMatcher.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Format and commit**

```bash
npx prettier --write scripts/prepare/concordanceMatcher.ts tests/unit/prepare/concordanceMatcher.test.ts tests/unit/prepare/concordance-matcher-fixtures
git add scripts/prepare/concordanceMatcher.ts tests/unit/prepare/concordanceMatcher.test.ts tests/unit/prepare/concordance-matcher-fixtures
git commit -m "feat(calendrier): match parsed refs against the archived concordance"
```

---

## Task 3: CCC heading clusterer

**Files:**
- Create: `scripts/prepare/cecHeadingCluster.ts`
- Test: `tests/unit/prepare/cecHeadingCluster.test.ts`
- Test fixture: `tests/unit/prepare/cec-structure-fixture.json`

This is the variable-granularity lookup verified in the design spike: for a
cited range, try the finest heading level first, and only fall back to a
coarser level when the finer one doesn't fully contain the range. Chapter
level is built to have zero gaps across all 2865 paragraphs (including the
prologue), so it's always a safe last resort.

**Interfaces:**
- Consumes: `CccCitation[]` from Task 2, and the raw `structure.json` shape (defined locally here — the existing frontend `Structure`/`StructurePart` types in `src/lib/data/types.ts` are stale relative to the real file, missing `headings`/`articles`/`range`, so this task defines its own accurate local type rather than importing them).
- Produces: `export interface CecStructureFile { parts: CecStructurePart[] }` (and nested types), `export function buildHeadingLevels(structure: CecStructureFile): HeadingLevels`, `export function clusterCitations(citations: CccCitation[], levels: HeadingLevels, cap?: number): CalendrierCluster[]`.

- [ ] **Step 1: Write the structure fixture**

Create `tests/unit/prepare/cec-structure-fixture.json` — a trimmed real slice covering the Beatitudes test case (CEC 1716-1729 spans 3 sub-headings under one article) plus a couple of scattered single paragraphs, matching the real `static/data/cec/structure.json` shape exactly:

```json
{
	"parts": [
		{
			"slug": "prologue",
			"title": "Prologue",
			"prologue": true,
			"range": { "from": 1, "to": 25 },
			"intro_headings": [
				{ "id": "i", "level": 2, "title": "I. La vie de l'homme", "paragraph_start": 1 }
			]
		},
		{
			"slug": "3-vie-dans-le-christ",
			"title": "La vie dans le Christ",
			"sections": [
				{
					"slug": "1-vocation-de-lhomme-la-vie-dans-lesprit",
					"title": "La vocation de l'homme : la vie dans l'Esprit",
					"chapters": [
						{
							"slug": "1-dignite-de-la-personne-humaine",
							"title": "La dignité de la personne humaine",
							"range": { "from": 1700, "to": 2051 },
							"headings": [],
							"articles": [
								{
									"slug": "2-notre-vocation-a-la-beatitude",
									"title": "Notre vocation à la béatitude",
									"range": { "from": 1716, "to": 1729 },
									"headings": [
										{
											"id": "i-les-beatitudes",
											"level": 2,
											"title": "I. Les béatitudes",
											"paragraph_start": 1716
										},
										{
											"id": "ii-le-desir-du-bonheur",
											"level": 2,
											"title": "II. Le désir du bonheur",
											"paragraph_start": 1723
										},
										{
											"id": "iii-la-beatitude-chretienne",
											"level": 2,
											"title": "III. La béatitude chrétienne",
											"paragraph_start": 1725
										}
									]
								}
							]
						}
					]
				}
			]
		},
		{
			"slug": "4-priere-chretienne",
			"title": "La prière chrétienne",
			"sections": [
				{
					"slug": "2-priere-du-seigneur",
					"title": "La prière du Seigneur : « Notre Père »",
					"chapters": [
						{
							"slug": "1-notre-pere",
							"title": "« Notre Père »",
							"range": { "from": 2759, "to": 2865 },
							"headings": [],
							"articles": [
								{
									"slug": "6-le-septieme-commandement",
									"title": "Le septième commandement",
									"range": { "from": 2401, "to": 2463 },
									"headings": []
								}
							]
						}
					]
				}
			]
		}
	]
}
```

- [ ] **Step 2: Write the failing tests**

```typescript
// tests/unit/prepare/cecHeadingCluster.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
	buildHeadingLevels,
	clusterCitations,
	type CecStructureFile
} from '../../../scripts/prepare/cecHeadingCluster';

const HERE = dirname(fileURLToPath(import.meta.url));
const structure: CecStructureFile = JSON.parse(
	readFileSync(join(HERE, 'cec-structure-fixture.json'), 'utf8')
);
const levels = buildHeadingLevels(structure);

describe('clusterCitations - variable granularity', () => {
	it('resolves a range spanning multiple fine headings to the containing article title', () => {
		const clusters = clusterCitations([{ from: 1716, to: 1729 }], levels);
		expect(clusters).toHaveLength(1);
		expect(clusters[0]!.theme).toBe('Notre vocation à la béatitude');
		expect(clusters[0]!.paragraphs).toEqual(
			Array.from({ length: 1729 - 1716 + 1 }, (_, i) => 1716 + i)
		);
	});

	it('resolves a narrow range to its fine heading, not the coarser article', () => {
		const clusters = clusterCitations([{ from: 1716, to: 1716 }], levels);
		expect(clusters[0]!.theme).toBe('I. Les béatitudes');
	});

	it('groups scattered single-paragraph citations that share a heading, keeps others separate', () => {
		const clusters = clusterCitations(
			[
				{ from: 1716, to: 1716 },
				{ from: 1723, to: 1723 },
				{ from: 1, to: 1 }
			],
			levels
		);
		expect(clusters.map((c) => c.theme).sort()).toEqual(
			['I. La vie de l’homme', 'I. Les béatitudes', 'II. Le désir du bonheur'].sort()
		);
	});

	it('falls back to the chapter title when a range has no fine or article heading', () => {
		const clusters = clusterCitations([{ from: 2401, to: 2463 }], levels);
		// The fixture's "Le septième commandement" article has no headings of
		// its own and its range (2401-2463) is wider than "Notre Père"'s
		// chapter range only by construction of this fixture - the lookup must
		// still resolve to *some* containing title without throwing.
		expect(clusters[0]!.theme).toBeTruthy();
	});

	it('caps the number of clusters, keeping the largest groups', () => {
		const manyScattered = [
			{ from: 1716, to: 1716 },
			{ from: 1723, to: 1723 },
			{ from: 1725, to: 1725 },
			{ from: 1, to: 1 }
		];
		const clusters = clusterCitations(manyScattered, levels, 2);
		expect(clusters).toHaveLength(2);
	});

	it('formats the refs string as compact CEC ranges', () => {
		const clusters = clusterCitations([{ from: 1716, to: 1729 }], levels);
		expect(clusters[0]!.refs).toBe('1716-1729');
	});

	it('returns an empty array for no citations', () => {
		expect(clusterCitations([], levels)).toEqual([]);
	});
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/prepare/cecHeadingCluster.test.ts`
Expected: FAIL with "Cannot find module '../../../scripts/prepare/cecHeadingCluster'"

- [ ] **Step 4: Implement the clusterer**

```typescript
// scripts/prepare/cecHeadingCluster.ts
import type { CalendrierCluster } from './calendrier.ts';
import type { CccCitation } from './concordanceMatcher.ts';

export interface CecHeading {
	title: string;
	paragraph_start: number;
}

export interface CecRange {
	from: number;
	to: number;
}

export interface CecArticle {
	title: string;
	range: CecRange;
	headings: CecHeading[];
}

export interface CecChapter {
	title: string;
	range: CecRange;
	headings: CecHeading[];
	articles: CecArticle[];
}

export interface CecSection {
	chapters: CecChapter[];
}

export interface CecPart {
	title: string;
	prologue?: boolean;
	range?: CecRange;
	intro_headings?: CecHeading[];
	sections?: CecSection[];
}

export interface CecStructureFile {
	parts: CecPart[];
}

interface Span {
	start: number;
	end: number;
	title: string;
}

export interface HeadingLevels {
	fine: Span[];
	article: Span[];
	chapter: Span[];
}

/** Turns a list of (paragraph_start, title) into non-overlapping spans, each
 *  ending one paragraph before the next entry starts. The last entry's span
 *  runs to `maxParagraph` (the CCC's last paragraph, 2865) so the coarsest
 *  level always has zero gaps. */
function closeSpans(entries: { start: number; title: string }[], maxParagraph: number): Span[] {
	const sorted = [...entries].sort((a, b) => a.start - b.start);
	return sorted.map((entry, i) => ({
		start: entry.start,
		end: i + 1 < sorted.length ? sorted[i + 1]!.start - 1 : maxParagraph,
		title: entry.title
	}));
}

const MAX_PARAGRAPH = 2865;

export function buildHeadingLevels(structure: CecStructureFile): HeadingLevels {
	const fineEntries: { start: number; title: string }[] = [];
	const articleEntries: { start: number; title: string }[] = [];
	const chapterEntries: { start: number; title: string }[] = [];

	for (const part of structure.parts) {
		if (part.prologue) {
			for (const h of part.intro_headings ?? []) {
				fineEntries.push({ start: h.paragraph_start, title: h.title });
			}
			if (part.range) chapterEntries.push({ start: part.range.from, title: part.title });
			continue;
		}
		for (const section of part.sections ?? []) {
			for (const chapter of section.chapters) {
				chapterEntries.push({ start: chapter.range.start, title: chapter.title });
				for (const h of chapter.headings) fineEntries.push({ start: h.paragraph_start, title: h.title });
				for (const article of chapter.articles) {
					articleEntries.push({ start: article.range.from, title: article.title });
					for (const h of article.headings) {
						fineEntries.push({ start: h.paragraph_start, title: h.title });
					}
				}
			}
		}
	}

	return {
		fine: closeSpans(fineEntries, MAX_PARAGRAPH),
		article: closeSpans(articleEntries, MAX_PARAGRAPH),
		chapter: closeSpans(chapterEntries, MAX_PARAGRAPH)
	};
}

function findContaining(spans: Span[], from: number, to: number): string | null {
	for (const span of spans) {
		if (span.start <= from && to <= span.end) return span.title;
	}
	return null;
}

function bestHeadingFor(levels: HeadingLevels, from: number, to: number): string {
	return (
		findContaining(levels.fine, from, to) ??
		findContaining(levels.article, from, to) ??
		findContaining(levels.chapter, from, to) ??
		'Autres références'
	);
}

function formatCecRanges(paragraphs: number[]): string {
	const sorted = [...new Set(paragraphs)].sort((a, b) => a - b);
	const parts: string[] = [];
	let runStart = sorted[0]!;
	let prev = sorted[0]!;
	for (let i = 1; i <= sorted.length; i++) {
		const n = sorted[i];
		if (n !== undefined && n === prev + 1) {
			prev = n;
			continue;
		}
		parts.push(runStart === prev ? `${runStart}` : `${runStart}-${prev}`);
		if (n !== undefined) {
			runStart = n;
			prev = n;
		}
	}
	return parts.join(', ');
}

/**
 * Groups cited CCC ranges by the finest heading that fully contains each
 * range (falling back to article, then chapter, when a range spans a finer
 * boundary - verified against the real Beatitudes case, CEC 1716-1729,
 * which spans three fine headings and correctly resolves to its containing
 * article). Groups sharing a resolved title are merged into one cluster.
 * Sorted by paragraph count descending, capped at `cap` (default 7, the
 * highest cluster count any hand-curated Sunday feast reaches in
 * CCC_Liturgy_List.txt).
 */
export function clusterCitations(
	citations: CccCitation[],
	levels: HeadingLevels,
	cap = 7
): CalendrierCluster[] {
	const paragraphsByTheme = new Map<string, Set<number>>();
	for (const { from, to } of citations) {
		const theme = bestHeadingFor(levels, from, to);
		const set = paragraphsByTheme.get(theme) ?? new Set<number>();
		for (let n = from; n <= to; n++) set.add(n);
		paragraphsByTheme.set(theme, set);
	}

	const clusters = [...paragraphsByTheme.entries()]
		.map(([theme, set]) => ({ theme, paragraphs: [...set].sort((a, b) => a - b) }))
		.sort((a, b) => b.paragraphs.length - a.paragraphs.length)
		.slice(0, cap);

	return clusters.map((c, i) => ({
		i,
		theme: c.theme,
		refs: formatCecRanges(c.paragraphs),
		paragraphs: c.paragraphs
	}));
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/prepare/cecHeadingCluster.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Format and commit**

```bash
npx prettier --write scripts/prepare/cecHeadingCluster.ts tests/unit/prepare/cecHeadingCluster.test.ts tests/unit/prepare/cec-structure-fixture.json
git add scripts/prepare/cecHeadingCluster.ts tests/unit/prepare/cecHeadingCluster.test.ts tests/unit/prepare/cec-structure-fixture.json
git commit -m "feat(calendrier): cluster concordance citations by CCC heading"
```

---

## Task 4: Weekday target enumerator (Romcal)

**Files:**
- Create: `scripts/prepare/weekdayFeasts.ts`
- Test: `tests/unit/prepare/weekdayFeasts.test.ts`

**Interfaces:**
- Produces: `export interface WeekdayTarget { slug: string; season: SeasonKey; weekOfSeason: number; dayOfWeek: number; cycle: 'I' | 'II'; representativeDate: string }` and `export async function buildWeekdayTargets(startYear: number, endYear: number, today: string): Promise<WeekdayTarget[]>`.

Unlike the Sunday pipeline (which retries several candidate dates per feast
because a handful of solemnities transfer unpredictably), a plain ferial
weekday's identity is unambiguous from Romcal's own `rank`/`season`/
`weekOfSeason`/`dayOfWeek`/`cycles.weekdayCycle` fields — no retry loop is
needed. For each abstract `(season, weekOfSeason, dayOfWeek, cycle)`
combination, this keeps the **most recent** past occurrence (freshest AELF
text) at or before `today`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/prepare/weekdayFeasts.test.ts
import { describe, it, expect } from 'vitest';
import { buildWeekdayTargets } from '../../../scripts/prepare/weekdayFeasts';

describe('buildWeekdayTargets', () => {
	it('enumerates distinct weekday+cycle combinations with a past representative date', async () => {
		const targets = await buildWeekdayTargets(2023, 2024, '2024-12-31');
		expect(targets.length).toBeGreaterThan(0);
		for (const t of targets) {
			expect(t.representativeDate.slice(0, 10) <= '2024-12-31').toBe(true);
			expect(['I', 'II']).toContain(t.cycle);
			expect(t.dayOfWeek).toBeGreaterThanOrEqual(1);
			expect(t.dayOfWeek).toBeLessThanOrEqual(6);
		}
	});

	it('produces a stable, human-readable slug shape', async () => {
		const targets = await buildWeekdayTargets(2023, 2024, '2024-12-31');
		const ordinaryMonday = targets.find((t) => /^ordinaire-\d+-lundi$/.test(t.slug));
		expect(ordinaryMonday).toBeDefined();
	});

	it('never produces a Sunday slug', async () => {
		const targets = await buildWeekdayTargets(2023, 2024, '2024-12-31');
		expect(targets.some((t) => t.slug.endsWith('-dimanche'))).toBe(false);
	});

	it('respects the today cutoff', async () => {
		const targets = await buildWeekdayTargets(2023, 2024, '2023-06-01');
		for (const t of targets) {
			expect(t.representativeDate.slice(0, 10) <= '2023-06-01').toBe(true);
		}
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/prepare/weekdayFeasts.test.ts`
Expected: FAIL with "Cannot find module '../../../scripts/prepare/weekdayFeasts'"

- [ ] **Step 3: Implement the enumerator**

```typescript
// scripts/prepare/weekdayFeasts.ts
import { Romcal, Ranks } from 'romcal';
import type { SeasonKey } from './calendrier.ts';

export interface WeekdayTarget {
	slug: string;
	season: SeasonKey;
	weekOfSeason: number;
	dayOfWeek: number;
	cycle: 'I' | 'II';
	representativeDate: string;
}

const FRENCH_WEEKDAY: Record<number, string> = {
	1: 'lundi',
	2: 'mardi',
	3: 'mercredi',
	4: 'jeudi',
	5: 'vendredi',
	6: 'samedi'
};

const ROMCAL_SEASON_TO_OURS: Record<string, SeasonKey> = {
	ADVENT: 'avent',
	CHRISTMAS_TIME: 'noel',
	LENT: 'careme',
	EASTER_TIME: 'pascal',
	ORDINARY_TIME: 'ordinaire'
};

/**
 * Enumerates every distinct (season, weekOfSeason, dayOfWeek, weekdayCycle)
 * combination a plain ferial weekday can be, across [startYear, endYear],
 * keeping the most recent occurrence at or before `today` as the
 * representative date to fetch AELF text for. A weekday displaced by a
 * memorial/feast/solemnity has `rank !== Ranks.Weekday` that year and is
 * skipped for that year only - another year supplies the representative
 * date instead, same principle the Sunday pipeline already relies on for
 * displaced numbered Sundays.
 */
export async function buildWeekdayTargets(
	startYear: number,
	endYear: number,
	today: string
): Promise<WeekdayTarget[]> {
	const bySlugCycle = new Map<string, WeekdayTarget>();

	for (let year = startYear; year <= endYear; year++) {
		const calendar = await new Romcal().generateCalendar(year);
		const days = Object.values(calendar).map((arr) => arr[0]!);

		for (const day of days) {
			if (day.rank !== Ranks.Weekday) continue;
			if (day.date > today) continue;

			const dayOfWeek = day.calendar.dayOfWeek;
			const weekOfSeason = day.calendar.weekOfSeason;
			if (dayOfWeek === undefined || dayOfWeek === 0 || weekOfSeason === undefined) continue;

			const romcalSeason = day.seasons[0];
			const season = romcalSeason ? ROMCAL_SEASON_TO_OURS[romcalSeason] : undefined;
			if (!season) continue;

			const cycle: 'I' | 'II' = day.cycles.weekdayCycle === 'YEAR_1' ? 'I' : 'II';
			const slug = `${season}-${weekOfSeason}-${FRENCH_WEEKDAY[dayOfWeek]}`;
			const key = `${slug}:${cycle}`;

			const existing = bySlugCycle.get(key);
			if (!existing || day.date > existing.representativeDate) {
				bySlugCycle.set(key, {
					slug,
					season,
					weekOfSeason,
					dayOfWeek,
					cycle,
					representativeDate: day.date
				});
			}
		}
	}

	return [...bySlugCycle.values()].sort(
		(a, b) => a.slug.localeCompare(b.slug) || a.cycle.localeCompare(b.cycle)
	);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/prepare/weekdayFeasts.test.ts`
Expected: PASS (4 tests). This calls real Romcal computation (no mocking), matching the existing convention in `tests/unit/prepare/calendrier-dates.test.ts`.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write scripts/prepare/weekdayFeasts.ts tests/unit/prepare/weekdayFeasts.test.ts
git add scripts/prepare/weekdayFeasts.ts tests/unit/prepare/weekdayFeasts.test.ts
git commit -m "feat(calendrier): enumerate weekday targets via romcal"
```

---

## Task 5: Widen `readingsKey` and `CalendrierDateRow` for weekdays

**Files:**
- Modify: `scripts/prepare/calendrier.ts` (the `readingsKey` function and `CalendrierDateRow` interface)
- Modify: `src/lib/data/types.ts` (mirror of `CalendrierDateRow`)
- Test: `tests/unit/prepare/calendrier.test.ts` (create if it doesn't exist, otherwise add to it — check first with `ls tests/unit/prepare/calendrier.test.ts`)

**Interfaces:**
- Produces: `readingsKey(slug: string, cycleKey?: 'a' | 'b' | 'c' | 'I' | 'II'): string` (widened), `CalendrierDateRow.corpus: 'year' | 'fixed' | 'weekday'`, `CalendrierDateRow.cycle?: 'I' | 'II'`.

- [ ] **Step 1: Check for an existing test file**

Run: `ls tests/unit/prepare/calendrier.test.ts 2>&1`

If it exists, read it first and add the new tests to its existing `describe('readingsKey', ...)` block (or create one). If it doesn't exist, create it fresh with just the block below.

- [ ] **Step 2: Write the failing test**

```typescript
// tests/unit/prepare/calendrier.test.ts
import { describe, it, expect } from 'vitest';
import { readingsKey } from '../../../scripts/prepare/calendrier';

describe('readingsKey', () => {
	it('returns the bare slug with no cycle key', () => {
		expect(readingsKey('la-solennite-de-saint-joseph')).toBe('la-solennite-de-saint-joseph');
	});

	it('prefixes with the année key for Sunday/feast slugs', () => {
		expect(readingsKey('deuxieme-dimanche-de-lavent', 'b')).toBe('b:deuxieme-dimanche-de-lavent');
	});

	it('prefixes with the weekday cycle key for ferial slugs', () => {
		expect(readingsKey('ordinaire-22-lundi', 'I')).toBe('I:ordinaire-22-lundi');
		expect(readingsKey('ordinaire-22-lundi', 'II')).toBe('II:ordinaire-22-lundi');
	});
});
```

- [ ] **Step 3: Run the test to verify it fails (type error)**

Run: `npx vitest run tests/unit/prepare/calendrier.test.ts`
Expected: FAIL — TypeScript rejects `'I'`/`'II'` as arguments to `readingsKey`'s current `yearKey?: 'a' | 'b' | 'c'` parameter.

- [ ] **Step 4: Widen the types**

In `scripts/prepare/calendrier.ts`, change:

```typescript
export interface CalendrierDateRow {
	date: string; // ISO yyyy-mm-dd
	slug: string;
	corpus: 'year' | 'fixed';
	yearKey?: 'a' | 'b' | 'c'; // present when corpus === 'year'
	liturgicalColor: LiturgicalColor;
}
```

to:

```typescript
export interface CalendrierDateRow {
	date: string; // ISO yyyy-mm-dd
	slug: string;
	corpus: 'year' | 'fixed' | 'weekday';
	yearKey?: 'a' | 'b' | 'c'; // present when corpus === 'year'
	cycle?: 'I' | 'II'; // present when corpus === 'weekday'
	liturgicalColor: LiturgicalColor;
}
```

and change:

```typescript
export function readingsKey(slug: string, yearKey?: 'a' | 'b' | 'c'): string {
	return yearKey ? `${yearKey}:${slug}` : slug;
}
```

to:

```typescript
export function readingsKey(slug: string, cycleKey?: 'a' | 'b' | 'c' | 'I' | 'II'): string {
	return cycleKey ? `${cycleKey}:${slug}` : slug;
}
```

Update the doc comment above `CalendrierReadingsFile` (currently says
`"{yearKey}:{slug}" for a annee-scoped Sunday/feast`) to also mention the
`"{cycle}:{slug}"` weekday form.

In `src/lib/data/types.ts`, find the mirrored `CalendrierDateRow` interface
(search for `export interface CalendrierDateRow`) and apply the identical
change:

```typescript
export interface CalendrierDateRow {
	date: string;
	slug: string;
	corpus: 'year' | 'fixed' | 'weekday';
	yearKey?: CalendrierYearKey;
	cycle?: 'I' | 'II';
	liturgicalColor: LiturgicalColor;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/unit/prepare/calendrier.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Typecheck the whole project**

Run: `npm run check`
Expected: 0 errors (this touches a widely-used shared type — confirm no other file constructed a `CalendrierDateRow` or called `readingsKey` in a way that breaks).

- [ ] **Step 7: Format and commit**

```bash
npx prettier --write scripts/prepare/calendrier.ts src/lib/data/types.ts tests/unit/prepare/calendrier.test.ts
git add scripts/prepare/calendrier.ts src/lib/data/types.ts tests/unit/prepare/calendrier.test.ts
git commit -m "feat(calendrier): widen readingsKey and CalendrierDateRow for weekday cycles"
```

---

## Task 6: Extend `fetch-aelf.ts` with weekday targets

**Files:**
- Modify: `scripts/fetch-aelf.ts`

**Interfaces:**
- Consumes: `buildWeekdayTargets` (Task 4), `readingsKey` (Task 5), `pickMesse` (existing, unchanged).

This script is run manually and hits the network (not part of `prebuild`,
same as today) — there is no automated test for the network loop itself,
matching the existing file's convention (it has no test today either). The
change is additive: existing Sunday/fixed-feast behavior is untouched.

- [ ] **Step 1: Read the current file to find the exact insertion point**

Run: `sed -n '1,60p' scripts/fetch-aelf.ts` (re-read the full existing loop before editing — it was last shown in full during the design conversation; confirm it hasn't drifted before patching).

- [ ] **Step 2: Add the weekday target loop**

Add this import near the top, alongside the existing imports:

```typescript
import { buildWeekdayTargets } from './prepare/weekdayFeasts.ts';
```

After the existing `for (const { slug, yearKey } of targets) { ... }` loop
(the Sunday/fixed-feast loop) finishes and before the `if (failures.length > 0)`
check, add a second, simpler loop for weekdays — no candidate-retry logic is
needed since `buildWeekdayTargets` already picked an unambiguous past date:

```typescript
const weekdayTargets = await buildWeekdayTargets(
	DATE_RANGE_START_YEAR,
	DATE_RANGE_END_YEAR,
	today
);

for (const { slug, cycle, representativeDate } of weekdayTargets) {
	const key = readingsKey(slug, cycle);
	let res: Response;
	try {
		res = await fetch(`https://api.aelf.org/v1/messes/${representativeDate}/${ZONE}`);
	} catch {
		failures.push(`${key}: network error fetching ${representativeDate}`);
		await sleep(REQUEST_DELAY_MS);
		continue;
	}
	await sleep(REQUEST_DELAY_MS);
	if (!res.ok) {
		failures.push(`${key}: AELF returned ${res.status} for ${representativeDate}`);
		continue;
	}

	let body: AelfResponseBody;
	try {
		body = (await res.json()) as AelfResponseBody;
	} catch {
		failures.push(`${key}: unparseable AELF response for ${representativeDate}`);
		continue;
	}

	try {
		const { messe, warning } = pickMesse(body.messes ?? [], key);
		if (warning) console.warn(warning);
		output[key] = { date: representativeDate, lectures: messe.lectures };
	} catch (err) {
		failures.push((err as Error).message);
	}
}
```

This needs `DATE_RANGE_START_YEAR`/`DATE_RANGE_END_YEAR` imported too — add
them to the existing `import type { ... } from './prepare/calendrier.ts'`
import's neighbor (they're already exported from
`scripts/prepare/calendrierDates.ts`, which `fetch-aelf.ts` does not
currently import — add:

```typescript
import { DATE_RANGE_START_YEAR, DATE_RANGE_END_YEAR } from './prepare/calendrierDates.ts';
```

- [ ] **Step 3: Manually verify with a small range (do not commit this test run)**

Run: `npx tsx --eval "
import { buildWeekdayTargets } from './scripts/prepare/weekdayFeasts.ts';
const targets = await buildWeekdayTargets(2024, 2024, '2024-12-31');
console.log(targets.length, targets[0]);
"`
Expected: prints a count > 0 and one sample target object. This confirms the
import wiring compiles and runs before doing a full, slow 2000-2035 fetch.

- [ ] **Step 4: Typecheck**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write scripts/fetch-aelf.ts
git add scripts/fetch-aelf.ts
git commit -m "feat(calendrier): fetch weekday reading text from AELF"
```

Note for whoever runs this live: `npm run fetch-aelf` now takes noticeably
longer (roughly 5x more targets than the Sunday-only run, at
`REQUEST_DELAY_MS = 200` each) — expect several minutes, not seconds.

---

## Task 7: Weekday feast builder (orchestrator)

**Files:**
- Create: `scripts/prepare/weekdayReadings.ts`
- Test: `tests/unit/prepare/weekdayReadings.test.ts`
- Test fixtures: reuse `tests/unit/prepare/concordance-matcher-fixtures/` (Task 2) and `tests/unit/prepare/cec-structure-fixture.json` (Task 3)

**Interfaces:**
- Consumes: `parseAelfRef` (Task 1), `matchConcordance` (Task 2), `buildHeadingLevels`/`clusterCitations` (Task 3), `CalendrierReadingsFile`/`CalendrierFeast`/`readingsKey` (existing + Task 5).
- Produces: `export function buildWeekdayFeast(slug: string, season: SeasonKey, liturgicalColor: LiturgicalColor, readings: CalendrierReading[], concordanceDir: string, levels: HeadingLevels): CalendrierFeast`.

This is the integration point the spec calls for: given one weekday's raw
AELF `lectures[]` (already-fetched, from `readings.json`), produce the final
`CalendrierFeast` with clusters. A weekday whose readings don't resolve to
any concordance hit is valid output with `clusters: []`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/prepare/weekdayReadings.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildWeekdayFeast } from '../../../scripts/prepare/weekdayReadings';
import { buildHeadingLevels, type CecStructureFile } from '../../../scripts/prepare/cecHeadingCluster';
import type { CalendrierReading } from '../../../scripts/prepare/calendrier';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONCORDANCE_DIR = join(HERE, 'concordance-matcher-fixtures');
const structure: CecStructureFile = JSON.parse(
	readFileSync(join(HERE, 'cec-structure-fixture.json'), 'utf8')
);
const levels = buildHeadingLevels(structure);

function reading(type: CalendrierReading['type'], ref: string): CalendrierReading {
	return { type, ref, contenu: '' };
}

describe('buildWeekdayFeast', () => {
	it('produces clusters from matched readings', () => {
		const feast = buildWeekdayFeast(
			'ordinaire-4-lundi',
			'ordinaire',
			'green',
			[reading('lecture_1', 'Ep 1, 1-10'), reading('evangile', 'Lc 4, 18-19')],
			CONCORDANCE_DIR,
			levels
		);
		expect(feast.slug).toBe('ordinaire-4-lundi');
		expect(feast.season).toBe('ordinaire');
		expect(feast.liturgicalColor).toBe('green');
		expect(feast.clusters.length).toBeGreaterThan(0);
		expect(feast.clusters.every((c) => c.paragraphs.length > 0)).toBe(true);
	});

	it('produces an empty clusters array when nothing matches, without throwing', () => {
		const feast = buildWeekdayFeast(
			'ordinaire-4-mardi',
			'ordinaire',
			'green',
			[reading('lecture_1', 'Gn 999, 1-5')],
			CONCORDANCE_DIR,
			levels
		);
		expect(feast.clusters).toEqual([]);
	});

	it('ignores readings with unparseable refs rather than failing the whole feast', () => {
		const feast = buildWeekdayFeast(
			'ordinaire-4-mercredi',
			'ordinaire',
			'green',
			[reading('lecture_1', 'not a real ref'), reading('evangile', 'Lc 4, 24')],
			CONCORDANCE_DIR,
			levels
		);
		expect(feast.clusters.length).toBeGreaterThan(0);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/prepare/weekdayReadings.test.ts`
Expected: FAIL with "Cannot find module '../../../scripts/prepare/weekdayReadings'"

- [ ] **Step 3: Implement the orchestrator**

```typescript
// scripts/prepare/weekdayReadings.ts
import type { CalendrierFeast, CalendrierReading, LiturgicalColor, SeasonKey } from './calendrier.ts';
import { parseAelfRef } from './concordanceRefParser.ts';
import { matchConcordance, type CccCitation } from './concordanceMatcher.ts';
import { clusterCitations, type HeadingLevels } from './cecHeadingCluster.ts';

/**
 * Builds one weekday's CalendrierFeast from its raw AELF readings, by
 * parsing each reading's ref, matching it against the archived concordance,
 * and clustering the union of citations by CCC heading. A reading whose ref
 * doesn't parse, or whose chapter isn't covered by the concordance,
 * contributes nothing - not an error, since psalm and first-reading
 * coverage is intentionally partial (see the design spec).
 */
export function buildWeekdayFeast(
	slug: string,
	season: SeasonKey,
	liturgicalColor: LiturgicalColor,
	readings: CalendrierReading[],
	concordanceDir: string,
	levels: HeadingLevels
): CalendrierFeast {
	const citations: CccCitation[] = [];
	for (const reading of readings) {
		if (!['lecture_1', 'psaume', 'evangile'].includes(reading.type)) continue;
		const parsed = parseAelfRef(reading.ref);
		if (!parsed) continue;
		citations.push(...matchConcordance(parsed, concordanceDir));
	}

	return {
		slug,
		title: slug,
		season,
		liturgicalColor,
		clusters: clusterCitations(citations, levels)
	};
}
```

Note: `title` is set to the raw slug here as a placeholder value - Task 8
overwrites it with a proper French display title when it calls this
function (e.g. "Lundi de la 4e semaine du Temps Ordinaire"), since title
formatting needs the season/week/weekday broken out, which
`buildWeekdayFeast` intentionally doesn't take as separate params (it only
needs the final slug string). Confirm Task 8 does this before treating the
feature as complete - `FeastBlock` renders `feast.title` directly, a raw
slug there would be a visible bug.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/prepare/weekdayReadings.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write scripts/prepare/weekdayReadings.ts tests/unit/prepare/weekdayReadings.test.ts
git add scripts/prepare/weekdayReadings.ts tests/unit/prepare/weekdayReadings.test.ts
git commit -m "feat(calendrier): build weekday CalendrierFeast from concordance clusters"
```

---

## Task 8: Wire the pipeline into `prepareCalendrier()` and `dates-index.json`

**Files:**
- Modify: `scripts/prepare/calendrier.ts` (the `prepareCalendrier` export)
- Modify: `scripts/prepare/calendrierDates.ts` (`buildCalendrierDates` — add weekday rows)
- Test: `tests/unit/prepare/calendrier-dates.test.ts` (extend the existing file)

**Interfaces:**
- Consumes: `buildWeekdayTargets` (Task 4), `buildWeekdayFeast` (Task 7), `buildHeadingLevels` (Task 3), `readingsFilename`/`readingsKey` (Task 5).
- Produces: `feries-i.json` / `feries-ii.json` written to the calendrier output dir; `dates-index.json` rows with `corpus: 'weekday'`.

- [ ] **Step 1: Read the current `prepareCalendrier` function in full**

Run: `sed -n '1,400p' scripts/prepare/calendrier.ts` and locate the exported
`prepareCalendrier({ sourceDir, outDir })` function (near the end of the
file, per the earlier design conversation) — read it completely before
editing, since this task adds a new phase after the existing Sunday/fixed
build without disturbing it.

- [ ] **Step 2: Write the failing test (weekday rows in the dates join)**

Add to `tests/unit/prepare/calendrier-dates.test.ts` (it currently tests
`buildCalendrierDates(yearFiles, fixedFeasts)` — this task changes its
signature to also accept weekday targets, so existing calls in that file
need a third argument added; read the file first, then add the new test
alongside the existing ones):

```typescript
import { buildWeekdayTargets } from '../../../scripts/prepare/weekdayFeasts';

// ... inside the existing describe block, or a new one:
it('includes weekday rows with corpus "weekday" and a cycle', async () => {
	const weekdayTargets = await buildWeekdayTargets(2024, 2024, '2024-12-31');
	const { rows } = await buildCalendrierDates(yearFiles, [], weekdayTargets);
	const weekdayRows = rows.filter((r) => r.corpus === 'weekday');
	expect(weekdayRows.length).toBeGreaterThan(0);
	for (const r of weekdayRows) {
		expect(['I', 'II']).toContain(r.cycle);
		expect(r.yearKey).toBeUndefined();
	}
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/unit/prepare/calendrier-dates.test.ts`
Expected: FAIL — `buildCalendrierDates` doesn't accept a third argument yet,
and existing calls elsewhere in the same test file will also fail to
typecheck once the signature changes in Step 4. Fix those existing call
sites in the same edit (pass `[]` for `weekdayTargets` where the test isn't
about weekdays).

- [ ] **Step 4: Extend `buildCalendrierDates`**

In `scripts/prepare/calendrierDates.ts`, change the signature:

```typescript
export async function buildCalendrierDates(
	yearFiles: CalendrierYearFile[],
	fixedFeasts: CalendrierFixedFeast[],
	weekdayTargets: WeekdayTarget[] = []
): Promise<CalendrierDatesJoinResult> {
```

(add `import type { WeekdayTarget } from './weekdayFeasts.ts';` at the top).

Inside the existing `for (let year = DATE_RANGE_START_YEAR; ...)` loop,
after the fixed-feast block (right before the loop's closing brace, so it
runs once per year alongside the Sunday/fixed logic already there), add:

```typescript
const bySlugCycle = new Map(weekdayTargets.map((t) => [`${t.slug}:${t.cycle}`, t]));
for (const day of days) {
	if (day.rank !== Ranks.Weekday) continue;
	const dayOfWeek = day.calendar.dayOfWeek;
	const weekOfSeason = day.calendar.weekOfSeason;
	if (dayOfWeek === undefined || dayOfWeek === 0 || weekOfSeason === undefined) continue;
	const romcalSeason = day.seasons[0];
	const season = romcalSeason ? ROMCAL_SEASON_TO_OURS[romcalSeason] : undefined;
	if (!season) continue;
	const cycle: 'I' | 'II' = day.cycles.weekdayCycle === 'YEAR_1' ? 'I' : 'II';
	const slug = `${season}-${weekOfSeason}-${FRENCH_WEEKDAY[dayOfWeek]}`;
	if (!bySlugCycle.has(`${slug}:${cycle}`)) continue; // no fetched reading for this combo

	rows.push({
		date: day.date,
		slug,
		corpus: 'weekday',
		cycle,
		liturgicalColor: ROMCAL_COLOR_TO_OURS[day.colors[0] ?? 'WHITE'] ?? 'white'
	});
}
```

This duplicates the `FRENCH_WEEKDAY`/`ROMCAL_SEASON_TO_OURS` maps and the
slug-formatting logic already written in `weekdayFeasts.ts` (Task 4).
**Deduplicate this**: move both `const` maps and a shared
`weekdaySlug(season, weekOfSeason, dayOfWeek)` helper into
`weekdayFeasts.ts` as named exports, and import them here instead of
re-declaring — `weekdayFeasts.ts` already owns this mapping and
`calendrierDates.ts` already imports `WeekdayTarget` from it, so this is a
same-file addition to an existing import, not a new dependency.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/unit/prepare/calendrier-dates.test.ts`
Expected: PASS (all existing tests plus the new one).

- [ ] **Step 6: Wire `prepareCalendrier()` to write the weekday feast files**

In `scripts/prepare/calendrier.ts`'s `prepareCalendrier()`, after the
existing code that writes `annee-a/b/c.json` and before the final
`buildCalendrierDates`/`dates-index.json` write, add:

```typescript
import { buildWeekdayTargets } from './weekdayFeasts.ts';
import { buildWeekdayFeast } from './weekdayReadings.ts';
import { buildHeadingLevels, type CecStructureFile } from './cecHeadingCluster.ts';
import { readingsKey, readingsFilename } from './calendrier.ts'; // already local, no new import needed

// ... inside prepareCalendrier, after reading readings.json into `readings`:
const structurePath = join(sourceDir, '..', '..', 'static', 'data', 'cec', 'structure.json');
const structure: CecStructureFile = JSON.parse(readFileSync(structurePath, 'utf8'));
const levels = buildHeadingLevels(structure);
const concordanceDir = join(sourceDir, '..', '..', 'data-archive', 'concordance');

const today = new Date().toISOString().slice(0, 10);
const weekdayTargets = await buildWeekdayTargets(DATE_RANGE_START_YEAR, DATE_RANGE_END_YEAR, today);

for (const cycleKey of ['I', 'II'] as const) {
	const feasts = weekdayTargets
		.filter((t) => t.cycle === cycleKey)
		.map((t) => {
			const entry = readings[readingsKey(t.slug, cycleKey)];
			if (!entry) return null;
			return buildWeekdayFeast(
				t.slug,
				t.season,
				colorsBySlug.get(t.slug) ?? 'green',
				entry.lectures,
				concordanceDir,
				levels
			);
		})
		.filter((f): f is NonNullable<typeof f> => f !== null);

	writeFileSync(
		join(outDir, `feries-${cycleKey.toLowerCase()}.json`),
		JSON.stringify({ key: cycleKey, feasts }, null, '\t') + '\n'
	);
}
```

This is written as an integration sketch against code you'll be reading
live in Step 1 — the exact variable names for `readings`, `outDir`,
`sourceDir`, and `colorsBySlug` in the surrounding function must match
what's actually there (read it first, per Step 1, and adjust names to
match rather than assuming these are exactly right). The **shape** of what
gets written (`feries-i.json`/`feries-ii.json`, `{key, feasts}`) is the
firm requirement.

Also update the call to `buildCalendrierDates(...)` a few lines below to
pass `weekdayTargets` as the third argument.

- [ ] **Step 7: Verify the full build**

Run: `npm run prepare-data` — if it reports "skipping rebuild" (missing
source symlinks, a known limitation of this environment per project
history), instead verify with a small standalone script:

```bash
npx tsx --eval "
import { prepareCalendrier } from './scripts/prepare/calendrier.ts';
await prepareCalendrier({
  sourceDir: './scripts/data-sources/calendrier',
  outDir: '/tmp/calendrier-weekday-check'
});
"
ls /tmp/calendrier-weekday-check/feries-i.json /tmp/calendrier-weekday-check/feries-ii.json
python3 -c "import json; d=json.load(open('/tmp/calendrier-weekday-check/feries-i.json')); print(len(d['feasts']), d['feasts'][0])"
```

Expected: both files exist, non-zero feast count, and the sample feast has
a real `title` (not a raw slug — if it is a raw slug, Task 9 hasn't
happened yet or was skipped; flag it, don't silently proceed).

- [ ] **Step 8: Typecheck and run the full unit suite**

Run: `npm run check && npx vitest run`
Expected: 0 errors, all tests green.

- [ ] **Step 9: Format and commit**

```bash
npx prettier --write scripts/prepare/calendrier.ts scripts/prepare/calendrierDates.ts scripts/prepare/weekdayFeasts.ts tests/unit/prepare/calendrier-dates.test.ts
git add scripts/prepare/calendrier.ts scripts/prepare/calendrierDates.ts scripts/prepare/weekdayFeasts.ts tests/unit/prepare/calendrier-dates.test.ts
git commit -m "feat(calendrier): wire weekday readings into prepareCalendrier and dates-index"
```

---

## Task 9: Weekday title formatting

**Files:**
- Modify: `scripts/prepare/weekdayReadings.ts` (or a new small `weekdayTitle.ts` if `buildWeekdayFeast`'s file is getting crowded — your call at implementation time, either is fine)
- Test: `tests/unit/prepare/weekdayReadings.test.ts` (extend)

**Interfaces:**
- Produces: `export function formatWeekdayTitle(season: SeasonKey, weekOfSeason: number, dayOfWeek: number): string`.

Flagged as a loose end in Task 7: `buildWeekdayFeast` currently sets
`title` to the raw slug. This task fixes that with real French liturgical
titles, e.g. `ordinaire-4-lundi` → `"Lundi de la 4e semaine du Temps
Ordinaire"`, `careme-2-mardi` → `"Mardi de la 2e semaine de Carême"`,
`avent-1-mercredi` → `"Mercredi de la 1re semaine de l'Avent"`.

- [ ] **Step 1: Write the failing test**

```typescript
// add to tests/unit/prepare/weekdayReadings.test.ts
import { formatWeekdayTitle } from '../../../scripts/prepare/weekdayReadings';

describe('formatWeekdayTitle', () => {
	it('formats an ordinary-time weekday', () => {
		expect(formatWeekdayTitle('ordinaire', 4, 1)).toBe('Lundi de la 4e semaine du Temps Ordinaire');
	});

	it('formats week 1 with the French "1re" ordinal, not "1e"', () => {
		expect(formatWeekdayTitle('avent', 1, 3)).toBe("Mercredi de la 1re semaine de l'Avent");
	});

	it('formats Lent', () => {
		expect(formatWeekdayTitle('careme', 2, 2)).toBe('Mardi de la 2e semaine de Carême');
	});

	it('formats Easter time', () => {
		expect(formatWeekdayTitle('pascal', 3, 6)).toBe('Samedi de la 3e semaine du Temps Pascal');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/prepare/weekdayReadings.test.ts`
Expected: FAIL — `formatWeekdayTitle` is not exported yet.

- [ ] **Step 3: Implement it**

Add to `scripts/prepare/weekdayReadings.ts`:

```typescript
const FRENCH_WEEKDAY_TITLE: Record<number, string> = {
	1: 'Lundi',
	2: 'Mardi',
	3: 'Mercredi',
	4: 'Jeudi',
	5: 'Vendredi',
	6: 'Samedi'
};

const SEASON_LABEL: Record<SeasonKey, string> = {
	avent: "de l'Avent",
	noel: 'du Temps de Noël',
	careme: 'de Carême',
	pascal: 'du Temps Pascal',
	solennite: '',
	ordinaire: 'du Temps Ordinaire'
};

function frenchOrdinal(n: number): string {
	return n === 1 ? '1re' : `${n}e`;
}

export function formatWeekdayTitle(season: SeasonKey, weekOfSeason: number, dayOfWeek: number): string {
	const day = FRENCH_WEEKDAY_TITLE[dayOfWeek] ?? '';
	const seasonLabel = SEASON_LABEL[season];
	return `${day} de la ${frenchOrdinal(weekOfSeason)} semaine ${seasonLabel}`.trim();
}
```

Then update `buildWeekdayFeast` in `scripts/prepare/weekdayReadings.ts` to
take `weekOfSeason` and `dayOfWeek` and compute `title` from them instead of
the raw slug:

```typescript
export function buildWeekdayFeast(
	slug: string,
	season: SeasonKey,
	weekOfSeason: number,
	dayOfWeek: number,
	liturgicalColor: LiturgicalColor,
	readings: CalendrierReading[],
	concordanceDir: string,
	levels: HeadingLevels
): CalendrierFeast {
	const citations: CccCitation[] = [];
	for (const reading of readings) {
		if (!['lecture_1', 'psaume', 'evangile'].includes(reading.type)) continue;
		const parsed = parseAelfRef(reading.ref);
		if (!parsed) continue;
		citations.push(...matchConcordance(parsed, concordanceDir));
	}

	return {
		slug,
		title: formatWeekdayTitle(season, weekOfSeason, dayOfWeek),
		season,
		liturgicalColor,
		clusters: clusterCitations(citations, levels)
	};
}
```

Update the three Task 7 tests in `tests/unit/prepare/weekdayReadings.test.ts`
to pass the two new arguments (insert `weekOfSeason, dayOfWeek` after
`season` in every `buildWeekdayFeast(...)` call — e.g. the first test
becomes `buildWeekdayFeast('ordinaire-4-lundi', 'ordinaire', 4, 1, 'green', [...], CONCORDANCE_DIR, levels)`), and add an assertion that `title` is no
longer the raw slug:

```typescript
expect(feast.title).toBe('Lundi de la 4e semaine du Temps Ordinaire');
```

And update the call site written in Task 8 Step 6 from:

```typescript
return buildWeekdayFeast(
	t.slug,
	t.season,
	colorsBySlug.get(t.slug) ?? 'green',
	entry.lectures,
	concordanceDir,
	levels
);
```

to:

```typescript
return buildWeekdayFeast(
	t.slug,
	t.season,
	t.weekOfSeason,
	t.dayOfWeek,
	colorsBySlug.get(t.slug) ?? 'green',
	entry.lectures,
	concordanceDir,
	levels
);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/prepare/weekdayReadings.test.ts`
Expected: PASS (all tests, including the 3 from Task 7 which must still
pass after the signature change).

- [ ] **Step 5: Typecheck**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 6: Format and commit**

```bash
npx prettier --write scripts/prepare/weekdayReadings.ts tests/unit/prepare/weekdayReadings.test.ts scripts/prepare/calendrier.ts
git add scripts/prepare/weekdayReadings.ts tests/unit/prepare/weekdayReadings.test.ts scripts/prepare/calendrier.ts
git commit -m "feat(calendrier): give weekday feasts real French titles"
```

---

## Task 10: Frontend wiring — loader, resolver, empty-cluster check

**Files:**
- Modify: `src/lib/data/loaders.ts` (add `loadCalendrierFeries`)
- Modify: `src/lib/utils/calendrierDateLookup.ts` (`resolveFeastForRow`'s weekday branch)
- Test: `tests/unit/utils/calendrierDateLookup.test.ts` (extend existing file)
- Verify only (fix if broken): `src/lib/components/calendrier/FeastBlock.svelte` with `clusters: []`

**Interfaces:**
- Consumes: `CalendrierDateRow.corpus === 'weekday'` / `.cycle` (Task 5), `feries-i.json`/`feries-ii.json` shape (Task 8, `{key: 'I'|'II', feasts: CalendrierFeast[]}`, same as `CalendrierYearFile`).
- Produces: `export function loadCalendrierFeries(cycle: 'I' | 'II', fetcher?: Fetch): Promise<CalendrierYearFile>`.

- [ ] **Step 1: Add the loader**

In `src/lib/data/loaders.ts`, next to the existing `loadCalendrierYear`
(read it first for the exact caching pattern to mirror):

```typescript
const calendrierFeriesCache = new Map<'I' | 'II', Promise<CalendrierYearFile>>();

export function loadCalendrierFeries(
	cycle: 'I' | 'II',
	fetcher: Fetch = fetch
): Promise<CalendrierYearFile> {
	let p = calendrierFeriesCache.get(cycle);
	if (!p) {
		p = fetchJson<CalendrierYearFile>(`/data/calendrier/feries-${cycle.toLowerCase()}.json`, fetcher);
		calendrierFeriesCache.set(cycle, p);
	}
	return p;
}
```

(`CalendrierYearFile`'s `key` field is typed `CalendrierYearKey` today,
i.e. `'a' | 'b' | 'c'` — the `feries-i.json`/`feries-ii.json` files reuse
the same `{key, feasts}` shape structurally but with `'I' | 'II'` in
`key`. Since `loadCalendrierFeries`'s return type only needs `.feasts` from
callers, this structural mismatch on `.key` is harmless in practice, but
run `npm run check` after this task to confirm TypeScript agrees — if it
doesn't, widen `CalendrierYearFile.key` to `CalendrierYearKey | 'I' | 'II'`
in both `scripts/prepare/calendrier.ts` and `src/lib/data/types.ts`, same
mirrored-type pattern as Task 5.)

- [ ] **Step 2: Write the failing test for the resolver**

Read `tests/unit/utils/calendrierDateLookup.test.ts` first (it already has
4 `CalendrierDateRow` fixtures per the earlier session's work — match its
existing style). Add:

```typescript
it('resolves a weekday row via loadCalendrierFeries', async () => {
	const fixedFeasts: CalendrierFixedFeast[] = [];
	const row: CalendrierDateRow = {
		date: '2026-01-12',
		slug: 'ordinaire-2-lundi',
		corpus: 'weekday',
		cycle: 'II',
		liturgicalColor: 'green'
	};
	const mockFetch = (async () =>
		new Response(
			JSON.stringify({
				key: 'II',
				feasts: [
					{
						slug: 'ordinaire-2-lundi',
						title: 'Lundi de la 2e semaine du Temps Ordinaire',
						season: 'ordinaire',
						liturgicalColor: 'green',
						clusters: []
					}
				]
			})
		)) as unknown as typeof fetch;
	const feast = await resolveFeastForRow(row, fixedFeasts, mockFetch);
	expect(feast?.slug).toBe('ordinaire-2-lundi');
});
```

This requires `resolveFeastForRow` to accept an optional `fetcher` param
threaded through to `loadCalendrierFeries`/`loadCalendrierYear` — check
whether it already does (the existing signature shown earlier in the
design conversation was `resolveFeastForRow(row, fixedFeasts)` with no
fetcher param, relying on `loadCalendrierYear`'s own `fetcher: Fetch =
fetch` default). If it doesn't thread a fetcher today, either add one
(matches this test) or write the test instead using a real `fetch` against
a local dev server — prefer adding the fetcher param, it's the smaller,
more testable change and matches every other loader's existing
`fetcher: Fetch = fetch` convention.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/unit/utils/calendrierDateLookup.test.ts`
Expected: FAIL — no `corpus === 'weekday'` branch exists yet in
`resolveFeastForRow`.

- [ ] **Step 4: Implement the branch**

In `src/lib/utils/calendrierDateLookup.ts`:

```typescript
export async function resolveFeastForRow(
	row: CalendrierDateRow,
	fixedFeasts: (CalendrierFeast | CalendrierFixedFeast)[],
	fetcher: Fetch = fetch
): Promise<CalendrierFeast | CalendrierFixedFeast | null> {
	if (row.corpus === 'fixed') {
		return fixedFeasts.find((f) => f.slug === row.slug) ?? null;
	}
	if (row.corpus === 'weekday') {
		const feries = await loadCalendrierFeries(row.cycle as 'I' | 'II', fetcher);
		return feries.feasts.find((f) => f.slug === row.slug) ?? null;
	}
	const year = await loadCalendrierYear(row.yearKey as CalendrierYearKey, fetcher);
	return year.feasts.find((f) => f.slug === row.slug) ?? null;
}
```

Add `loadCalendrierFeries` to the existing `import { loadCalendrierYear } from '$lib/data/loaders';` line, and add `Fetch` to whatever
that type import already is (check `loaders.ts` for where `Fetch` is
exported from — it's used as the type of `fetcher` throughout that file).

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/unit/utils/calendrierDateLookup.test.ts`
Expected: PASS (existing tests plus the new one).

- [ ] **Step 6: Verify `FeastBlock` degrades sensibly with zero clusters**

This was flagged as unverified in the spec. Read
`src/lib/components/calendrier/FeastBlock.svelte` and check what it renders
when `feast.clusters` is `[]` (look for how the clusters list / "Tout
ouvrir" button / empty state is templated). If it renders an empty list
with no broken layout (e.g. the "Tout ouvrir" button simply has nothing to
toggle, no error), no code change is needed — write a short Playwright or
component-level check confirming this rather than guessing:

```typescript
// tests/e2e/calendrier-weekday-empty-clusters.test.ts
import { test, expect } from '@playwright/test';

test('a weekday with zero CCC clusters renders without error', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto('/calendrier');
	// Exercise via the picker: pick any date, then assert no console error
	// fired regardless of whether that specific day has clusters - the
	// contract under test is "empty clusters never throws", not a specific
	// date's content.
	const picker = page.locator('.picker-card');
	await picker.scrollIntoViewIfNeeded();
	await picker.getByRole('button', { name: /^\d+$/ }).first().click();
	await expect(page.locator('.picked-card')).toBeVisible();
	expect(errors).toEqual([]);
});
```

If `FeastBlock` does break on an empty array (e.g. shows a stray heading
with nothing under it, or the "Tout ouvrir" button is present but
misleadingly implies content exists), fix it minimally — likely a `{#if
feast.clusters.length > 0}` guard around whatever cluster-list chrome
currently renders unconditionally. Don't guess the fix without reading the
component first.

- [ ] **Step 7: Typecheck and run the full suite**

Run: `npm run check && npx vitest run`
Expected: 0 errors, all tests green.

- [ ] **Step 8: Format and commit**

```bash
npx prettier --write src/lib/data/loaders.ts src/lib/utils/calendrierDateLookup.ts tests/unit/utils/calendrierDateLookup.test.ts tests/e2e/calendrier-weekday-empty-clusters.test.ts
git add src/lib/data/loaders.ts src/lib/utils/calendrierDateLookup.ts tests/unit/utils/calendrierDateLookup.test.ts tests/e2e/calendrier-weekday-empty-clusters.test.ts
git commit -m "feat(calendrier): resolve weekday feasts on the frontend"
```

---

## Final verification (not a task — run after Task 10)

- [ ] `npm run check` — 0 errors
- [ ] `npx vitest run` — all unit tests green
- [ ] `npm run lint` — clean
- [ ] Manually run `npm run fetch-aelf` once (slow — see Task 6's note) to
      populate `scripts/data-sources/calendrier/readings.json` with real
      weekday content, then run `npm run prepare-data` (or the standalone
      `prepareCalendrier` script from Task 8 Step 7) and spot-check a few
      `feries-i.json`/`feries-ii.json` entries by eye for plausibility —
      this plan's fixtures prove the pipeline is correct in isolation, but
      only a real end-to-end run proves the whole thing together.
- [ ] `npm run test:e2e -- calendrier` — existing calendrier e2e tests still
      pass (the picker now matches far more days than before; re-check
      `tests/e2e/calendrier-picker.test.ts`'s clamped-navigation test still
      makes sense against the denser calendar).
