# Bible reader: porting the ODR reading experience

Date: 2026-08-21
Status: Part 1 approved for implementation. Part 2 is a sized roadmap, deliberately not planned yet.

## Context

`thedouayrheims.com/odr/` is a sibling project in the same author's hands, sharing
a stack (SvelteKit 2, Svelte 5, Tailwind, Cloudflare Pages) and a reading-app
shape. Its reader has converged on a set of affordances the catechismecatholique
Bible reader lacks. The source lives at
`../douayrheimsbible`, so every reference below points at real code rather than
at the rendered site.

This document covers two things:

1. **Part 1**, a header and chrome redesign to build now.
2. **Part 2**, four further ODR features, sized and ordered, each of which will
   get its own spec when it is picked up.

## Part 1: Header redesign

### 1.1 Chapter header

Today `BibleReader.svelte:131-135` renders a centered `Chapitre {chapter}` with a
centered accent rule and no book context. ODR's equivalent
(`ChapterView.svelte:353-367`) is left-aligned and three-part.

Adopt ODR's structure verbatim:

```
GENÈSE              eyebrow: font-ui, 11px, uppercase, tracking .3em, text-subtle
Chapitre 1          h1: font-heading, 2.5rem, leading 1.2, tracking -.01em
────                40px x 1px accent rule, opacity .7
```

All three flush left.

**Decision, recorded because it is deliberate:** section, subsection and major
headings *inside* the chapter stay centered. They were centered on 2026-08-20 by
explicit request. The chapter header and the in-chapter headings therefore sit
on different axes. This was presented as a tradeoff and accepted.

The eyebrow text is the book's display name, uppercased via CSS rather than in
the string, so screen readers and copy-paste keep normal casing.

### 1.2 TopBar slimmed, site-wide

`TopBar.svelte` is global: CEC, Trent, articles, concordance and Bible all mount
it. Slim it once rather than adding a Bible-only variant, so the header does not
change height when a citation carries the reader from `/bible` to `/cec`.

| Breakpoint | Today | Target |
| --- | --- | --- |
| Desktop | 80px | 52px |
| Mobile, at rest | 58px | 48px |
| Mobile, condensed | 44px | 40px |

`--topbar-height` is already published by `TopBar.svelte` and consumed by the
`ChapterNavBar` sticky offset and other sticky elements, so downstream offsets
follow from the variable. The mobile-only condense effect at
`TopBar.svelte:37-45` is removed, superseded by 1.4.

### 1.3 Lecture / Étude moves into the nav row

This is the substantive change of Part 1.

**Current state.** `studyMode` is local `$state` at `BibleReader.svelte:82`,
bound down into `ChapterFilterBar.svelte`, which self-suppresses via
`{#if citedCount > 0}`. It is additionally hidden in paragraph mode by the guard
at `BibleReader.svelte:149`. It resets to `true` on every navigation and every
reload.

**Target state.**

- `studyMode` moves into the prefs store as `bibleStudyMode: boolean`, default
  `true`, persisted under the existing `catechismecatholique.prefs` key. This
  mirrors ODR's `readingMode` pref. `prefs.ts` has no version/migration
  machinery, and the spread in `readInitial()` supplies the default for stored
  objects that predate the key, so no migration is needed.
- `ChapterFilterBar` becomes presentational and is rendered by `ChapterNavBar`,
  to the right of the chapter chevrons.
- Labels are full words at >= 640px and an icon pair below it. One render site
  at every breakpoint.
- On a chapter with zero Catechism citations the toggle renders **disabled**
  with an explanatory title, instead of disappearing. This keeps the nav row's
  contents stable while paging through chapters with `‹` and `›`.

**Two behaviours that must survive the move:**

1. `studyMode` feeds `data-study-mode` on `<main>` (`BibleReader.svelte:127`),
   which the Bible column-width compensation in `app.css` keys off. The existing
   e2e assertions that `.verse-text` computes to 702px / 552px / 872px cover
   this, so a regression fails loudly.
