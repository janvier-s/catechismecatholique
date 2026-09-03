# Fetch failures in the study panel

Known gap, written up 2026-09-03. The verse tabs handle a failed data fetch;
the paragraph tabs do not. This note says what the difference is, why the fix
was scoped out, and what fixing it involves.

## The pattern

Every study panel tab loads its data the same way: an `$effect` reads
`$studyPanel.context`, fires an async IIFE, awaits several loaders, and assigns
the results to `$state`. The loaders go through `fetchJson`, which throws on any
non-OK status.

That shape has three failure modes, and they are not equally bad:

1. **Stuck on "Chargement…".** The IIFE throws before it can set `loaded = true`,
   so the tab renders its loading message forever, with no error state and no
   retry. Wrong, but visibly wrong.
2. **Stale data under a new heading.** The throw skips the assignments, so the
   previous context's data stays in `$state` while the panel header names the new
   one. Silently wrong, which for a reference work is the worse of the two: a
   reader has no way to tell they are looking at another verse's days.
3. **An unhandled promise rejection** in the console. Hygiene only.

## Where each tab stands

`TabVerseLiturgie` and `TabCompendium` (`src/lib/components/panels/`) catch,
clear their state, and render an explicit "n'ont pas pu être chargées" message.
Neither can strand or go stale.

The paragraph-side code has none of that:

- `StudyPanel.svelte`, the paragraph branch of the loader effect · a throw
  leaves `dataReady` false, so the tab strip stays on its optimistic placeholder.
- `TabLiturgie.svelte` · a throw leaves `loaded` false, so the tab is stranded on
  "Chargement…".

Both predate this work. They were left alone deliberately: the branch that fixed
the verse tabs was a fix commit for a specific review finding, and widening it
into the paragraph path would have put unrelated, untested changes in it.

## Why it is not a one-line change

The mechanical part is small · a `catch` that clears state and sets a `failed`
flag, plus a branch in the markup. The work is in the decisions around it:

- **What each tab shows on failure.** The verse tabs could use one sentence
  each. The paragraph side has more tabs (Renvois, Compendium, En Bref, Thèmes,
  Liturgie, Audio), and `StudyPanel`'s failure is different in kind: it decides
  which tabs are *visible*, so a failure there is a question about the strip, not
  about one tab's body. Showing every tab, showing none, and keeping the
  optimistic placeholder are all defensible and the choice should be deliberate.
- **Retry.** The current copy tells the reader to reopen the tab, which works
  because the effect re-runs on context change. A real retry affordance is a
  better answer and a larger one.
- **Testing.** These paths only trigger on a 5xx or a network drop, so covering
  them means intercepting routes in Playwright (`page.route`) rather than
  exercising the app normally. No test in the suite does that yet, so the first
  one carries the setup cost for the rest.

## If you pick this up

Match the verse tabs' behaviour rather than inventing a second convention:
clear the state, set a `failed` flag, and say the load failed instead of falling
through to the tab's empty message · "aucun jour" is a claim about the
liturgical calendar, and a network error is not evidence for it.

The request-token guard those tabs use for a related problem (a slower earlier
context overwriting a later one) is worth reading at the same time; the two
concerns share the same `$effect` and the same `mine !== request` check.
