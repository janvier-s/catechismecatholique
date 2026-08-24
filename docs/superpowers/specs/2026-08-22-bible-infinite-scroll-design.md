# Bible reader: infinite scroll

Implements section 2.4 of `2026-08-21-bible-reader-odr-port-design.md`, the last
open item in that roadmap. Parts 1 and 2.1 to 2.3 are shipped.

## Context

The reference implementation is the sibling ODR project at
`~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible`:
`src/lib/utils/infiniteScroll.ts` (62 lines) and the wiring inside
`src/lib/components/BibleReader.svelte`. This is a port, not a fresh design, so
the sections below concentrate on where the two codebases differ.

Four facts shape everything that follows.

**The whole book is already in memory.** `+page.ts` calls `loadNclBook()` and
`loadNclParagraphsBook()`, both of which return the entire book keyed by chapter
and both of which cache at module scope. Genèse 1 to Genèse 2 is therefore pure
rendering. Only a book boundary costs a network request.

**One `<main>`, one column-width rule.** `app.css:389-406` hangs the Bible
column-width compensation off `main[data-corpus='bible'].max-w-reader`. The
`.verse-text` targets of 702px, 552px and 872px that
`tests/e2e/bible-reading-mode.test.ts` guards depend on it. Appended chapters
must live inside that same single `<main>`.

**Session data covers every book.** `/bible/+layout.ts` loads the verse index,
the concordance manifest, the NCL section map and the chapter counts for the
whole Bible, and SvelteKit merges layout data into the page's `data` prop. A book
boundary needs only the two NCL JSONs; nothing else has to be fetched.

**The chrome store reads the same scroll stream.** `src/lib/stores/chrome.ts`
hides and reveals both sticky bars by comparing `window.scrollY` against a
decision anchor. Every scroll compensation this feature performs is a jump in
`scrollY` that no reader asked for, and the chrome store will otherwise act on
it. Section 4 handles this, and it is the first place to look if the header ever
flickers during a content prepend.

## 1. Data plumbing

`+page.ts` keeps returning a single chapter. `BibleReader` reaches for the rest
of the book itself, client-side, and only when the pref is on. Within a book that
call is a module-cache hit, because the page load already made it. Readers who
never enable the pref pay nothing, and the SSR payload does not change. Inlining
a whole book instead would add 216KB for Genèse and 252KB for the psalter to
every chapter's HTML.

Two `+page.ts` changes are needed so the reader can render chapters it was not
given at load time.

`sections` currently returns `chapterSections`, the current chapter's slice,
which **shadows** the layout's full `NclSectionMap`. That filter moves into the
reader: the page stops returning `sections` at all, and `BibleReader` takes the
layout map as `sectionsByBook` (keyed by USFX, per `types.ts:309`) and slices per
loaded chapter. `BibleReader` already filters by `s.ch === chapter` in its
`headingsByBlock` derivation, so this removes a duplicated concern rather than
adding one.

`hasConcordance` collapses the manifest to a boolean for one chapter, at load
time. `BibleReader`'s prop becomes the manifest itself
(`Record<slug, number[]>`), and the reader derives the boolean for whichever
chapter is active, so the sticky bar's concordance link retargets as the reader
scrolls. `ChapterNavBar`'s own `hasConcordance: boolean` prop is unchanged.

`chapterCounts` is keyed by **USFX**, not by slug, which the chapter cursor in
section 2 depends on.

## 2. New pure modules

### `src/lib/utils/chapterCursor.ts`

```ts
export interface ChapterRef { bookSlug: string; usfx: string; chapter: number; }
export function nextChapterRef(ref: ChapterRef, counts: Record<string, number>): ChapterRef | null;
export function prevChapterRef(ref: ChapterRef, counts: Record<string, number>): ChapterRef | null;
```

Pure arithmetic over `getNextBook` / `getPrevBook` from `bibleBookSlug.ts` plus
the chapter counts. Genèse 50 gives Exode 1; Apocalypse 22 gives `null`; Genèse 1
backwards gives `null`. This is the whole of the book-boundary logic, and it is
testable without a DOM.

### `src/lib/utils/infiniteScroll.ts`

Ported from ODR, with one structural change. ODR's observer callback carries the
rule that decides whether a heading leaving the top band is a genuine scroll-up
crossing or a freshly appended heading firing its first observation:

```
top > 0 && top < window.innerHeight
```

