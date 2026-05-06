# Concordance Pericope-View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use `- [ ]` syntax for tracking.

**Goal:** Replace the per-verse concordance pill system (currently on `main`) with a pericope-grouped view at `/bible/[book]/[ch]/concordance`, mirroring the DR website's Fathers system. Add a Concordance tab to the CCC paragraph StudyPanel.

**Architecture:**

A sibling route `/bible/[book]/[ch]/concordance` renders a split-pane (left: verses with pericope headers; right: pericope cards with CCC chips). Per-chapter JSON files at `static/data/concordance/[slug]/[chapter].json` plus a `manifest.json` (mirroring DR's `static/data/fathers/` structure). Pericope titles come from native French section markers in the existing NCL Bible XML — `<s style="s1">` elements give us 1,122 idiomatic Catholic French titles for free, no translation step needed. A second output `by-paragraph.json` powers the new `TabConcordance` panel on `/ccc/[ref]`.

The current per-verse architecture (M1-M5/N1-N5/O1-O3 from the prior plan) is reverted in a single early commit, then the new direction is built forward. Components are direct ports of DR Fathers components (`ConcordanceReader`, `ConcordanceVerseList`, `ConcordancePericopePanel`, `ConcordancePericopeCard`).

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, TypeScript strict, Tailwind 3, vitest + Playwright. NCL XML parsing via the existing `parseUSFX` helper.

---

## Tooling Reference

(Same conventions as the prior plan at `docs/superpowers/plans/2026-05-03-concordance.md` — Svelte 5 runes only, types in `src/lib/data/types.ts`, tests under `tests/unit/` and `tests/e2e/`, French NBSP rules, conventional-commit prefixes, no `Co-Authored-By` lines.)

### DR Fathers reference (read before any UI task)

Before touching UI, READ these files in `/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible/src/`:

- `lib/data/fathers-types.ts` — type shape (will mirror with simplified field set)
- `lib/components/FathersReader.svelte` — split-pane shell, owns selectedVerse/selectedPericope state
- `lib/components/FathersVerseList.svelte` — left pane: pericope headers injected before startVerse
- `lib/components/FathersCommentaryPanel.svelte` — right pane: pericope sections, sticky headers, lazy IntersectionObserver
- `routes/fathers/[book]/[chapter]/+page.ts` and `+page.svelte` — route entry
- `scripts/build-fathers-data.ts` — data-build pattern

Components are **direct ports** with the prefix `Concordance` and a simplified data shape (no author/era/footnotes). Don't reinvent the architecture.

### Project NCL XML

`scripts/data-sources/ncl/francl_usfx.xml` is a 30 MB USFX file. Section titles look like:

```xml
<c id="3" /><s style="s1">La faute et le châtiment
</s>
<p style="p"><v id="1" bcv="GEN.3.1" /><w s="H6213">Le</w>
```

Each `<s style="s1">` belongs to the most recent `<c id>` chapter and the `<v id>` verse following it. The book ID comes from the surrounding `<book id="GEN">` or from the `bcv="GEN.3.1"` attribute on the next `<v>`. 1,122 sections across 73 books.

The existing `scripts/prepare/ncl.ts` already parses USFX into the bible-text JSON; we won't touch that. We add a separate `ncl-sections.ts` that runs the same XML through a streaming parser (or regex extraction — the file is well-structured).

---

## File Structure

### Reverts (one early commit)

Replace these files with their pre-`feat/concordance` content from `git show main:...` is not workable since `feat/concordance` is already merged. Instead, **edit forward** to remove the per-verse concordance bits:

- `src/lib/components/bible/VerseMarker.svelte` — drop `variant` prop and dotted styles, restore the single solid-pill version
- `src/lib/components/bible/ChapterFilterBar.svelte` — drop `showConcordance` and `concordanceCount`, restore single-toggle version
- `src/lib/components/bible/BibleReader.svelte` — drop `concordanceIdx` prop, dual-pill rendering, dim logic considering both
- `src/lib/components/panels/StudyPanel.svelte` — drop the tab-label switch on `verseSource`
- `src/lib/components/panels/TabBibleVerse.svelte` — drop `verseSource` branching, restore single-loader version
- `src/lib/stores/studyPanel.ts` — drop optional `verseSource` field
- `src/lib/data/types.ts` — drop `ConcordanceVerseIndex` type alias
- `src/lib/data/loaders.ts` — drop `loadConcordanceVerseIndex`, drop the concordance promise cache
- `src/routes/bible/[book=biblebook]/[ch]/+page.ts` — drop concordance fetch
- `src/routes/bible/[book=biblebook]/[ch]/+page.svelte` — drop `concordanceIdx` prop pass-through
- `tests/e2e/concordance-toggle.test.ts` — delete (replaced in V2)
- `static/data/ccc/concordance-verse-index.json` — leave alone; the next data build replaces it

### New files

**Data build:**

- `scripts/prepare/ncl-sections.ts` — extracts French section titles from USFX
- `tests/unit/prepare/ncl-sections.test.ts`
- `scripts/prepare/concordance.ts` — REWRITTEN to emit per-chapter pericope files + by-paragraph + manifest
- `tests/unit/prepare/concordance.test.ts` — REWRITTEN for the new shape (small fixtures preserved)
- `scripts/prepare-data.ts` — wire ncl-sections + new concordance steps

**Types & loaders:**

- `src/lib/data/types.ts` — add `NclSection`, `ConcordancePericope`, `ConcordanceChapter`, `ConcordanceByParagraphEntry`
- `src/lib/data/loaders.ts` — add `loadConcordanceChapter(slug, ch)`, `loadConcordanceByParagraph()`, `loadConcordanceManifest()`

**Route:**

- `src/routes/bible/[book=biblebook]/[ch]/concordance/+page.ts`
- `src/routes/bible/[book=biblebook]/[ch]/concordance/+page.svelte`

**Components:**

- `src/lib/components/bible/concordance/ConcordanceBar.svelte` — chapter-nav header with link back to reading view
- `src/lib/components/bible/concordance/ConcordanceReader.svelte` — split-pane shell
- `src/lib/components/bible/concordance/ConcordanceVerseList.svelte` — left pane
- `src/lib/components/bible/concordance/ConcordancePericopePanel.svelte` — right pane
- `src/lib/components/bible/concordance/ConcordancePericopeCard.svelte` — individual pericope card
- `src/lib/components/panels/TabConcordance.svelte` — CCC StudyPanel tab

**Reading-page link:**

- `src/lib/components/bible/BibleReader.svelte` — add a small button at the top: _"Voir la concordance"_ → `/bible/{slug}/{ch}/concordance`. Hidden when no concordance data for this chapter (`manifest`-based check).

**Tests:**

- `tests/e2e/concordance-pericope.test.ts` — replaces the deleted toggle test

---

## Section R — Reverts

### Task R1: Revert per-verse concordance UI in one commit

**Files (all edits in one commit):**

- Modify: every file listed under "Reverts" above (10 modified, 1 deleted)

- [ ] **Step 1: Read `git log main..HEAD --oneline`** to get the SHA range you'll be undoing. Then `git show <merge-sha>` for the merged feature to see exactly what landed.

- [ ] **Step 2: Edit each file to remove the concordance-specific additions**, restoring the pre-feature shape but keeping any unrelated improvements. Specifically:

For `src/lib/components/bible/VerseMarker.svelte`: drop the `variant` prop, the `cec-pill--concordance` style block, the `verseSource: variant` field on `openPanel`. Keep the existing solid pill that was there before the feature. Goal: it should look like commit `1f2a75f` (last commit on main before the feature) or the equivalent file content.

For `src/lib/components/bible/ChapterFilterBar.svelte`: revert to single-toggle (`dimNonCited` only). Drop `showConcordance`, `concordanceCount`.

For `src/lib/components/bible/BibleReader.svelte`: drop `concordanceIdx` prop, the dual-pill rendering block, `cc` constant, dim-logic-considering-both. Add a single small button right under the chapter heading:

```svelte
{#if hasConcordance}
	<a
		href="/bible/{book.slug}/{chapter}/concordance"
		class="font-ui text-[12px] text-accent hover:underline mt-2 inline-block"
	>
		Voir la concordance →
	</a>
{/if}
```

…where `hasConcordance` is a derived boolean from a new `concordanceManifest` prop (loaded by the route in N4).

For `src/lib/components/panels/StudyPanel.svelte`: drop the tab-label switch.

For `src/lib/components/panels/TabBibleVerse.svelte`: drop `verseSource` and the loader branching. Restore the single `loadBibleVerseIndex()` call.

For `src/lib/stores/studyPanel.ts`: drop the optional `verseSource` field from `PanelContext`.

For `src/lib/data/types.ts`: drop `ConcordanceVerseIndex` type alias.

For `src/lib/data/loaders.ts`: drop `loadConcordanceVerseIndex` and its promise cache. Keep the `loadBibleVerseIndex` cache that was added.

For `src/routes/bible/[book=biblebook]/[ch]/+page.ts`: drop the concordance fetch. Add a `manifest` fetch instead so the reader knows whether to show the "Voir la concordance" link:

```typescript
const [r1, verseIdx, manifestRes] = await Promise.all([
	fetch('/data/bible/ncl.json'),
	loadBibleVerseIndex(fetch),
	fetch('/data/concordance/manifest.json')
]);
const ncl = (await r1.json()) as Record<string, Record<string, Record<string, string>>>;
const manifest = manifestRes.ok
	? ((await manifestRes.json()) as Record<string, number[]>)
	: ({} as Record<string, number[]>);
const hasConcordance = (manifest[book.slug] ?? []).includes(ch);
```

Pass `hasConcordance` through to `BibleReader`.

For `src/routes/bible/[book=biblebook]/[ch]/+page.svelte`: drop `concordanceIdx={...}`, add `hasConcordance={data.hasConcordance}`.

Delete: `tests/e2e/concordance-toggle.test.ts`.

- [ ] **Step 3: Run `npm run check`** — 0 errors required.

- [ ] **Step 4: Run `npm run test:unit -- --run`** — all existing tests should still pass (the unit tests for `concordance.ts` will fail in step 5; that's expected since we're rewriting them).

- [ ] **Step 5: Skip running concordance tests for now** — they'll be replaced in Section D.

- [ ] **Step 6: Commit:**

```bash
git add -A
git commit -m "revert: remove per-verse concordance UI (replaced by pericope view)"
```

---

## Section P — NCL Section Title Extraction

### Task P1: Parse `<s style="s1">` from NCL XML

**Files:**

- Create: `scripts/prepare/ncl-sections.ts`
- Create: `tests/unit/prepare/ncl-sections.test.ts`

- [ ] **Step 1: Add types in `src/lib/data/types.ts`:**

```typescript
/** A French section title from the NCL Bible (e.g. "La faute et le châtiment"). */
export interface NclSection {
	ch: number; // chapter where the section header appears
	startV: number; // first verse of the section
	title: string; // already-French native title
}

/** Per-book sections, sorted by (ch asc, startV asc). */
export type NclSectionMap = Record<string, NclSection[]>; // keyed by USFX
```

- [ ] **Step 2: Write the failing test in `tests/unit/prepare/ncl-sections.test.ts`:**

```typescript
import { describe, it, expect } from 'vitest';
import { parseNclSections } from '../../../scripts/prepare/ncl-sections';

describe('parseNclSections', () => {
	it('extracts a section title with chapter and start verse', () => {
		const xml = `
      <book id="GEN">
        <c id="3" />
        <s style="s1">La faute et le châtiment</s>
        <p style="p"><v id="1" bcv="GEN.3.1" />Le serpent…</p>
      </book>`;
		expect(parseNclSections(xml)).toEqual({
			GEN: [{ ch: 3, startV: 1, title: 'La faute et le châtiment' }]
		});
	});

	it('handles section before chapter marker (uses prior chapter)', () => {
		const xml = `
      <book id="GEN">
        <c id="2" />
        <s style="s1">Création de l'homme et de la femme</s>
        <p><v id="4" bcv="GEN.2.4" />…</p>
      </book>`;
		expect(parseNclSections(xml)).toEqual({
			GEN: [{ ch: 2, startV: 4, title: "Création de l'homme et de la femme" }]
		});
	});

	it('strips trailing whitespace and newlines from the title', () => {
		const xml = `
      <book id="GEN">
        <c id="1" />
        <s style="s1">Création du monde
</s>
        <p><v id="1" bcv="GEN.1.1" />Au commencement…</p>
      </book>`;
		expect(parseNclSections(xml).GEN![0]!.title).toBe('Création du monde');
	});

	it('handles multiple sections in a chapter', () => {
		const xml = `
      <book id="GEN">
        <c id="4" />
        <s style="s1">Caïn et Abel</s>
        <p><v id="1" bcv="GEN.4.1" />…</p>
        <s style="s1">Seth et ses descendants</s>
        <p><v id="25" bcv="GEN.4.25" />…</p>
      </book>`;
		const result = parseNclSections(xml);
		expect(result.GEN).toEqual([
			{ ch: 4, startV: 1, title: 'Caïn et Abel' },
			{ ch: 4, startV: 25, title: 'Seth et ses descendants' }
		]);
	});

	it('handles multiple books', () => {
		const xml = `
      <book id="GEN">
        <c id="1" /><s style="s1">Création</s>
        <p><v id="1" bcv="GEN.1.1" /></p>
      </book>
      <book id="EXO">
        <c id="1" /><s style="s1">Les Hébreux en Égypte</s>
        <p><v id="1" bcv="EXO.1.1" /></p>
      </book>`;
		const result = parseNclSections(xml);
		expect(result.GEN).toHaveLength(1);
		expect(result.EXO).toEqual([{ ch: 1, startV: 1, title: 'Les Hébreux en Égypte' }]);
	});

	it('skips sections that are not s1 style (cross-references etc.)', () => {
		const xml = `
      <book id="GEN">
        <c id="1" />
        <s style="r">(Job 38)</s>
        <s style="s1">Création</s>
        <p><v id="1" bcv="GEN.1.1" /></p>
      </book>`;
		expect(parseNclSections(xml).GEN).toEqual([{ ch: 1, startV: 1, title: 'Création' }]);
	});
});
```

- [ ] **Step 3: Run tests to confirm they fail:**

```bash
npm run test:unit -- --run tests/unit/prepare/ncl-sections.test.ts
```

Expected: FAIL — `parseNclSections` not exported.

- [ ] **Step 4: Implement `parseNclSections` in `scripts/prepare/ncl-sections.ts`:**

```typescript
import type { NclSection, NclSectionMap } from '../../src/lib/data/types';

const BOOK_RE = /<book\s+[^>]*id="([A-Z0-9]+)"[^>]*>([\s\S]*?)<\/book>/gi;
const CHAPTER_RE = /<c\s+[^>]*id="(\d+)"[^>]*\/?>/gi;
const SECTION_RE = /<s\s+style="s1"[^>]*>([\s\S]*?)<\/s>/gi;
const VERSE_RE = /<v\s+[^>]*id="(\d+)"[^>]*\/?>/gi;

export function parseNclSections(xml: string): NclSectionMap {
	const out: NclSectionMap = {};

	let bookMatch: RegExpExecArray | null;
	BOOK_RE.lastIndex = 0;
	while ((bookMatch = BOOK_RE.exec(xml))) {
		const bookId = bookMatch[1]!;
		const inner = bookMatch[2]!;
		const sections: NclSection[] = [];

		// Walk through inner text, tracking the most recent chapter and the next verse after each <s>
		// We tokenize by finding all chapter, section, and verse markers in order.
		type Tok = { kind: 'c' | 's' | 'v'; pos: number; value: string };
		const toks: Tok[] = [];
		for (const re of [CHAPTER_RE, SECTION_RE, VERSE_RE]) {
			re.lastIndex = 0;
			let m: RegExpExecArray | null;
			while ((m = re.exec(inner))) {
				const kind = re === CHAPTER_RE ? 'c' : re === SECTION_RE ? 's' : 'v';
				toks.push({ kind, pos: m.index, value: m[1]! });
			}
		}
		toks.sort((a, b) => a.pos - b.pos);

		let curCh = 0;
		for (let i = 0; i < toks.length; i++) {
			const t = toks[i]!;
			if (t.kind === 'c') {
				curCh = parseInt(t.value, 10);
			} else if (t.kind === 's') {
				// Find the next 'v' after this 's'
				let nextV: number | null = null;
				for (let j = i + 1; j < toks.length; j++) {
					if (toks[j]!.kind === 'v') {
						nextV = parseInt(toks[j]!.value, 10);
						break;
					}
					if (toks[j]!.kind === 'c') {
						// Section appears before the next chapter marker — keep curCh
						break;
					}
				}
				if (curCh > 0 && nextV !== null) {
					const title = t.value.replace(/\s+/g, ' ').trim();
					if (title) {
						sections.push({ ch: curCh, startV: nextV, title });
					}
				}
			}
		}
		sections.sort((a, b) => a.ch - b.ch || a.startV - b.startV);
		if (sections.length > 0) out[bookId] = sections;
	}

	return out;
}
```

- [ ] **Step 5: Run tests to confirm they pass:**

```bash
npm run test:unit -- --run tests/unit/prepare/ncl-sections.test.ts
```

Expected: PASS — all 6 tests green.

- [ ] **Step 6: Wire into `scripts/prepare-data.ts`** — after the existing NCL parsing step (around line 145–149), add:

```typescript
logStep('extracting NCL section titles');
{
	const { parseNclSections } = await import('./prepare/ncl-sections.ts');
	const sections = parseNclSections(nclXml);
	writeFileSync(join(OUT, 'bible/ncl-sections.json'), JSON.stringify(sections));
	const total = Object.values(sections).reduce((t, arr) => t + arr.length, 0);
	endStep(`${Object.keys(sections).length} books, ${total} sections`);
}
```

- [ ] **Step 7: Run the build:**

```bash
npx tsx scripts/prepare-data.ts
```

Expected: completes; logs the new step. Verify file exists and ~1100+ sections:

```bash
node -e "const x=JSON.parse(require('fs').readFileSync('static/data/bible/ncl-sections.json','utf8')); console.log(Object.keys(x).length,'books,', Object.values(x).reduce((t,a)=>t+a.length,0),'sections');"
```

- [ ] **Step 8: Commit:**

```bash
git add scripts/prepare/ncl-sections.ts tests/unit/prepare/ncl-sections.test.ts \
        scripts/prepare-data.ts src/lib/data/types.ts
git commit -m "feat: extract French section titles from NCL Bible XML"
```

---

## Section D — Concordance Data Reshape

### Task D1: New types

**Files:** Modify `src/lib/data/types.ts`.

- [ ] **Step 1: Add types after `NclSection`:**

```typescript
/**
 * A single Didache pericope: a verse range and its CCC paragraph references.
 * Title is the matching NCL section title (already French) or null.
 */
export interface ConcordancePericope {
	verseRef: string; // "Genèse 3:1-24"
	startCh: number;
	endCh: number;
	startVerse: number; // first verse in THIS chapter (for multi-chapter ranges, capped to chapter start)
	endVerse: number; // last verse in THIS chapter (capped to chapter end)
	pericopeTitle: string | null;
	ccc: number[]; // CCC paragraph numbers, sorted ascending, deduped
}

/** Per-chapter file shape, mirroring DR's FathersChapterFile. */
export interface ConcordanceChapter {
	pericopes: ConcordancePericope[];
	verseEntryCounts: Record<number, number>; // verse → number of pericopes that cover it
	totalEntries: number;
}

/** by-paragraph inverse: which Bible passages reference each CCC paragraph. */
export interface ConcordanceByParagraphEntry {
	slug: string; // bible book slug, e.g. "genese"
	usfx: string; // "GEN"
	bookFrenchName: string; // "Genèse"
	chapter: number;
	verseRef: string; // "Genèse 3:1-24"
	pericopeTitle: string | null;
}
export type ConcordanceByParagraph = Record<string, ConcordanceByParagraphEntry[]>;
// Keys are stringified paragraph numbers ("1850").
```

- [ ] **Step 2: Verify type-check:**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit:**

```bash
git add src/lib/data/types.ts
git commit -m "feat: add concordance pericope types"
```

### Task D2: Rewrite `concordance.ts` builder

**Files:**

- Modify (rewrite output stage): `scripts/prepare/concordance.ts`
- Modify: `tests/unit/prepare/concordance.test.ts` (replace the buildConcordance tests; keep range/link/file parsers tests)

- [ ] **Step 1: Keep existing helpers** — `parseRange`, `expandRange` (unused now but keep), `parseCccLinks`, `parseCommentaryFile`, `DIDACHE_BOOK_TO_USFX`, regex constants, `normalizeDashes`, `stripTags`, `parseParagraphList`. Delete only `buildConcordance` + `BuildStats` + `BuildResult`.

- [ ] **Step 2: Add new types and helpers** at the bottom of `concordance.ts`:

```typescript
import type {
	ConcordanceChapter,
	ConcordancePericope,
	ConcordanceByParagraph,
	ConcordanceByParagraphEntry,
	NclSection,
	NclSectionMap
} from '../../src/lib/data/types';

export interface BuildOutput {
	/** Map: usfx → chapter → ConcordanceChapter */
	byBook: Record<string, Record<number, ConcordanceChapter>>;
	/** Inverse index keyed by paragraph number string */
	byParagraph: ConcordanceByParagraph;
	/** Manifest: slug → sorted list of chapters with concordance data */
	manifest: Record<string, number[]>;
	stats: BuildStats;
}

export interface BuildStats {
	filesScanned: number;
	commentaryFiles: number;
	pericopesEmitted: number;
	unknownBooks: string[];
	unknownParagraphs: number[];
	unparseableRanges: string[];
	booksWithZeroEntries: string[];
	pericopesWithoutTitle: number; // diagnostic only
}

/**
 * For a given (chapter, startV), find the NCL section whose startV is the largest
 * value ≤ startV in the same chapter. That section "encloses" the pericope.
 */
function findEnclosingNclSection(
	sections: NclSection[] | undefined,
	ch: number,
	startV: number
): string | null {
	if (!sections) return null;
	let best: NclSection | null = null;
	for (const s of sections) {
		if (s.ch !== ch) continue;
		if (s.startV > startV) continue;
		if (!best || s.startV > best.startV) best = s;
	}
	return best?.title ?? null;
}

/**
 * Build the per-chapter concordance + by-paragraph index from parsed Didache HTML files.
 * Multi-chapter ranges are emitted into EVERY chapter they span (with verseRef preserving
 * the full range), so a reader on any included chapter sees the broader-context pericope.
 */
export function buildConcordancePericopes(
	htmlFiles: string[],
	ncl: Record<string, Record<string, Record<string, string>>>,
	knownParas: Set<number>,
	books: BookInfo[],
	nclSections: NclSectionMap
): BuildOutput {
	const validUsfx = new Set(books.map((b) => b.usfx));
	const slugByUsfx = new Map(books.map((b) => [b.usfx, b.slug]));
	const frenchByUsfx = new Map(books.map((b) => [b.usfx, b.frenchName]));

	const stats: BuildStats = {
		filesScanned: htmlFiles.length,
		commentaryFiles: 0,
		pericopesEmitted: 0,
		unknownBooks: [],
		unknownParagraphs: [],
		unparseableRanges: [],
		booksWithZeroEntries: [],
		pericopesWithoutTitle: 0
	};
	const unknownBookSet = new Set<string>();
	const unknownParaSet = new Set<number>();
	const unparseableSet = new Set<string>();
	const zeroEntrySet = new Set<string>();

	// byBook[usfx][chapter] → ConcordanceChapter under construction
	type ChapterDraft = {
		pericopes: ConcordancePericope[];
		verseSet: Map<number, number>; // verseNum → count
	};
	const byBook = new Map<string, Map<number, ChapterDraft>>();

	// byParagraph: pNum → entries[]
	const byParagraph = new Map<number, ConcordanceByParagraphEntry[]>();

	const chapterMaxVerse = (usfx: string, ch: number): number => {
		const data = ncl[usfx]?.[String(ch)];
		if (!data) return 0;
		return Object.keys(data).reduce((m, k) => Math.max(m, parseInt(k, 10)), 0);
	};

	for (const html of htmlFiles) {
		const file = parseCommentaryFile(html);
		if (!file) continue;
		stats.commentaryFiles++;

		const usfx = DIDACHE_BOOK_TO_USFX[file.bookName];
		if (!usfx || !validUsfx.has(usfx)) {
			unknownBookSet.add(file.bookName);
			continue;
		}
		const slug = slugByUsfx.get(usfx)!;
		const frenchName = frenchByUsfx.get(usfx)!;
		let producedAny = false;

		for (const entry of file.entries) {
			const range = parseRange(entry.range);
			if (!range) {
				unparseableSet.add(entry.range);
				continue;
			}
			const filteredParas: number[] = [];
			for (const p of entry.ccc) {
				if (knownParas.has(p)) filteredParas.push(p);
				else unknownParaSet.add(p);
			}
			if (filteredParas.length === 0) continue;

			// Resolve concrete chapter span: for "5" or "1-3" ranges (no verses), span all verses.
			const startCh = range.fromCh;
			const endCh = range.toCh;
			const fromV = range.fromV;
			const toV = range.toV;

			// verseRef formatting: prefer "Genèse 3:1-24", "Genèse 1—3" (em-dash) for chapter ranges,
			// "Genèse 3" for single chapter, "Genèse 3:15" for single verse.
			const verseRef = formatVerseRef(frenchName, startCh, endCh, fromV, toV);

			// Emit the pericope into EVERY chapter it touches.
			for (let ch = startCh; ch <= endCh; ch++) {
				if (!ncl[usfx]?.[String(ch)]) continue; // skip chapters not in the bible
				let perStartV: number;
				let perEndV: number;
				if (fromV === null) {
					perStartV = 1;
					perEndV = chapterMaxVerse(usfx, ch);
				} else if (startCh === endCh) {
					perStartV = fromV;
					perEndV = toV!;
				} else if (ch === startCh) {
					perStartV = fromV;
					perEndV = chapterMaxVerse(usfx, ch);
				} else if (ch === endCh) {
					perStartV = 1;
					perEndV = toV!;
				} else {
					perStartV = 1;
					perEndV = chapterMaxVerse(usfx, ch);
				}
				if (perEndV < perStartV) continue;

				const title = findEnclosingNclSection(nclSections[usfx], ch, perStartV);
				if (title === null) stats.pericopesWithoutTitle++;

				const pericope: ConcordancePericope = {
					verseRef,
					startCh,
					endCh,
					startVerse: perStartV,
					endVerse: perEndV,
					pericopeTitle: title,
					ccc: filteredParas.slice() // own copy; could be sorted/deduped later
				};

				// Insert into chapter draft
				let book = byBook.get(usfx);
				if (!book) {
					book = new Map();
					byBook.set(usfx, book);
				}
				let draft = book.get(ch);
				if (!draft) {
					draft = { pericopes: [], verseSet: new Map() };
					book.set(ch, draft);
				}
				draft.pericopes.push(pericope);
				for (let v = perStartV; v <= perEndV; v++) {
					draft.verseSet.set(v, (draft.verseSet.get(v) ?? 0) + 1);
				}
				producedAny = true;
				stats.pericopesEmitted++;
			}

			// Update by-paragraph inverse — one entry per (usfx, range)
			for (const p of filteredParas) {
				const arr = byParagraph.get(p) ?? [];
				arr.push({
					slug,
					usfx,
					bookFrenchName: frenchName,
					chapter: startCh,
					verseRef,
					pericopeTitle: findEnclosingNclSection(nclSections[usfx], startCh, fromV ?? 1)
				});
				byParagraph.set(p, arr);
			}
		}

		if (!producedAny) zeroEntrySet.add(file.bookName);
	}

	// Finalize: sort pericopes per chapter (startVerse asc, span DESC = broader first),
	// dedupe each pericope's ccc list, build verseEntryCounts, build manifest.
	const byBookOut: Record<string, Record<number, ConcordanceChapter>> = {};
	const manifest: Record<string, number[]> = {};
	for (const [usfx, chapters] of byBook) {
		const slug = slugByUsfx.get(usfx)!;
		const chapterNums: number[] = [];
		byBookOut[usfx] = {};
		for (const [ch, draft] of chapters) {
			// Sort and dedupe each pericope's ccc
			for (const p of draft.pericopes) {
				const set = new Set(p.ccc);
				p.ccc = Array.from(set).sort((a, b) => a - b);
			}
			// Sort pericopes
			draft.pericopes.sort(
				(a, b) =>
					a.startVerse - b.startVerse || b.endVerse - b.startVerse - (a.endVerse - a.startVerse) // broader first when ties
			);
			const verseEntryCounts: Record<number, number> = {};
			for (const [v, n] of draft.verseSet) verseEntryCounts[v] = n;
			byBookOut[usfx][ch] = {
				pericopes: draft.pericopes,
				verseEntryCounts,
				totalEntries: draft.pericopes.length
			};
			chapterNums.push(ch);
		}
		chapterNums.sort((a, b) => a - b);
		manifest[slug] = chapterNums;
	}

	// Finalize by-paragraph: sort each paragraph's entries by (slug, chapter, verseRef)
	const byParagraphOut: ConcordanceByParagraph = {};
	for (const [pNum, entries] of byParagraph) {
		entries.sort(
			(a, b) =>
				a.slug.localeCompare(b.slug) ||
				a.chapter - b.chapter ||
				a.verseRef.localeCompare(b.verseRef)
		);
		byParagraphOut[String(pNum)] = entries;
	}

	stats.unknownBooks = Array.from(unknownBookSet).sort();
	stats.unknownParagraphs = Array.from(unknownParaSet).sort((a, b) => a - b);
	stats.unparseableRanges = Array.from(unparseableSet).sort();
	stats.booksWithZeroEntries = Array.from(zeroEntrySet).sort();

	return { byBook: byBookOut, byParagraph: byParagraphOut, manifest, stats };
}

function formatVerseRef(
	bookName: string,
	startCh: number,
	endCh: number,
	fromV: number | null,
	toV: number | null
): string {
	if (fromV === null) {
		if (startCh === endCh) return `${bookName} ${startCh}`;
		return `${bookName} ${startCh}—${endCh}`;
	}
	if (startCh === endCh) {
		if (fromV === toV) return `${bookName} ${startCh}:${fromV}`;
		return `${bookName} ${startCh}:${fromV}-${toV}`;
	}
	return `${bookName} ${startCh}:${fromV}—${endCh}:${toV}`;
}
```

- [ ] **Step 3: Replace the `buildConcordance` tests in `tests/unit/prepare/concordance.test.ts`** with tests for `buildConcordancePericopes`. Keep the parser tests (parseRange, parseCccLinks, parseCommentaryFile, expandRange).

Replace the old `describe('buildConcordance', …)` block with:

```typescript
import { buildConcordancePericopes } from '../../../scripts/prepare/concordance';
import type { BookInfo } from '../../../src/lib/utils/bibleBookSlug';
import type { NclSectionMap } from '../../../src/lib/data/types';

describe('buildConcordancePericopes', () => {
	const ncl = {
		GEN: {
			'1': Object.fromEntries(Array.from({ length: 31 }, (_, i) => [String(i + 1), `v${i + 1}`])),
			'2': Object.fromEntries(Array.from({ length: 25 }, (_, i) => [String(i + 1), `v${i + 1}`])),
			'3': Object.fromEntries(Array.from({ length: 24 }, (_, i) => [String(i + 1), `v${i + 1}`]))
		}
	};

	const books: BookInfo[] = [{ usfx: 'GEN', slug: 'genese', frenchName: 'Genèse', abbrs: ['Gn'] }];

	const knownParas = new Set([121, 122, 123, 199, 268, 295, 296, 390, 394, 395]);

	const sections: NclSectionMap = {
		GEN: [
			{ ch: 1, startV: 1, title: 'Création du monde' },
			{ ch: 2, startV: 4, title: "Création de l'homme" },
			{ ch: 3, startV: 1, title: 'La faute et le châtiment' }
		]
	};

	it('emits one pericope per Didache entry, attaches NCL title', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">3:1-24</a> the fall…
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">390, 394-395</a>)</p>
    </body></html>`;
		const r = buildConcordancePericopes([html], ncl, knownParas, books, sections);
		const ch3 = r.byBook.GEN![3]!;
		expect(ch3.pericopes).toHaveLength(1);
		expect(ch3.pericopes[0]).toMatchObject({
			verseRef: 'Genèse 3:1-24',
			startCh: 3,
			endCh: 3,
			startVerse: 1,
			endVerse: 24,
			pericopeTitle: 'La faute et le châtiment',
			ccc: [390, 394, 395]
		});
		expect(ch3.totalEntries).toBe(1);
		expect(ch3.verseEntryCounts['1']).toBe(1);
		expect(ch3.verseEntryCounts['24']).toBe(1);
	});

	it('multi-chapter range is emitted into every chapter it spans', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">1—3</a> overview
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">121-123</a>)</p>
    </body></html>`;
		const r = buildConcordancePericopes([html], ncl, knownParas, books, sections);
		expect(r.byBook.GEN![1]!.pericopes).toHaveLength(1);
		expect(r.byBook.GEN![2]!.pericopes).toHaveLength(1);
		expect(r.byBook.GEN![3]!.pericopes).toHaveLength(1);
		expect(r.byBook.GEN![1]!.pericopes[0]!.verseRef).toBe('Genèse 1—3');
		expect(r.byBook.GEN![2]!.pericopes[0]!.startVerse).toBe(1);
		expect(r.byBook.GEN![2]!.pericopes[0]!.endVerse).toBe(25);
	});

	it('sorts pericopes by startVerse asc, broader first on ties', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">3:1-24</a> chapter
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">390</a>)</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos2">3:1-7</a> first part
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">394</a>)</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos3">3:15</a> protoevangelium
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">395</a>)</p>
    </body></html>`;
		const r = buildConcordancePericopes([html], ncl, knownParas, books, sections);
		const ps = r.byBook.GEN![3]!.pericopes;
		// Same startVerse=1 → broader (3:1-24) before narrower (3:1-7); then 3:15
		expect(ps.map((p) => p.verseRef)).toEqual(['Genèse 3:1-24', 'Genèse 3:1-7', 'Genèse 3:15']);
	});

	it('builds by-paragraph inverse', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">3:1-24</a>
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">390, 395</a>)</p>
    </body></html>`;
		const r = buildConcordancePericopes([html], ncl, knownParas, books, sections);
		expect(r.byParagraph['390']).toEqual([
			{
				slug: 'genese',
				usfx: 'GEN',
				bookFrenchName: 'Genèse',
				chapter: 3,
				verseRef: 'Genèse 3:1-24',
				pericopeTitle: 'La faute et le châtiment'
			}
		]);
		expect(r.byParagraph['395']).toHaveLength(1);
	});

	it('builds manifest mapping slug → sorted chapter list', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">3:1</a>
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">390</a>)</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos2">1:1</a>
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">268</a>)</p>
    </body></html>`;
		const r = buildConcordancePericopes([html], ncl, knownParas, books, sections);
		expect(r.manifest.genese).toEqual([1, 3]);
	});

	it('records books whose commentary file produced zero entries', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">1:1</a> No CCC here.</p>
    </body></html>`;
		const r = buildConcordancePericopes([html], ncl, knownParas, books, sections);
		expect(r.byBook).toEqual({});
		expect(r.stats.booksWithZeroEntries).toEqual(['Genesis']);
	});
});
```

- [ ] **Step 4: Run tests** — `npm run test:unit -- --run tests/unit/prepare/concordance.test.ts` should be green (~30 tests including the kept parser tests).

- [ ] **Step 5: Commit:**

```bash
git add scripts/prepare/concordance.ts tests/unit/prepare/concordance.test.ts
git commit -m "feat: rewrite concordance builder for pericope output"
```

### Task D3: Wire into prepare-data.ts and emit per-chapter files

**Files:** Modify `scripts/prepare-data.ts`.

- [ ] **Step 1: Replace the existing concordance step** (the one we wrote in M6, that emits `concordance-verse-index.json`) with:

```typescript
logStep('building concordance pericopes');
{
	const { buildConcordancePericopes } = await import('./prepare/concordance.ts');
	const sourceDir =
		process.env.DIDACHE_SOURCE_DIR ?? join(ROOT, '..', 'DOCTRINA', 'sources', 'didache');

	let htmlFiles: string[] = [];
	try {
		const stat = statSync(sourceDir);
		if (!stat.isDirectory()) throw new Error(`not a directory: ${sourceDir}`);
		const entries = readdirSync(sourceDir, { withFileTypes: true, recursive: true });
		for (const ent of entries) {
			if (ent.isFile() && ent.name.toLowerCase().endsWith('.html')) {
				htmlFiles.push(readFileSync(join(ent.parentPath, ent.name), 'utf8'));
			}
		}
	} catch (e) {
		const err = e as NodeJS.ErrnoException;
		if (err.code === 'ENOENT' || err.message?.startsWith('not a directory:')) {
			console.warn(`  (no DIDACHE_SOURCE_DIR at ${sourceDir} — emitting empty concordance)`);
		} else {
			throw e;
		}
	}

	const nclSections = JSON.parse(readFileSync(join(OUT, 'bible/ncl-sections.json'), 'utf8'));
	const { byBook, byParagraph, manifest, stats } = buildConcordancePericopes(
		htmlFiles,
		ncl,
		knownParas,
		BOOKS,
		nclSections
	);

	// Write per-chapter files
	const concordanceDir = join(OUT, 'concordance');
	mkdirSync(concordanceDir, { recursive: true });
	for (const [usfx, byCh] of Object.entries(byBook)) {
		const slug = BOOKS.find((b) => b.usfx === usfx)!.slug;
		const bookDir = join(concordanceDir, slug);
		mkdirSync(bookDir, { recursive: true });
		for (const [ch, chapter] of Object.entries(byCh)) {
			writeFileSync(join(bookDir, `${ch}.json`), JSON.stringify(chapter));
		}
	}
	writeFileSync(join(concordanceDir, 'manifest.json'), JSON.stringify(manifest));
	writeFileSync(join(concordanceDir, 'by-paragraph.json'), JSON.stringify(byParagraph));

	// Drop the old verse-index file if it still exists
	try {
		unlinkSync(join(OUT, 'ccc/concordance-verse-index.json'));
	} catch {}

	if (stats.unknownBooks.length > 0)
		console.warn('  unknown books:', stats.unknownBooks.join(', '));
	if (stats.unknownParagraphs.length > 0)
		console.warn(`  ${stats.unknownParagraphs.length} unknown CCC paragraphs (dropped)`);
	if (stats.unparseableRanges.length > 0)
		console.warn(`  ${stats.unparseableRanges.length} unparseable ranges`);
	if (stats.booksWithZeroEntries.length > 0)
		console.warn(
			`  ${stats.booksWithZeroEntries.length} books with zero entries: ${stats.booksWithZeroEntries.join(', ')}`
		);
	if (stats.pericopesWithoutTitle > 0)
		console.warn(`  ${stats.pericopesWithoutTitle} pericopes without NCL title (kept titleless)`);
	endStep(`${stats.commentaryFiles} files, ${stats.pericopesEmitted} pericopes`);
}
```

Add `unlinkSync` and `mkdirSync` to the `node:fs` import if not already there.

- [ ] **Step 2: Run the build:**

```bash
npx tsx scripts/prepare-data.ts
```

Expected: completes; emits per-chapter files. Sanity check:

```bash
ls static/data/concordance/genese/ | head
cat static/data/concordance/manifest.json | python3 -m json.tool | head -20
node -e "const x=JSON.parse(require('fs').readFileSync('static/data/concordance/genese/3.json','utf8')); console.log(x.totalEntries, 'pericopes; verses:', Object.keys(x.verseEntryCounts).length); for (const p of x.pericopes) console.log(' -', p.verseRef, '|', p.pericopeTitle, '|', p.ccc.length, 'CCC');"
```

Expected: Genesis 3 has multiple pericopes including "La faute et le châtiment" / "Genèse 3:1-24".

- [ ] **Step 3: Commit:**

```bash
git add scripts/prepare-data.ts
git commit -m "feat: emit per-chapter concordance JSON files plus by-paragraph index"
```

### Task D4: Loaders

**Files:** Modify `src/lib/data/loaders.ts`.

- [ ] **Step 1: Add three loaders, with promise caches mirroring the existing pattern:**

```typescript
let concordanceManifestPromise: Promise<Record<string, number[]>> | null = null;
let concordanceByParagraphPromise: Promise<ConcordanceByParagraph> | null = null;
const concordanceChapterCache = new Map<string, Promise<ConcordanceChapter | null>>();

export function loadConcordanceManifest(fetcher: Fetch = fetch): Promise<Record<string, number[]>> {
	if (!concordanceManifestPromise) {
		concordanceManifestPromise = (async () => {
			const r = await fetcher('/data/concordance/manifest.json');
			if (!r.ok) return {};
			return (await r.json()) as Record<string, number[]>;
		})();
	}
	return concordanceManifestPromise;
}

export function loadConcordanceByParagraph(
	fetcher: Fetch = fetch
): Promise<ConcordanceByParagraph> {
	if (!concordanceByParagraphPromise) {
		concordanceByParagraphPromise = (async () => {
			const r = await fetcher('/data/concordance/by-paragraph.json');
			if (!r.ok) return {} as ConcordanceByParagraph;
			return (await r.json()) as ConcordanceByParagraph;
		})();
	}
	return concordanceByParagraphPromise;
}

export function loadConcordanceChapter(
	slug: string,
	chapter: number,
	fetcher: Fetch = fetch
): Promise<ConcordanceChapter | null> {
	const key = `${slug}/${chapter}`;
	let p = concordanceChapterCache.get(key);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/concordance/${slug}/${chapter}.json`);
			if (!r.ok) return null;
			return (await r.json()) as ConcordanceChapter;
		})();
		concordanceChapterCache.set(key, p);
	}
	return p;
}
```

Add the import:

```typescript
import type { ConcordanceChapter, ConcordanceByParagraph } from './types';
```

- [ ] **Step 2: Verify type-check passes:**

```bash
npm run check
```

- [ ] **Step 3: Commit:**

```bash
git add src/lib/data/loaders.ts
git commit -m "feat: add concordance chapter, manifest, and by-paragraph loaders"
```

---

## Section U — UI Components

For each component in this section, **before writing any code**, READ the corresponding DR Fathers file to understand the exact pattern. The lecatechisme version simplifies (no author filter, no prose body, single-source data) but mirrors the structure.

### Task U1: ConcordancePericopeCard

**Files:** Create `src/lib/components/bible/concordance/ConcordancePericopeCard.svelte`.

- [ ] **Step 1: Write the component:**

```svelte
<script lang="ts">
	import type { ConcordancePericope } from '$lib/data/types';

	let { pericope, highlighted = false }: { pericope: ConcordancePericope; highlighted?: boolean } =
		$props();
