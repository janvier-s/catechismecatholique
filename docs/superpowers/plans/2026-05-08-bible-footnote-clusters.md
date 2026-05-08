# Bible Footnote Cluster Grouping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse runs of consecutive `<sup class="srcRef bibleRef">` markers in CCC paragraphs into a single marker per source footnote, and have the side panel show every verse in the cluster sharing the leader's marker number.

**Architecture:** Pure data-pipeline change driven by a positional helper that walks `text_html`. Detect maximal runs of bibleRef sups separated only by whitespace; the first sup's idx becomes the cluster leader; non-leader members get `marker_idx = leader_idx` on their magisterial-ref entry; non-leader sup elements are stripped from `text_html`. The reader (ParagraphRenderer) needs no logic change because there is now only one bibleRef sup per cluster in the prose. The Bible-tab side panel (TabBibleRefs) reads the new `marker_idx` to display the shared marker number.

**Tech Stack:** TypeScript strict, Svelte 5 runes, Vitest for unit tests, Playwright for e2e.

**Spec:** `docs/superpowers/specs/2026-05-08-bible-footnote-clusters-design.md`

---

## Pre-flight (controller, before dispatching)

- Confirm working tree is clean. The plan assumes the spec commit at `0187ab2` is the latest.
- Confirm `npm run check`, `npm run test`, and `npm run build` all pass against `main` so any regression introduced by the plan is attributable to the plan.

---

### Task 1: Cluster-detection helper (`groupConsecutiveBibleSups`)

**Files:**
- Modify: `src/lib/data/types.ts` (add `marker_idx?: number` to `MagisterialRefRecord`)
- Modify: `scripts/prepare/source-data-fixes.ts` (add new exported helper)
- Modify: `tests/unit/prepare/source-data-fixes.test.ts` (new describe block)

The helper takes the raw paragraph html plus the array of magisterial-ref records (already populated upstream) and returns `{ html, refs }` with the cluster pass applied. Pure function. The strategy is text-mode regex over `text_html`: there is one canonical shape (`<sup class="srcRef bibleRef" data-idx="N">N</sup>`), so a global regex over the string is faster and more robust than DOM parsing in a Node script context.

- [ ] **Step 1: Add `marker_idx?: number` to MagisterialRefRecord**

In `src/lib/data/types.ts`, append the new field to `MagisterialRefRecord` with the JSDoc the spec specifies:

```typescript
export interface MagisterialRefRecord {
    type: 'magisterial' | 'patristic' | 'liturgical' | 'bible' | 'bible_continuation';
    abbr?: string;
    raw: string;
    idx?: string | number;
    doc_raw?: string;
    /** Displayed marker number in text + side panel. For cluster members this
     *  points to the cluster leader's idx so the side panel groups all verses
     *  under one footnote number. Solo refs leave it undefined (display marker
     *  equals their own idx). */
    marker_idx?: number;
}
```

- [ ] **Step 2: Write the failing tests for `groupConsecutiveBibleSups`**

Append to `tests/unit/prepare/source-data-fixes.test.ts`:

```typescript
import { groupConsecutiveBibleSups } from '../../../scripts/prepare/source-data-fixes';

describe('groupConsecutiveBibleSups', () => {
    const sup = (idx: number) =>
        `<sup class="srcRef bibleRef" data-idx="${idx}">${idx}</sup>`;
    const cccSup = (n: number) => `<sup class="srcRef cccRef">§${n}</sup>`;

    it('leaves a paragraph with one bibleRef sup unchanged', () => {
        const html = `<span>texte ${sup(1)}.</span>`;
        const refs = [{ type: 'bible' as const, raw: 'voir Mt 5:1', idx: 1 }];
        const result = groupConsecutiveBibleSups({ html, refs });
        expect(result.html).toBe(html);
        expect(result.refs).toEqual(refs);
    });

    it('collapses two consecutive sups, marking the second member', () => {
        const html = `<span>texte ${sup(1)}${sup(2)}.</span>`;
        const refs = [
            { type: 'bible' as const, raw: 'voir 2 Co 5:8', idx: 1 },
            { type: 'bible' as const, raw: 'Ph 1:23', idx: 2 }
        ];
        const result = groupConsecutiveBibleSups({ html, refs });
        expect(result.html).toBe(`<span>texte ${sup(1)}.</span>`);
        expect(result.refs[0]).toEqual(refs[0]);
        expect(result.refs[1]).toEqual({ ...refs[1], marker_idx: 1 });
    });

    it('collapses a 4-sup cluster (§1021 case)', () => {
        const html = `<span>${sup(4)}${sup(5)}${sup(6)}${sup(7)} parlent.</span>`;
        const refs = [
            { type: 'bible' as const, raw: 'voir 2 Co 5:8', idx: 4 },
            { type: 'bible' as const, raw: 'Ph 1:23', idx: 5 },
            { type: 'bible' as const, raw: 'He 9:27', idx: 6 },
            { type: 'bible_continuation' as const, raw: '12:23', idx: 7 }
        ];
        const result = groupConsecutiveBibleSups({ html, refs });
        expect(result.html).toBe(`<span>${sup(4)} parlent.</span>`);
        expect(result.refs[0].marker_idx).toBeUndefined();
        expect(result.refs[1].marker_idx).toBe(4);
        expect(result.refs[2].marker_idx).toBe(4);
        expect(result.refs[3].marker_idx).toBe(4);
    });

    it('handles two non-adjacent clusters in the same paragraph', () => {
        const html =
            `<span>A ${sup(1)}${sup(2)}. B ${sup(3)}. C ${sup(4)}${sup(5)}${sup(6)}.</span>`;
        const refs = [
            { type: 'bible' as const, raw: 'voir Mc 1:1', idx: 1 },
            { type: 'bible' as const, raw: 'Mc 1:2', idx: 2 },
            { type: 'bible' as const, raw: 'voir Lc 1:1', idx: 3 },
            { type: 'bible' as const, raw: 'voir Jn 1:1', idx: 4 },
            { type: 'bible' as const, raw: 'Jn 1:2', idx: 5 },
            { type: 'bible' as const, raw: 'Jn 1:3', idx: 6 }
        ];
        const result = groupConsecutiveBibleSups({ html, refs });
        expect(result.html).toBe(`<span>A ${sup(1)}. B ${sup(3)}. C ${sup(4)}.</span>`);
        expect(result.refs.map((r) => r.marker_idx)).toEqual([
            undefined,
            1,
            undefined,
            undefined,
            4,
            4
        ]);
    });

    it('does NOT cluster across a non-bibleRef sup (cccRef breaks the run)', () => {
        const html = `<span>${sup(1)}${cccSup(42)}${sup(2)}.</span>`;
        const refs = [
            { type: 'bible' as const, raw: 'Mt 1:1', idx: 1 },
            { type: 'bible' as const, raw: 'Mt 1:2', idx: 2 }
        ];
        const result = groupConsecutiveBibleSups({ html, refs });
        expect(result.html).toBe(html);
        expect(result.refs.every((r) => r.marker_idx === undefined)).toBe(true);
    });

    it('does NOT cluster sups separated by literal text', () => {
        const html = `<span>${sup(1)} et ${sup(2)}.</span>`;
        const refs = [
            { type: 'bible' as const, raw: 'Mt 1:1', idx: 1 },
            { type: 'bible' as const, raw: 'Mt 1:2', idx: 2 }
        ];
        const result = groupConsecutiveBibleSups({ html, refs });
        expect(result.html).toBe(html);
        expect(result.refs.every((r) => r.marker_idx === undefined)).toBe(true);
    });

    it('treats whitespace + NBSP between sups as consecutive', () => {
        const html = `<span>${sup(1)}  ${sup(2)}.</span>`;
        const refs = [
            { type: 'bible' as const, raw: 'voir Mt 1:1', idx: 1 },
            { type: 'bible' as const, raw: 'Mt 1:2', idx: 2 }
        ];
        const result = groupConsecutiveBibleSups({ html, refs });
        expect(result.html).toBe(`<span>${sup(1)}.</span>`);
        expect(result.refs[1].marker_idx).toBe(1);
    });
});
```

- [ ] **Step 3: Run the new tests to verify they fail with "is not a function"**

Run: `npx vitest run tests/unit/prepare/source-data-fixes.test.ts`
Expected: All seven new cases fail because `groupConsecutiveBibleSups` is not exported yet. Existing cases continue to pass.

- [ ] **Step 4: Implement `groupConsecutiveBibleSups`**

Append to `scripts/prepare/source-data-fixes.ts`:

```typescript
const BIBLE_SUP_RE = /<sup class="srcRef bibleRef" data-idx="(\d+)">\d+<\/sup>/g;

interface SupHit {
    idx: number;
    start: number;
    end: number;
}

interface RefLike {
    type: string;
    raw: string;
    idx?: string | number;
    [key: string]: unknown;
}

/**
 * Detect runs of consecutive `<sup class="srcRef bibleRef">` markers in the
 * paragraph html — runs of length ≥ 2 represent a single source footnote that
 * the upstream pipeline split per-verse. For each run, mark the trailing
 * members' magisterial-ref entries with `marker_idx = leader_idx` and strip
 * their `<sup>` element from the html. The leader's sup stays in place.
 *
 * "Consecutive" means whitespace-only (incl. NBSP) between two markers — any
 * other text or tag breaks the run. Pure function: returns a new html string
 * and a new refs array; inputs are not mutated.
 */
export function groupConsecutiveBibleSups<T extends RefLike>(input: {
    html: string;
    refs: T[];
}): { html: string; refs: T[] } {
    const { html, refs } = input;

    // Collect every bibleRef sup with its position. Plain regex over a known
    // canonical shape — the upstream emits exactly one variant of the tag.
    const hits: SupHit[] = [];
    BIBLE_SUP_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BIBLE_SUP_RE.exec(html)) !== null) {
        hits.push({ idx: parseInt(m[1]!, 10), start: m.index, end: m.index + m[0].length });
    }
    if (hits.length < 2) return { html, refs: [...refs] };

    // Walk the hit list, growing maximal runs where the gap between two hits
    // is whitespace-only. Any non-whitespace character (including another sup
    // class like cccRef) breaks the run.
    const runs: SupHit[][] = [];
    let current: SupHit[] = [hits[0]!];
    for (let i = 1; i < hits.length; i++) {
        const gap = html.slice(hits[i - 1]!.end, hits[i]!.start);
        if (/^\s*$/.test(gap)) {
            current.push(hits[i]!);
        } else {
            if (current.length > 1) runs.push(current);
            current = [hits[i]!];
        }
    }
    if (current.length > 1) runs.push(current);

    if (runs.length === 0) return { html, refs: [...refs] };

    // Apply changes: refs first (cheap copy), then html (rebuild from slices
    // so we walk the string exactly once and never have to re-index after
    // edits invalidate offsets).
    const refsByIdx = new Map<number, number>();
    refs.forEach((r, i) => {
        if (r.idx !== undefined && r.idx !== null) {
            const n = typeof r.idx === 'number' ? r.idx : parseInt(String(r.idx), 10);
            if (Number.isFinite(n)) refsByIdx.set(n, i);
        }
    });

    const nextRefs = refs.map((r) => ({ ...r }));
    for (const run of runs) {
        const leader = run[0]!.idx;
        for (let i = 1; i < run.length; i++) {
            const ri = refsByIdx.get(run[i]!.idx);
            if (ri !== undefined) (nextRefs[ri] as RefLike).marker_idx = leader;
        }
    }

    // Build a Set of [start,end) ranges to strip. Then walk the string once.
    // Strip range for each trailing member extends back to the previous sup's
    // end, so whitespace between consecutive sups is consumed too — otherwise
    // a paragraph like `<sup1>  <sup2>.` would collapse to `<sup1>  .` with
    // dangling whitespace before the period.
    const stripRanges: { start: number; end: number }[] = [];
    for (const run of runs) {
        for (let i = 1; i < run.length; i++) {
            stripRanges.push({ start: run[i - 1]!.end, end: run[i]!.end });
        }
    }
    stripRanges.sort((a, b) => a.start - b.start);

    const out: string[] = [];
    let cursor = 0;
    for (const { start, end } of stripRanges) {
        out.push(html.slice(cursor, start));
        cursor = end;
    }
    out.push(html.slice(cursor));

    return { html: out.join(''), refs: nextRefs };
}
```

- [ ] **Step 5: Run all unit tests; verify the new ones pass and nothing else regresses**

Run: `npx vitest run tests/unit/prepare/source-data-fixes.test.ts`
Expected: All cases pass (existing + 7 new).