That rule is the subtlest thing in the file and in ODR it is unreachable from a
test. It is extracted here:

```ts
export const SCROLL_THRESHOLD = 400;

export function shouldLoadNext(scrollY: number, innerHeight: number, docHeight: number): boolean;

export type Crossing = { kind: 'enter' | 'exit-up'; bookSlug: string; chapter: number } | null;
export function chapterCrossing(input: {
  isIntersecting: boolean;
  top: number;
  viewportHeight: number;
  bookSlug: string;
  chapter: number;
}): Crossing;

export function createChapterObserver(onCrossing: (c: NonNullable<Crossing>) => void): IntersectionObserver;
export function observeAllAnchors(container: HTMLElement, observer: IntersectionObserver): void;
export function observeNewAnchor(container, observer, bookSlug: string, chapter: number): void;
```

`createChapterObserver` becomes a thin DOM adapter: it reads the dataset off the
entry, calls `chapterCrossing`, and forwards a non-null result. The observer keeps
ODR's `rootMargin: '0px 0px -70% 0px'`, so a chapter becomes active as its anchor
crosses the top 30% of the viewport.

## 3. Component split

`BibleChapter.svelte` takes the `<header>` and `<article>` blocks out of
`BibleReader.svelte` verbatim, with props `book`, `chapter`, `verses`,
`paragraphs`, `sections`, `verseIdx`, `studyMode` and `headingLevel`. Everything
that is page-level rather than chapter-level stays behind: the sticky
`ChapterNavBar`, the single `<main data-corpus="bible">` with its layout
attributes, the footer nav and all the scroll machinery.

The reader then loops loaded chapters inside that one `<main>`, each preceded by
an empty anchor div carrying `data-chapter-anchor`, `data-book-slug` and
`data-chapter-num` for the observer to watch. The first rendered chapter uses
`h1`, later ones `h2`.

`<svelte:head><title>` moves from `+page.svelte` into `BibleReader`, derived from
the active chapter so it tracks the URL as chapters pass the viewport.
`replaceState` does not re-run `load`, so a title left in the page component
would freeze on the entry chapter. With nothing scrolled the string is identical
to today's, and no e2e test asserts on it.

The footer `← Chapitre N-1 / Chapitre N+1 →` renders only when infinite scroll is
off, matching ODR's `showNav={!$prefs.infiniteScroll}`. Between two loaded
chapters it would be a wall across the flow.

The sticky `ChapterNavBar` stays visible in both modes and follows the active
chapter. It is **not** coupled to `hideChapterNav`, which is where this design
departs from ODR: in this project that row also holds the Lecture/Étude toggle
and the concordance link, so hiding it would strand two controls that have no
other home. `hideChapterNav` remains an independent user choice.

## 4. Cooperating with the chrome store

`nextChromeState` compares the incoming `scrollY` against `state.lastY`. A
prepend compensation of, say, +900px reads as a deliberate downward scroll and
hides both bars. A prune-front compensation reads as upward travel and can cross
`REVEAL_AFTER_UP` and pop them back. Neither existing escape hatch helps:
`suspendChrome` and `revealChrome` both call `resetState()`, which publishes
`hidden: false` and would flash the bars into view.

A third operation is added, as a pure reducer beside `nextChromeState`:

```ts
/** Re-anchor after the document shifted under the reader (an infinite-scroll
 *  prepend or prune compensation). Leaves `hidden` and `upDistance` untouched:
 *  the reader did not scroll, the page moved. */
export function shiftChromeAnchor(state: ChromeScrollState, delta: number): ChromeScrollState {
  return { ...state, lastY: Math.max(0, state.lastY + delta) };
}
```

plus a wired `anchorChromeShift(delta: number)` that applies it to the module
state without publishing.

**Ordering, which is what makes this work.** `anchorChromeShift` is called
synchronously immediately after `window.scrollTo`. The browser dispatches the
resulting scroll event afterwards, and `chrome.ts`'s handler reads
`window.scrollY` inside a `requestAnimationFrame` rather than at event time. So
by the time any pending frame runs, both the position and the anchor have moved
by the same delta and the reducer sees no travel. A genuine user scroll that had
a frame in flight across the shift loses a few pixels of accumulated `upDistance`,
which is below the 120px reveal threshold and not observable.

## 5. Reader state machine

Ported from ODR, which has already found the failure modes.