2. The paragraph-mode suppression at `BibleReader.svelte:149`. In the nav row the
   toggle is **disabled**, not hidden, in paragraph mode, for the same
   no-reflow reason as the zero-citation case. Paragraph mode renders no
   citation sidebar, so the control has nothing to act on there.

### 1.4 Both bars reveal on scroll

Port `src/lib/stores/chrome.ts` from ODR unchanged, together with its unit test
`tests/unit/chrome.test.ts`.

Its shape:

- `nextChromeState(state, rawY)` is a pure reducer with no DOM access, which is
  why it is directly unit-testable.
- Bars are always shown below `HIDE_AFTER` (100px), so a chapter never opens
  with its header already tucked away.
- Scrolling down hides. Scrolling up reveals only after `REVEAL_AFTER_UP` (120px)
  of *cumulative* upward travel, accumulated in `upDistance` and reset on each
  direction flip.
- Negative `scrollY` from iOS rubber-banding is clamped to 0.
- `suspendChrome(key, active)` holds the bars in view while an overlay is open,
  keyed in a `Set` so two overlapping suspenders cannot untoggle each other.

The cumulative-upward-travel rule is the point. The comparison is against the
last decision anchor, never a frame-to-frame delta, which is what keeps the bars
from flickering during small scroll jitter.

**Suspenders to register in this codebase:** the `ReadingPrefs` popover inside
`ModeToggle`, and `NavDrawer`. Both anchor to the header, and would otherwise
hang over a gap once the header transformed away.

Unlike ODR, where the behaviour is mobile-gated, this applies at all
breakpoints, since 1.2 removes the desktop/mobile split in header behaviour.

### 1.5 Testing

- Unit: `chrome.test.ts` ports across as-is and covers the reducer, including the
  rubber-band clamp and the cumulative-reveal threshold.
- Unit: `bibleStudyMode` default and persistence through `prefs.ts`.
- e2e, added to `tests/e2e/bible-reading-mode.test.ts`:
  - the eyebrow renders the book name and the header block is left-aligned;
  - the Lecture / Étude toggle appears in the nav row and persists across a
    chapter navigation and a reload;
  - the toggle is disabled, and still present, on a chapter with no citations;
  - the bars hide after scrolling down past 100px and return after 120px of
    scrolling up;
  - the bars stay put while the prefs popover is open.
- e2e, existing and expected to keep passing unchanged: the `.verse-text` width
  assertions at 702px / 552px / 872px, which are the guard on 1.3's risk.

## Part 2: Roadmap

Ordered as recommended. Each item gets its own spec at pickup time.

### 2.1 Chapter navigation option (small)

A `showChapterNav` boolean in prefs, a checkbox in `ReadingPrefs`, one
conditional on `ChapterNavBar`. ODR's version is `prefs.ts:19` plus
`BibleReader.svelte:507`. Roughly half a day.

Its value rises once 2.4 exists: ODR couples them, rendering the nav only when
infinite scroll is off (`showNav={!$prefs.infiniteScroll}`).

### 2.2 Latin (Vulgate) psalm numbers (medium, mostly verification)

**Direction.** Verified against `static/data/bible/ncl/PSA.json`: Néo-Crampon
Libre uses Hebrew/Masoretic numbering. Psalms 9 and 10 are separate, 114 and 115
are separate, 147 is whole. ODR is the mirror, Vulgate-numbered, and displays the
Hebrew number in parentheses. Here the option displays the **Vulgate** number.

**Logic.** `drFromHebPsalmNum` in ODR's `books.ts:865` already runs in the
direction needed and is ten lines of pure arithmetic. It ports directly. A
display formatter is additionally required for the divergent cases, because the
correspondence is not one-to-one:

| Hebrew | Vulgate | Kind |
| --- | --- | --- |
| 1–8 | same | identical |
| 9 | 9 (first part) | Vulgate merged Hebrew 9 + 10 |
| 10 | 9 (second part) | Vulgate merged Hebrew 9 + 10 |
| 11–113 | n − 1 | offset |
| 114 | 113 (first part) | Vulgate merged Hebrew 114 + 115 |
| 115 | 113 (second part) | Vulgate merged Hebrew 114 + 115 |
| 116 | 114–115 | Vulgate split |
| 117–146 | n − 1 | offset |
| 147 | 146–147 | Vulgate split |
| 148–150 | same | identical |

**Presentation.** Alongside the chapter header from 1.1, for example
`Psaume 10 (Vg 9)`, gated on a pref that is off by default.

**Scope boundary, stated explicitly.** This option is **display-only**. Verse
numbering also diverges: ODR's `psalm-mapping.ts` documents that the Vulgate
counts the Hebrew superscription as verse 1, putting 57 psalms one row out of
step even where the psalm numbers agree, and that four psalms (50, 51, 53, 59)
carry two-verse titles. Making cross-references *resolve* across the two systems
would mean auditing per-verse alignment across 150 psalms, which is a separate
and far larger data project. It is out of scope for this feature.

### 2.3 Bionic reading (medium)

Dependency: `text-vide` (^1.8.4), dynamically imported on first enable so it
costs nothing to users who never turn it on. ODR's implementation is
`VerseList.svelte:219-241` (the lazy load and `applyBionic`) and
`VerseList.svelte:1136-1146` (the `.bionic-fade` CSS, which uses `color-mix` to
fade non-bolded text).

Prefs: `bionicReading` (boolean), `bionicFixation` (1–5), `bionicSaccade` (0–4),
and `bionicOpacity`, the opacity of the non-bolded remainder of each word.
ODR's own prefs file is self-contradictory on that last range (the type comment
says `0–0.8`, the default is `1`), so its bounds should be settled at
implementation time rather than copied.

**The CC-specific complication, and where the time goes.** Verse HTML in this
project now carries inline markup from the NCL pipeline: `.qt` for Old Testament
quotations, `.sc` for small caps, `.it`, `.nd`. `text-vide` wraps letter runs in
`<b>`, so it has to run without mangling those spans or being mangled by them.
ODR meets the same problem and handles it by applying bionic after markup, and by
disabling the dropcap when bionic is on, since bionic's `<b>` wrapping makes
first-letter injection unreliable. Expect the integration, rather than the
library call, to be the work.

### 2.4 Infinite scroll (medium-to-large; build last)

**Cheaper here than in ODR.** `src/routes/bible/[book=biblebook]/[ch]/+page.ts`
calls `loadNclBook(book.usfx, fetch)`, which returns the **entire book** as one
JSON object, and `loadNclParagraphsBook` likewise. Scrolling from Genesis 1 to
Genesis 2 is therefore pure rendering with no network request. Only crossing a
book boundary needs a fetch.

**Where the cost actually is.** ODR's `src/lib/utils/infiniteScroll.ts` is 62
lines; the wiring around it occupies much of a 647-line `BibleReader.svelte`. The
work is:

- `IntersectionObserver` sentinels in both directions;
- scroll anchoring when content prepends. ODR carries a comment at
  `BibleReader.svelte:96` about `loadNextChapter`'s `tick()` not having flushed,
  leaving `oldHeight` stale, which is the class of bug to expect;
- URL and history sync as chapters pass the viewport;
- cooperation with the reveal-on-scroll chrome from 1.4, which is reading the
  same scroll stream and must not fight the anchoring adjustments.

That last point is the reason for the ordering: build this after Part 1 has
settled, so there is one stable scroll behaviour to integrate against rather than
two moving ones.

## Out of scope

- Any change to `/cec`, `/trente` or article reading modes, beyond the shared
  TopBar height in 1.2.
- Cross-system psalm *reference resolution*, per 2.2.
- Migrating any component to Svelte 4 syntax or away from it. This project's
  Bible components are Svelte 5 runes; the CEC-era components remain Svelte 4 by
  the standing deferral in `TECH_DEBT.md`.