</script>

<article
	class="rounded-sm border transition-colors duration-150
    {highlighted ? 'border-accent/40 bg-accent/5' : 'border-border bg-panel'}"
>
	<div class="px-sm pt-sm pb-[6px]">
		<div class="flex items-baseline gap-2 flex-wrap">
			<span class="text-[12px] font-semibold uppercase tracking-[0.1em] text-accent">
				{pericope.verseRef}
			</span>
			{#if pericope.pericopeTitle}
				<span class="text-[12px] text-foreground/80">— {pericope.pericopeTitle}</span>
			{/if}
		</div>
		<div class="w-[24px] h-[2px] bg-accent/50 mt-[5px] rounded-full"></div>
	</div>
	<div class="px-sm pb-sm pt-[6px] flex flex-wrap gap-[4px]">
		{#each pericope.ccc as p (p)}
			<a
				href="/ccc/{p}"
				class="font-ui text-[11px] text-accent border border-accent/30 rounded-[3px] px-[6px] py-[1px] hover:bg-accent/10 transition-colors"
				>§{p}</a
			>
		{/each}
	</div>
</article>
```

- [ ] **Step 2: Run check:** `npm run check`

- [ ] **Step 3: Commit:**

```bash
git add src/lib/components/bible/concordance/ConcordancePericopeCard.svelte
git commit -m "feat: ConcordancePericopeCard for pericope chip display"
```

### Task U2: ConcordancePericopePanel (right pane)

**Files:** Create `src/lib/components/bible/concordance/ConcordancePericopePanel.svelte`.

READ `FathersCommentaryPanel.svelte` first for the sticky-header + lazy-render + scroll-to-on-select pattern. The lecatechisme version drops: filter bar, IntersectionObserver lazy rendering (likely overkill at our scale — chapters have <30 pericopes), VerseTooltip, expand-all. Keeps: pericope sections with sticky headers, scroll-to-on-select.

- [ ] **Step 1: Write the component:**

```svelte
<script lang="ts">
	import { tick } from 'svelte';
	import type { ConcordanceChapter } from '$lib/data/types';
	import ConcordancePericopeCard from './ConcordancePericopeCard.svelte';

	let {
		chapterData,
		selectedVerse,
		selectedPericope
	}: {
		chapterData: ConcordanceChapter;
		selectedVerse: number | null;
		selectedPericope: string | null;
	} = $props();

	let scrollContainer = $state<HTMLElement | null>(null);

	$effect(() => {
		if (selectedVerse !== null) scrollToVerse(selectedVerse);
	});

	$effect(() => {
		if (selectedPericope !== null) scrollToPericopeRef(selectedPericope);
	});

	async function scrollToEl(el: HTMLElement | null) {
		if (!el || !scrollContainer) return;
		const containerTop = scrollContainer.getBoundingClientRect().top;
		const elTop = el.getBoundingClientRect().top;
		const offset = elTop - containerTop + scrollContainer.scrollTop;
		scrollContainer.scrollTo({ top: offset, behavior: 'smooth' });
	}

	async function scrollToVerse(verse: number) {
		await tick();
		if (!scrollContainer) return;
		const idx = chapterData.pericopes.findIndex(
			(p) => verse >= p.startVerse && verse <= p.endVerse
		);
		if (idx < 0) return;
		const el = scrollContainer.querySelector(`[data-pericope-idx="${idx}"]`) as HTMLElement | null;
		scrollToEl(el);
	}

	async function scrollToPericopeRef(verseRef: string) {
		await tick();
		if (!scrollContainer) return;
		const el = scrollContainer.querySelector(
			`[data-pericope-ref="${CSS.escape(verseRef)}"]`
		) as HTMLElement | null;
		scrollToEl(el);
	}

	function pericopeHighlighted(p: { startVerse: number; endVerse: number; verseRef: string }) {
		if (selectedVerse !== null && selectedVerse >= p.startVerse && selectedVerse <= p.endVerse) {
			return true;
		}
		if (selectedPericope === p.verseRef) return true;
		return false;
	}
</script>

<div class="flex flex-col h-full overflow-hidden">
	<div class="flex-1 overflow-y-auto" bind:this={scrollContainer}>
		{#if chapterData.pericopes.length === 0}
			<div class="p-lg text-center text-subtle text-[14px]">
				<p>Aucune référence de concordance pour ce chapitre.</p>
			</div>
		{:else}
			{#each chapterData.pericopes as pericope, i (i)}
				<div
					class="border-b border-border/50 last:border-b-0 p-3"
					data-pericope-ref={pericope.verseRef}
					data-pericope-idx={i}
				>
					<ConcordancePericopeCard {pericope} highlighted={pericopeHighlighted(pericope)} />
				</div>
			{/each}
		{/if}
	</div>
</div>
```

- [ ] **Step 2: Run check:** `npm run check`

- [ ] **Step 3: Commit:**

```bash
git add src/lib/components/bible/concordance/ConcordancePericopePanel.svelte
git commit -m "feat: ConcordancePericopePanel right-pane with scroll-to-on-select"
```

### Task U3: ConcordanceVerseList (left pane)

**Files:** Create `src/lib/components/bible/concordance/ConcordanceVerseList.svelte`.

READ `FathersVerseList.svelte` for the pattern: pericope headers injected before the first verse of each pericope, badges per verse showing entry counts, click handlers for verse and pericope selection. The lecatechisme version drops: translation selector, `cleanVerseText`, smallcaps. Keeps: pericope header injection, badges, click selection.

- [ ] **Step 1: Write the component:**

```svelte
<script lang="ts">
	import type { ConcordancePericope, ConcordanceChapter } from '$lib/data/types';

	let {
		verses,
		chapterData,
		chapter,
		selectedVerse,
		onSelectVerse,
		onSelectPericope
	}: {
		verses: { v: number; text: string }[];
		chapterData: ConcordanceChapter;
		chapter: number;
		selectedVerse: number | null;
		onSelectVerse: (v: number) => void;
		onSelectPericope: (verseRef: string) => void;
	} = $props();

	// Map: startVerse → list of pericopes starting at that verse (broader first)
	const pericopesByStart = $derived(() => {
		const m = new Map<number, ConcordancePericope[]>();
		for (const p of chapterData.pericopes) {
			const arr = m.get(p.startVerse) ?? [];
			arr.push(p);
			m.set(p.startVerse, arr);
		}
		return m;
	});
</script>

<div class="h-full flex flex-col">
	<div class="shrink-0 border-b border-border px-sm py-[8px] bg-panel font-ui">
		<span class="text-[11px] text-subtle font-medium">
			Chapitre {chapter}
		</span>
	</div>
	<div class="flex-1 overflow-y-auto px-sm py-md">
		<div class="space-y-[2px]">
			{#each verses as verse (verse.v)}
				{@const headers = pericopesByStart().get(verse.v) ?? []}
				{@const totalCount = chapterData.verseEntryCounts[verse.v] ?? 0}
				{@const isSelected = selectedVerse === verse.v}
				{@const hasBadge = totalCount > 0}

				{#each headers as header (header.verseRef)}
					<button
						type="button"
						class="w-full text-left flex items-center gap-2 px-[6px] py-[6px] mt-[8px] mb-[2px] rounded-sm border-l-2 border-accent/40 hover:bg-accent/10 hover:border-accent transition-colors"
						onclick={() => onSelectPericope(header.verseRef)}
					>
						<div class="flex-1 min-w-0">
							<span class="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">
								{header.verseRef}
							</span>
							{#if header.pericopeTitle}
								<p class="text-[11px] text-foreground/70 leading-snug truncate">
									{header.pericopeTitle}
								</p>
							{/if}
						</div>
						<span class="shrink-0 text-[10px] text-subtle">
							{header.ccc.length} §
						</span>
					</button>
				{/each}

				<button
					type="button"
					class="w-full text-left flex items-start gap-2 rounded-sm px-[6px] py-[4px] transition-colors group
            {isSelected ? 'bg-accent/10' : ''}
            {hasBadge ? 'cursor-pointer hover:bg-border/20' : 'cursor-default'}"
					onclick={() => hasBadge && onSelectVerse(verse.v)}
					disabled={!hasBadge}
				>
					<span class="shrink-0 text-[11px] text-subtle font-medium w-[20px] text-right pt-[2px]">
						{verse.v}
					</span>
					<span
						class="flex-1 font-body text-[15px] leading-relaxed text-foreground"
						class:verse-annotated={hasBadge}
						class:verse-active={isSelected}>{verse.text}</span
					>
					{#if hasBadge}
						<span class="shrink-0 mt-[3px] text-[10px] font-medium text-subtle">
							{totalCount}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.verse-annotated {
		text-decoration: underline;
		text-decoration-style: dotted;
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
	}
	.verse-annotated:hover,
	.verse-active {
		text-decoration-style: solid;
		text-decoration-color: var(--color-accent);
	}
</style>
```

- [ ] **Step 2: Run check:** `npm run check`

- [ ] **Step 3: Commit:**

```bash
git add src/lib/components/bible/concordance/ConcordanceVerseList.svelte
git commit -m "feat: ConcordanceVerseList left-pane with pericope headers and badges"
```

### Task U4: ConcordanceReader (split-pane shell)

**Files:** Create `src/lib/components/bible/concordance/ConcordanceReader.svelte`.

- [ ] **Step 1: Write:**

```svelte
<script lang="ts">
	import type { ConcordanceChapter, NclSection } from '$lib/data/types';
	import type { BookInfo } from '$lib/utils/bibleBookSlug';
	import ConcordanceVerseList from './ConcordanceVerseList.svelte';
	import ConcordancePericopePanel from './ConcordancePericopePanel.svelte';

	let {
		book,
		chapter,
		verses,
		chapterData
	}: {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		chapterData: ConcordanceChapter;
	} = $props();

	let selectedVerse = $state<number | null>(null);
	let selectedPericope = $state<string | null>(null);

	function handleSelectVerse(v: number) {
		selectedVerse = selectedVerse === v ? null : v;
		selectedPericope = null;
	}

	function handleSelectPericope(verseRef: string) {
		selectedPericope = verseRef;
		selectedVerse = null;
	}
</script>

<div class="flex flex-1 items-stretch min-h-0">
	<div class="border-r border-border hidden md:flex md:flex-col" style="width: 50%;">
		<ConcordanceVerseList
			{verses}
			{chapterData}
			{chapter}
			{selectedVerse}
			onSelectVerse={handleSelectVerse}
			onSelectPericope={handleSelectPericope}
		/>
	</div>
	<div class="flex-1 min-w-0 overflow-hidden">
		<ConcordancePericopePanel {chapterData} {selectedVerse} {selectedPericope} />
	</div>
</div>

<!-- Mobile fallback: single-column verse list above pericope panel -->
<div class="md:hidden flex flex-col flex-1 min-h-0">
	<div class="flex-1 overflow-y-auto border-b border-border">
		<ConcordanceVerseList
			{verses}
			{chapterData}
			{chapter}
			{selectedVerse}
			onSelectVerse={handleSelectVerse}
			onSelectPericope={handleSelectPericope}
		/>
	</div>
	<div class="flex-1 overflow-y-auto">
		<ConcordancePericopePanel {chapterData} {selectedVerse} {selectedPericope} />
	</div>
</div>
```

(The mobile fallback is a vertical split rather than the desktop horizontal split — same components, simpler layout.)

- [ ] **Step 2: Commit:**

```bash
git add src/lib/components/bible/concordance/ConcordanceReader.svelte
git commit -m "feat: ConcordanceReader split-pane shell"
```

### Task U5: ConcordanceBar (header)

**Files:** Create `src/lib/components/bible/concordance/ConcordanceBar.svelte`.

- [ ] **Step 1: Write a minimal header that includes chapter nav + a link back to the reading view:**

```svelte
<script lang="ts">
	import type { BookInfo } from '$lib/utils/bibleBookSlug';

	let { book, chapter, totalChapters }: { book: BookInfo; chapter: number; totalChapters: number } =
		$props();

	const prevHref = $derived(chapter > 1 ? `/bible/${book.slug}/${chapter - 1}/concordance` : null);
	const nextHref = $derived(
		chapter < totalChapters ? `/bible/${book.slug}/${chapter + 1}/concordance` : null
	);
</script>

<header class="sticky top-0 z-30 bg-glass backdrop-blur-sm border-b border-border font-ui">
	<div class="px-lg py-3 flex items-center justify-between">
		<a
			href="/bible/{book.slug}/{chapter}"
			class="text-[12px] uppercase tracking-[0.15em] text-subtle hover:text-accent transition-colors"
		>
			← Lecture
		</a>
		<div class="flex items-center gap-3">
			{#if prevHref}
				<a href={prevHref} class="text-subtle hover:text-accent text-[12px]">‹ Ch. {chapter - 1}</a>
			{/if}
			<span class="text-foreground font-semibold text-[14px]">
				{book.frenchName}
				{chapter} — Concordance
			</span>
			{#if nextHref}
				<a href={nextHref} class="text-subtle hover:text-accent text-[12px]">Ch. {chapter + 1} ›</a>
			{/if}
		</div>
		<span class="w-[60px]"></span>
	</div>
</header>
```

- [ ] **Step 2: Commit:**

```bash
git add src/lib/components/bible/concordance/ConcordanceBar.svelte
git commit -m "feat: ConcordanceBar header with back-link and chapter nav"
```

### Task U6: Sibling route + page

**Files:**

- Create: `src/routes/bible/[book=biblebook]/[ch]/concordance/+page.ts`
- Create: `src/routes/bible/[book=biblebook]/[ch]/concordance/+page.svelte`

- [ ] **Step 1: `+page.ts`:**

```typescript
import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import { loadConcordanceChapter } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const ch = parseInt(params.ch!, 10);
	if (!Number.isFinite(ch)) throw error(404);

	const [r1, chapterData] = await Promise.all([
		fetch('/data/bible/ncl.json'),
		loadConcordanceChapter(book.slug, ch, fetch)
	]);
	const ncl = (await r1.json()) as Record<string, Record<string, Record<string, string>>>;
	if (!chapterData) throw error(404, 'No concordance data for this chapter');

	const bookData = ncl[book.usfx];
	if (!bookData) throw error(404);
	const chData = bookData[String(ch)];
	if (!chData) throw error(404);

	const verses = Object.entries(chData)
		.map(([v, text]) => ({ v: parseInt(v, 10), text }))
		.sort((a, b) => a.v - b.v);

	const totalChapters = Object.keys(bookData)
		.map((k) => parseInt(k, 10))
		.reduce((m, n) => Math.max(m, n), 0);

	return { book, chapter: ch, verses, chapterData, totalChapters };
};
```

- [ ] **Step 2: `+page.svelte`:**

```svelte
<script lang="ts">
	import ConcordanceBar from '$lib/components/bible/concordance/ConcordanceBar.svelte';
	import ConcordanceReader from '$lib/components/bible/concordance/ConcordanceReader.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.book.frenchName} {data.chapter} — Concordance</title>
</svelte:head>

<div class="flex flex-col h-screen">
	<ConcordanceBar book={data.book} chapter={data.chapter} totalChapters={data.totalChapters} />
	<ConcordanceReader
		book={data.book}
		chapter={data.chapter}
		verses={data.verses}
		chapterData={data.chapterData}
	/>
</div>
```

- [ ] **Step 3: Run check + start dev to manually verify:**

```bash
npm run check
npm run dev
```

Visit `http://localhost:5173/bible/genese/3/concordance`. Expect: split-pane with verses on the left (with pericope headers like "Genèse 3:1-24 — La faute et le châtiment") and pericope cards on the right showing CCC chip lists.

- [ ] **Step 4: Commit:**

```bash
git add 'src/routes/bible/[book=biblebook]/[ch]/concordance/'
git commit -m "feat: /bible/[book]/[ch]/concordance sibling route"
```

### Task U7: Link from reading view to concordance view

**Files:** Modify `src/lib/components/bible/BibleReader.svelte` and the route loader.

- [ ] **Step 1: Update the route loader at `src/routes/bible/[book=biblebook]/[ch]/+page.ts`** to also fetch the manifest and pass `hasConcordance` to BibleReader (this was scaffolded in Task R1; verify it's in place; if not, add now).

- [ ] **Step 2: Update `BibleReader.svelte`** to accept `hasConcordance: boolean` and render the link near the chapter heading:

```svelte
{#if hasConcordance}
	<div class="mb-6 text-center">
		<a
			href="/bible/{book.slug}/{chapter}/concordance"
			class="font-ui text-[12px] uppercase tracking-[0.15em] text-accent hover:underline"
		>
			Voir la concordance →
		</a>
	</div>
{/if}
```

Place this just below the existing `<header>` block.

- [ ] **Step 3: Verify with a manual visit:** start dev and visit `/bible/genese/3` — the link should appear and navigate correctly.

- [ ] **Step 4: Commit:**

```bash
git add src/lib/components/bible/BibleReader.svelte 'src/routes/bible/[book=biblebook]/[ch]/+page.ts'
git commit -m "feat: link from reading view to concordance view when data exists"
```

---

## Section C — CCC Tab

### Task C1: TabConcordance

**Files:** Create `src/lib/components/panels/TabConcordance.svelte`.

- [ ] **Step 1: Write the panel content:**

```svelte
<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadConcordanceByParagraph } from '$lib/data/loaders';
	import type { ConcordanceByParagraphEntry } from '$lib/data/types';

	let entries = $state<ConcordanceByParagraphEntry[]>([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		const num = ctx?.paragraph;
		if (!num) {
			entries = [];
			return;
		}
		(async () => {
			const idx = await loadConcordanceByParagraph();
			entries = idx[String(num)] ?? [];
		})();
	});
</script>

<div class="font-ui text-xs text-muted mb-3">
	{entries.length} renvoi(s) de la concordance
</div>

{#if entries.length === 0}
	<p class="font-ui text-xs italic text-subtle">Aucun renvoi pour ce paragraphe.</p>
{:else}
	<ul class="space-y-2">
		{#each entries as entry, i (i)}
			<li>
				<a
					href="/bible/{entry.slug}/{entry.chapter}/concordance"
					class="block px-2 py-1 rounded border border-border hover:border-accent hover:bg-accent/5 transition-colors"
				>
					<span class="font-ui text-[13px] font-semibold text-accent">
						{entry.verseRef}
					</span>
					{#if entry.pericopeTitle}
						<span class="block text-[11px] text-foreground/70 leading-snug">
							{entry.pericopeTitle}
						</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}
```

- [ ] **Step 2: Wire into StudyPanel.** Modify `src/lib/components/panels/StudyPanel.svelte` to register the new tab. READ the current StudyPanel to find the tab list construction; add a tab `{ id: 'concordance', label: 'Concordance' }` for paragraph contexts (when `ctx.paragraph > 0`). The tab should be conditionally added only when `entries.length > 0` for performance, but a simpler version: always add the tab, and let the body show "Aucun renvoi" when empty.

  Actual integration depends on the existing tab-machinery shape. Read `StudyPanel.svelte` carefully and add `TabConcordance` exactly the way the other tabs are added.

- [ ] **Step 3: Run check + manual visit:** `npm run check`. Open `/ccc/309` (high-traffic paragraph), open the panel, verify the new tab appears and lists pericope chips.

- [ ] **Step 4: Commit:**

```bash
git add src/lib/components/panels/TabConcordance.svelte src/lib/components/panels/StudyPanel.svelte
git commit -m "feat: Concordance tab on CCC paragraph StudyPanel"
```

---

## Section V — Verification

### Task V1: Manual smoke test

- [ ] **Step 1:** Build data: `npx tsx scripts/prepare-data.ts`. Verify all of:
  - `static/data/bible/ncl-sections.json` exists, ~1000+ sections
  - `static/data/concordance/manifest.json` lists ~72 books
  - `static/data/concordance/genese/3.json` has multiple pericopes including "Genèse 3:1-24" with title "La faute et le châtiment"
  - `static/data/concordance/by-paragraph.json` has entries for 309, 1502, 385

- [ ] **Step 2:** Start dev: `npm run dev`. Visit:
  - `/bible/genese/3` — confirm "Voir la concordance →" link appears
  - `/bible/genese/3/concordance` — split-pane renders, left has verse text with pericope headers (titled in French), right has cards with CCC chips
  - Click a pericope header on the left → right pane scrolls to that pericope and highlights it
  - Click a verse with a badge on the left → right pane scrolls to the containing pericope
  - Click a CCC chip on the right → navigates to `/ccc/N`
  - `/ccc/309` — open StudyPanel, click Concordance tab, see ~30+ Bible pericope entries; click one to navigate to the right concordance view

- [ ] **Step 3:** Visit a chapter with no concordance data (e.g. `/bible/1-chroniques/1`) — the link should NOT appear, and `/bible/1-chroniques/1/concordance` should 404.

### Task V2: E2E test

**Files:** Create `tests/e2e/concordance-pericope.test.ts`.

- [ ] **Step 1: Write tests:**

```typescript
import { test, expect } from '@playwright/test';

test('concordance link appears for chapters with data', async ({ page }) => {
	await page.goto('/bible/genese/3');
	await expect(page.getByRole('link', { name: /Voir la concordance/i })).toBeVisible();
});

test('concordance page renders pericopes with French titles and CCC chips', async ({ page }) => {
	await page.goto('/bible/genese/3/concordance');
	await expect(page.getByText('La faute et le châtiment')).toBeVisible();
	// Pericope card should show "Genèse 3:1-24" range and at least one CCC chip
	await expect(page.getByText('Genèse 3:1-24').first()).toBeVisible();
	const cccChip = page.locator('a[href^="/ccc/"]').first();
	await expect(cccChip).toBeVisible();
});

test('clicking a pericope header on the left selects the matching pericope on the right', async ({
	page
}) => {
	await page.goto('/bible/genese/3/concordance');
	// Pick a specific pericope header on the left (button)
	const leftHeader = page.locator('button', { hasText: 'Genèse 3:1-24' }).first();
	await leftHeader.click();
	// The right pane should highlight the matching pericope card (border-accent class).
	// We assert by checking that the matching data-pericope-ref element gets a class change;
	// equivalent: confirm the chip area is in viewport.
	const rightCard = page.locator('[data-pericope-ref="Genèse 3:1-24"]');
	await expect(rightCard).toBeInViewport();
});

test('CCC tab on /ccc/309 lists Bible pericopes', async ({ page }) => {
	await page.goto('/ccc/309');
	// Open StudyPanel — depends on existing UI; use the panel-open mechanism.
	// If panel is already open by default on /ccc/[ref], skip the open step.
	const concordTab = page.getByRole('tab', { name: 'Concordance' });
	if ((await concordTab.count()) === 0) {
		test.skip(true, 'StudyPanel concordance tab not present');
	}
	await concordTab.click();
	await expect(page.getByRole('link', { name: /Genèse/ }).first()).toBeVisible();
});
```

- [ ] **Step 2: Run e2e:**

```bash
npm run test:e2e -- tests/e2e/concordance-pericope.test.ts
```

Expected: 4 passing.

- [ ] **Step 3: Commit:**

```bash
git add tests/e2e/concordance-pericope.test.ts
git commit -m "test: e2e tests for concordance pericope view and CCC tab"
```

### Task V3: Final sweep

- [ ] **Step 1:** Run full sweep:

```bash
npm run check
npm run test:unit -- --run
npm run lint
```

- [ ] **Step 2:** Output sizes — confirm reasonable:

```bash
ls -lh static/data/concordance/manifest.json static/data/concordance/by-paragraph.json
ls static/data/concordance/genese/ | wc -l   # should be ~50 chapters
du -sh static/data/concordance/              # total size sanity
```

- [ ] **Step 3:** If lint flagged formatting issues on concordance-touched files, run prettier on those files only and commit as `chore: prettier formatting`.

- [ ] **Step 4:** Final commit if any.

---

## Self-Review checklist

- [ ] Reverts cleanly remove all per-verse concordance UI from M1-M5/N1-N5
- [ ] NCL section titles parsed and merged into pericope titles
- [ ] Pericopes are NOT per-verse (one pericope per Didache commentary block, with multi-chapter span handled)
- [ ] Pericopes sorted (startVerse asc, broader first on ties)
- [ ] Mirror DR Fathers component structure (Reader + VerseList + PericopePanel + Card + Bar)
- [ ] CCC tab reads `by-paragraph.json` and lists Bible passages
- [ ] No prose stored or republished anywhere
- [ ] No "Didache" attribution visible
- [ ] Existing reading view at `/bible/[book]/[ch]` is unchanged in shape; gains only a small "Voir la concordance" link
- [ ] All checks/tests/e2e green at the end