Then run: `npx vitest run`
Expected: Whole unit suite still green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/types.ts scripts/prepare/source-data-fixes.ts tests/unit/prepare/source-data-fixes.test.ts
git commit -m "feat(prepare): groupConsecutiveBibleSups helper for footnote clusters"
```

---

### Task 2: Wire the helper into the paragraphs extractor

**Files:**
- Modify: `scripts/prepare/paragraphs.ts`
- Modify: `tests/unit/prepare/paragraphs.test.ts`

- [ ] **Step 1: Write a failing test asserting cluster propagation**

Append to `tests/unit/prepare/paragraphs.test.ts`:

```typescript
it('propagates marker_idx for consecutive bibleRef sups (§1021 case)', () => {
    const sup = (idx: number) =>
        `<sup class="srcRef bibleRef" data-idx="${idx}">${idx}</sup>`;
    const html = `<span>texte ${sup(4)}${sup(5)}${sup(6)}${sup(7)} parlent.</span>`;
    const fixture = [
        {
            type: 'part',
            children: [
                {
                    type: 'paragraph',
                    number: 1021,
                    text_html: html,
                    cross_refs: [],
                    bible_refs: [
                        { text: '2 Co 5:8' },
                        { text: 'Ph 1:23' },
                        { text: 'He 9:27' },
                        { text: 'He 12:23' }
                    ],
                    citations: [],
                    refs: [
                        { type: 'bible', raw: 'voir 2 Co 5:8', idx: 4 },
                        { type: 'bible', raw: 'Ph 1:23', idx: 5 },
                        { type: 'bible', raw: 'He 9:27', idx: 6 },
                        { type: 'bible_continuation', raw: '12:23', idx: 7 }
                    ]
                }
            ]
        }
    ];
    const result = extractParagraphs(fixture as Parameters<typeof extractParagraphs>[0]);
    const p = result.get(1021);
    expect(p?.text_html).toBe(`<span>Texte ${sup(4)} parlent.</span>`);
    expect(p?.magisterial_refs.map((r) => r.marker_idx)).toEqual([undefined, 4, 4, 4]);
});
```

(`capitalizeFirstWord` will uppercase the leading `t` of `texte` — that's why the expected html starts `Texte`. This is the existing extractor behaviour, just preserved in the assertion.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/prepare/paragraphs.test.ts`
Expected: New case fails — `text_html` still has 4 sups; `marker_idx` fields are all `undefined`.

- [ ] **Step 3: Wire the helper into `extractParagraphs`**

In `scripts/prepare/paragraphs.ts`, add `groupConsecutiveBibleSups` to the import from `./source-data-fixes` and apply it after the `cleaned` html and `magisterial_refs` array are built. Replace the body of the `if (node.type === 'paragraph' …)` block with:

```typescript
const cleaned = stripInlineDocCitations(
    capitalizeFirstWord(normalizeGuillemets(node.text_html ?? ''))
);
const initialRefs = (node.refs ?? []).map((r) => ({
    type: r.type as Paragraph['magisterial_refs'][number]['type'],
    raw: r.raw,
    idx: r.idx,
    doc_raw: r.doc_raw
}));
const grouped = groupConsecutiveBibleSups({ html: cleaned, refs: initialRefs });
out.set(node.number, {
    corpus: 'ccc',
    number: node.number,
    text_html: grouped.html,
    cross_refs: node.cross_refs ?? [],
    bible_refs: mergeBibleRefContinuations(
        (node.bible_refs ?? []).map((b) => ({ text: b.text }))
    ),
    citations: (node.citations ?? []).map((c) => ({ text_html: c.text_html })),
    magisterial_refs: grouped.refs
});
```

- [ ] **Step 4: Run tests to verify the new case passes**

Run: `npx vitest run tests/unit/prepare/paragraphs.test.ts`
Expected: Both existing and new cases pass.

- [ ] **Step 5: Run the full unit suite + svelte-check to confirm no regression**

Run: `npx vitest run && npm run check`
Expected: Both green.

- [ ] **Step 6: Commit**

```bash
git add scripts/prepare/paragraphs.ts tests/unit/prepare/paragraphs.test.ts
git commit -m "feat(prepare): cluster consecutive bibleRef sups in extracted paragraphs"
```

---

### Task 3: Side panel renders cluster members with shared marker

**Files:**
- Modify: `src/lib/components/panels/TabBibleRefs.svelte`

The current `styleForIdx(idx)` only returns a style. We replace it with `markerAndStyleForIdx(idx)` which also returns the displayed marker number. The resolved-row type (`RefWithVerses`) gains a `marker: number` field; the template's marker `<sup>` reads `r.marker` instead of `r.idx`.

- [ ] **Step 1: Replace `styleForIdx` with `markerAndStyleForIdx`**

In `src/lib/components/panels/TabBibleRefs.svelte`, replace lines 67–70 (the current `styleForIdx`) with:

```typescript
function markerAndStyleForIdx(idx: number): { marker: number; style: RefStyle } {
    const m = magisterial.find((r) => Number(r.idx) === idx);
    if (!m) return { marker: idx, style: 'inline' };
    // Cluster member — share leader's marker, always sup style.
    if (m.marker_idx !== undefined && m.marker_idx !== idx) {
        return { marker: m.marker_idx, style: 'sup' };
    }
    // Cluster leader — at least one other ref points at me. Always sup.
    const isLeader = magisterial.some((r) => r.marker_idx === idx);
    if (isLeader) return { marker: idx, style: 'sup' };
    // Solo ref — existing voir heuristic.
    return { marker: idx, style: /^voir\s/i.test(m.raw) ? 'sup' : 'inline' };
}
```

- [ ] **Step 2: Update `ParsedRef` and `parseRef` to carry `marker`**

Change the type alias and parser in the same file:

```typescript
type ParsedRef = {
    raw: string;
    idx: number;
    marker: number;  // 1-based number to display; differs from idx for cluster members
    style: RefStyle;
    book: BookInfo;
    chapter: number;
    fromV?: number;
    toV?: number;
};

function parseRef(
    raw: string,
    idx: number,
    marker: number,
    style: RefStyle
): ParsedRef | null {
    const m = raw.match(/^([1-3]?\s*[A-Za-zÉéèê]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?/);
    if (!m) return null;
    const book = bookByAbbr(m[1]!.trim());
    if (!book) return null;
    const chapter = parseInt(m[2]!, 10);
    const fromV = m[3] ? parseInt(m[3], 10) : undefined;
    const toV = m[4] ? parseInt(m[4], 10) : fromV;
    return { raw, idx, marker, style, book, chapter, fromV, toV };
}
```

- [ ] **Step 3: Update the resolution effect to call the new helper**

Replace the body of the `$effect` that builds `resolved` (lines 72–90) with:

```typescript
$effect(() => {
    if (!bible) return;
    const out: RefWithVerses[] = [];
    for (let i = 0; i < refs.length; i++) {
        const idx = i + 1;
        const { marker, style } = markerAndStyleForIdx(idx);
        const parsed = parseRef(refs[i]!.text, idx, marker, style);
        if (!parsed) continue;
        const verses: { v: number; text: string }[] = [];
        if (parsed.fromV !== undefined && parsed.toV !== undefined) {
            const chapterVerses = bible[parsed.book.usfx]?.[String(parsed.chapter)] ?? {};
            for (let v = parsed.fromV; v <= parsed.toV; v++) {
                const text = chapterVerses[String(v)];
                if (text) verses.push({ v, text });
            }
        }
        out.push({ ...parsed, verses });
    }
    resolved = out;
});
```

- [ ] **Step 4: Use `r.marker` (not `r.idx`) in the rendered marker `<sup>`**

In the template, replace:

```svelte
{#if r.style === 'sup'}
    <sup class="ref-marker">{r.idx}</sup>
{/if}
```

with:

```svelte
{#if r.style === 'sup'}
    <sup class="ref-marker">{r.marker}</sup>
{/if}
```

The `data-idx` on the `<li>` and the list key continue to use `r.idx` so each verse-row remains uniquely targeted by the scroll-to-idx effect.

- [ ] **Step 5: Type-check**