**One mutex for both directions.** ODR's comment at `BibleReader.svelte:96`
records why: a prepend measures `scrollHeight` for its compensation, and a
concurrent append whose `tick()` has not flushed leaves `oldHeight` stale, so the
compensation overshoots. Serialising all loads removes the class of bug.

**A five-chapter window.** Appending prunes from the front and compensates scroll
upward by the removed height; prepending prunes from the back, which needs no
compensation. Both compensations go through `anchorChromeShift`.

**Rolling preload.** Keep two chapters ahead and two behind the active chapter.
Reacts to the active chapter changing, not to the loaded list changing, with each
load calling back into the check once it releases the mutex. Reacting to the list
would recurse.

**Prepend anchoring.** Read `scrollY` and `documentElement.scrollHeight` before
mutating, `await tick()`, then scroll to `scrollY + (newHeight - oldHeight)` with
`behavior: 'instant'`, then shift the chrome anchor by the same delta.

**A navigation cooldown**, so mounting does not immediately prepend the previous
chapter and shift the page under a reader who has just arrived.

**Debounced `replaceState`** at 200ms as chapters cross the top band.

One addition ODR does not need: an effect resetting the loaded list to the entry
chapter whenever the route props change. ODR reaches other chapters only by
scrolling; here a reader can also click the chapter grid or a prev/next link, and
without the reset the new chapter would be appended onto a stale window.

## 6. Pref and copy

`infiniteScroll: boolean`, default `false`. `readInitial()` spreads `DEFAULTS`
under the parsed object, so a new key needs no migration.

The toggle is appended as the **last** control in the Bible group of
`ReadingPrefs.svelte`, deliberately: `bible-reading-mode.test.ts` selects
Afficher/Masquer buttons positionally, and `.nth(2)` and `.nth(3)` must keep
pointing at « Barre de chapitres » and « Numérotation Vulgate ».

Label « Défilement continu », buttons « Activé » and « Désactivé ». Masculine to
agree with *défilement*, which also keeps them clear of the bionic toggle's
« Activée », selected elsewhere with `exact: true`.

## 7. Testing

Strict TDD throughout: a failing test, watched failing, then the implementation.

### Unit

| File | Covers |
| --- | --- |
| `tests/unit/utils/chapterCursor.test.ts` | next/prev within a book, across a boundary, at both ends of the canon |
| `tests/unit/utils/infiniteScroll.test.ts` | `shouldLoadNext` at its boundaries; `chapterCrossing` for enter, exit-up, a heading scrolled above the viewport, and a heading below the fold firing its initial observation |
| `tests/unit/chrome.test.ts` (extended) | a downward prepend compensation preserves `hidden: true`; an upward prune compensation does not trip a reveal; genuine scrolling after a shift behaves normally |

### End to end

A new file, `tests/e2e/bible-infinite-scroll.test.ts`, so the 32 existing Bible
tests keep their current selectors and ordering.

1. Off by default: reaching the bottom of Genèse 1 loads nothing, and the footer
   prev/next nav is present.
2. Once enabled, Genèse 2 appends inside the same `main[data-corpus="bible"]`,
   and the footer nav is gone.
3. The URL becomes `/bible/genese/2` and the sticky bar's label follows as
   chapter 2 crosses the band.
4. **The width guard, extended into the new mode**: with several chapters
   loaded, the first and last `.verse-text` both still compute to 702px. This is
   the regression that the single-`<main>` decision in section 3 exists to
   prevent.
5. The chrome never flips to hidden during a prepend: land mid-book, scroll up
   far enough to trigger one, and assert `html[data-chrome-hidden]` never reads
   `true` across the sequence.
6. A book boundary: from a one-chapter book, the next book's chapter 1 appends
   and both the eyebrow and the sticky bar's label change.

### Regression guards that must stay green

`SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-reading-mode.test.ts`
(32 tests, including the 702/552/872px assertions), the full 85-test e2e suite,
and 297 unit tests. The new work takes those to roughly 91 and 310.

Builds and test runs need `SKIP_PREPARE_DATA=true`, because the
`scripts/data-sources` symlinks did not survive the repo move. `git add -A` is
never safe here: a build regenerates around 15,000 files under `static/data/`.

## Out of scope

- Any change to `/cec`, `/trente`, `/compendium` or the concordance route.
- Restoring scroll position across a reload or a back navigation.
- Virtualising verse rows. The five-chapter window caps the DOM well below where
  that would pay for itself.
