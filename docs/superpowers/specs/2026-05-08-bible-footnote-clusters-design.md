# Bible Footnote Cluster Grouping — Design

## Goal

When the CCC source cites multiple Bible verses under a single footnote (joined by `;` in the original text), the website should render them as **one** `<sup>` marker in the paragraph and as a group of verses in the side panel — each verse displaying the **same** marker number.

## Motivation (the §1021 bug)

CCC §1021 source has one footnote citing four verses:

> Cf. 2 Co 5, 8; Ph 1, 23; He 9, 27; 12, 23.

The upstream extraction explodes that into four magisterial-ref entries (idx 4, 5, 6, 7) and the rendered paragraph shows four consecutive `<sup>` markers (`4 5 6 7`) where there should be one. In the study panel's Bible tab, only the first verse displays a marker number; the other three appear without one — as if they were separate inline references.

The user wants behaviour that stays close to the source: a single footnote in the source becomes a single marker in the prose and one cluster of verses in the side panel.

## Approach

We don't need to reinterpret the upstream tree. We can detect clusters from the rendered HTML itself: a run of `<sup class="srcRef bibleRef">` markers separated only by whitespace IS a single source footnote. Group them, share the leader's idx as the displayed marker, strip the redundant sups from the prose, and the bug is gone.

This is a positional fix, not a semantic one — we don't try to interpret the `voir` prefix or the `bible_continuation` type. They remain useful signals elsewhere; they just aren't the source of truth for clustering.

## Data shape

`MagisterialRefRecord` (src/lib/data/types.ts) gains an optional `marker_idx`:

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

`bible_refs` and `text_html` semantics:
- `bible_refs` keeps one entry per verse (unchanged).
- `text_html` keeps **only the cluster leader's** sup; non-leader sups are stripped.

## Clustering rule

Walk text_html looking for `<sup class="srcRef bibleRef" data-idx="N">N</sup>` markers in source order. Two consecutive markers belong to the same cluster iff the substring between them matches `^\s*$` (whitespace only — including NBSP ` `).

For each maximal run of length ≥ 2:
- The first marker's `data-idx` is the **leader idx**.
- For each non-leader idx N in the run, set `magisterial_refs[i].marker_idx = leader_idx` where `magisterial_refs[i].idx === N`.
- Remove the non-leader `<sup>` elements from text_html (the leader's sup stays).

Singleton runs (length 1) are left alone — no `marker_idx` set, no html change.

## Pipeline integration

In `scripts/prepare/paragraphs.ts`, after the existing `cleaned` html and `magisterial_refs` array are built (lines 43–60 of the current file), run a new helper `groupConsecutiveBibleSups({ html, refs })` that returns `{ html, refs }` with the cluster pass applied. The helper lives in `scripts/prepare/source-data-fixes.ts` alongside `mergeBibleRefContinuations`.

The helper is pure (no I/O) and gets unit-tested directly. The `extractParagraphs` test fixture grows one new case covering a 4-element cluster.

## Rendering changes

### `src/lib/components/panels/TabBibleRefs.svelte`

Replace the current `styleForIdx(idx)` helper with `markerAndStyleForIdx(idx)`:

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
    // Solo ref — existing heuristic.
    return { marker: idx, style: /^voir\s/i.test(m.raw) ? 'sup' : 'inline' };
}
```

`parseRef` is updated to take `{ marker, style }` instead of `(idx, style)` and store `marker` on the resolved row. The `<sup class="ref-marker">{r.idx}</sup>` template uses `r.marker` instead of `r.idx`. The list iteration key remains `(r.raw + ':' + r.idx)` so each verse-row is uniquely keyed even when sharing a marker.

### `src/lib/components/cec/ParagraphRenderer.svelte`

No code change needed. After the data fix, text_html only contains the leader sup per cluster, so Pass 1's `bible_continuation` merge logic (which already handles single-cluster cases for parenthetical refs) is no longer reached for the stripped members. Click-handling on the leader sup opens the panel scrolled to the leader's bible_refs row, and the cluster members render below it in the panel.

## Bulk re-write

`npm run build` runs `prepare-data` and re-emits all 2865 `static/data/cec/paragraphs/*.json` files. The committed JSON is updated in the same commit.

Spot-check expectations:
- §1021: text_html has ONE sup `data-idx="4"` (followed by ` parlent`). magisterial_refs idx 5/6/7 carry `marker_idx: 4`.
- §500: cluster `[1,2,3,4]` shares marker 1; cluster `[8,9,10]` shares marker 8; idx 5/6/7 stay solo.
- A paragraph with no clusters (e.g. §27) is byte-for-byte unchanged.

## Tests

**Unit** (`tests/unit/prepare/source-data-fixes.test.ts`): new describe block for `groupConsecutiveBibleSups`:
- Single sup paragraph → unchanged.
- Two consecutive sups → one stripped, second's magisterial ref gains `marker_idx`.
- Three consecutive sups, with a non-bible (cccRef) sup interleaved → two separate runs, each handled independently.
- Sup pair separated by literal text → stays as two separate refs.
- Whitespace (incl. NBSP) between sups → still treated as consecutive.

**Unit** (`tests/unit/prepare/paragraphs.test.ts`): one new fixture asserting that `extractParagraphs` propagates `marker_idx` into the output Paragraph.

**E2E** (`tests/e2e/study-panel.test.ts`): open `/cec/1021`, click a bibleRef sup to open the panel on the Bible tab, assert that there are exactly 4 verse rows AND each row's marker (`<sup>`) reads "4". Also assert the rendered paragraph contains exactly one bibleRef sup at the position of the cluster (no consecutive sups remain).

## Out of scope

- Cluster leaders whose magisterial-ref `raw` does not start with `voir` (e.g. §1006 "Rm 6:23"). Our `isLeader` check makes them render as sup style in the side panel as a side-effect of the fix; we don't audit the broader voir-vs-inline classification.
- Inline parenthetical bible refs (singleton, no sup in text). They stay inline.
- Non-bible sup clusters (cccRef, docRef). The user's complaint is bible-specific and the heuristic only inspects bibleRef sups.

## Implementation order

1. Add `marker_idx` to MagisterialRefRecord type.
2. Implement and test `groupConsecutiveBibleSups` in source-data-fixes.ts.
3. Wire it into `extractParagraphs` in paragraphs.ts; extend its unit test.
4. Update TabBibleRefs to use `markerAndStyleForIdx`.
5. Re-run `npm run build` to regenerate all paragraph JSON. Commit the regenerated bundle in a dedicated commit.
6. Add the §1021 e2e check.