Run: `npm run check`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/panels/TabBibleRefs.svelte
git commit -m "feat(panel): cluster members share leader's marker in Bible tab"
```

---

### Task 4: Bulk regenerate the committed paragraph JSON

**Files:**
- Modify: `static/data/cec/paragraphs/*.json` (all 2865 files; many will be byte-identical, only cluster-bearing ones change)

- [ ] **Step 1: Run the prepare-data pipeline**

Run: `npm run build`
Expected: build completes; `git status` shows changes only under `static/data/cec/paragraphs/` and possibly other generated bundles, no source-code changes.

If `npm run build` triggers a vite production build that writes to `.svelte-kit/` or similar, that's expected — discard those non-data changes via `git restore` after the data has been written. The only paths that should be staged in this commit are under `static/data/`.

- [ ] **Step 2: Spot-check three paragraphs**

```bash
node -e 'const p = require("./static/data/cec/paragraphs/1021.json"); const sups = (p.text_html.match(/<sup class="srcRef bibleRef"/g) || []).length; const markers = p.magisterial_refs.map(r => r.marker_idx); console.log("§1021 bibleRef sup count:", sups, "(expect 5)"); console.log("§1021 marker_idx:", markers);'
```
Expected: `§1021 bibleRef sup count: 5 (expect 5)` (idx 1, 2, 3, 4, 8 — the four-cluster collapses to one). `§1021 marker_idx: [undefined, undefined, undefined, undefined, 4, 4, 4, undefined]`.

```bash
node -e 'const p = require("./static/data/cec/paragraphs/500.json"); console.log(p.text_html.match(/<sup class="srcRef bibleRef" data-idx="\d+">/g));'
```
Expected: 5 leaders (idx 1, 5, 6, 7, 8) — clusters [1-4] and [8-10] collapse, idx 5/6/7 stay solo.

```bash
node -e 'const p = require("./static/data/cec/paragraphs/27.json"); console.log(p.magisterial_refs.every(r => r.marker_idx === undefined));'
```
Expected: `true` — §27 has no clusters; nothing changes.

- [ ] **Step 3: Re-run the unit + svelte-check suites against the regenerated bundle**

Run: `npm run check && npx vitest run`
Expected: both green.

- [ ] **Step 4: Commit ONLY the static-data changes**

```bash
git add static/data/cec/paragraphs/
git commit -m "data(cec): regenerate paragraphs with cluster marker_idx"
```

If other build artefacts ended up in the working tree (e.g. `.svelte-kit/`), do NOT include them in this commit. `git restore` them or list them in a separate cleanup commit.

---

### Task 5: E2E test for §1021 cluster rendering

**Files:**
- Modify: `tests/e2e/study-panel.test.ts`

- [ ] **Step 1: Add the §1021 cluster test**

Append to the existing study-panel describe block:

```typescript
test('§1021 collapses 4 consecutive bibleRef sups and shares marker 4 in the panel', async ({ page }) => {
    await page.goto('/cec/1021');
    // Reader shows ONE bibleRef sup at the cluster position. The paragraph
    // has other (non-clustered) bibleRef sups too — assert that no two
    // bibleRef sups are direct DOM siblings any more.
    const consecutivePairs = await page.evaluate(() => {
        const sups = Array.from(document.querySelectorAll('sup.srcRef.bibleRef'));
        let pairs = 0;
        for (const s of sups) {
            const next = s.nextElementSibling;
            if (next && next.tagName === 'SUP' && next.classList.contains('bibleRef')) pairs++;
        }
        return pairs;
    });
    expect(consecutivePairs).toBe(0);

    // Open the panel on the cluster's leader sup (idx 4) and switch to the Bible tab.
    await page.locator('sup.srcRef.bibleRef[data-idx="4"]').first().click();
    const bibleTab = page.getByRole('button', { name: 'Bible', exact: true }).first();
    await bibleTab.click();

    // The cluster yields four verse-rows: 2 Co 5:8, Ph 1:23, He 9:27, He 12:23.
    // Each row's marker (the leading <sup>) reads "4".
    const rows = page
        .locator('li[data-idx]')
        .filter({ has: page.locator('sup.ref-marker') })
        .filter({ visible: true });
    // Read all marker texts; we expect at least four "4"s in a row.
    const markers = await rows.evaluateAll((els) =>
        els.map((el) => el.querySelector('sup.ref-marker')?.textContent?.trim() ?? '')
    );
    const fours = markers.filter((m) => m === '4').length;
    expect(fours).toBeGreaterThanOrEqual(4);
});
```

- [ ] **Step 2: Run the e2e test (Playwright auto-starts the dev/preview server)**

Run: `npx playwright test tests/e2e/study-panel.test.ts -g "§1021"`
Expected: PASS.

- [ ] **Step 3: Run the full e2e suite to confirm no neighbour regressed**

Run: `npm run test:e2e`
Expected: full suite green.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/study-panel.test.ts
git commit -m "test(e2e): §1021 collapses cluster sups + shares marker 4"
```

---

## Self-review checklist (controller, after all tasks complete)

Before dispatching a final code-reviewer:

1. **Spec coverage.** Walk the design's "Implementation order" list (1–6); every item maps to a task above.
2. **Type consistency.** `marker_idx` is referenced consistently (`MagisterialRefRecord` field, helper return shape, panel rendering) — no rename mid-flight.
3. **Reader unaffected.** No code change to ParagraphRenderer.svelte; the regenerated text_html guarantees only one bibleRef sup per cluster, so existing logic just sees fewer sups.
4. **Search / loaders.** Search-index uses `stripHtml(text_html)` only — strip doesn't see sups anyway. Loaders don't inspect `marker_idx`. No additional plumbing.
