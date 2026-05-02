# Backlog

Items raised during development that are not part of any phase plan.
Pick from this list when polishing or when scheduling a small follow-up
round between phases.

## Polish — visual & typography

- [ ] **Real italic font face**: paragraphs render `<i>` via the body font's
      faux-italic. Wire up Libre Baskerville Italic explicitly so italicized
      passages (citations, "Article 1 :" titles, etc.) use a true italic cut.
- [ ] **Self-hosted Gotham UI font** (if licensing permits) instead of Inter
      from Google Fonts — match the DR site's UI typography exactly.
- [ ] **Print stylesheet** (already in Phase 4 plan, but easy to pull forward
      if needed for early sharing).

## Source-data fixes

- [x] ~~**First-word capitalization at start of paragraph body**~~: shipped in
      Phase 2 E2 (`scripts/prepare/source-data-fixes.ts`). Acts as a guard —
      no current source data has the bug, but the fix is in place.
- [x] ~~**§2153 (and likely others) bible_refs split bug**~~: shipped in
      Phase 2 E3. 307 paragraphs had this issue; all fixed via continuation
      merge.
      The source file has them as one citation `Mt 5, 33-34. 37`. Pre-process
      `bible_refs`: when an entry lacks a book prefix, inherit the previous
      entry's book.
- [ ] **§2070 in printed CCC**: user noted §2070 might be part of an en_bref
      in the printed edition. Source JSON has it as a regular paragraph.
      Verify against printed CCC; if printed-CCC is right, flag upstream.
- [ ] **`AA → "Apostolicam actuositatemd'"` trailing-`d'` artifact**: source
      `sigles.xhtml` includes a stray `d'` at the end of one expansion. Trim
      trailing punctuation/lone-letters when parsing abbreviations.

## Navigation (full overhaul — Phase 2 territory)

- [ ] **Cascading TopBar "Catéchisme" dropdown**: parts → sections → chapters
      as a 3-column mega-menu on hover; quick jump to any level in 2 clicks.
- [ ] **Persistent expandable sidebar TOC**: drawer toggleable from the
      TopBar; current location auto-expanded; collapse/expand other branches.
- [ ] **Search-first homepage**: pull part of Phase 3 forward — at minimum,
      the intent-detection input that handles paragraph numbers and Bible
      refs without needing the full MiniSearch index.

## Mobile / responsive

- [ ] Sticky outline doesn't appear on narrow widths (`<lg`). Phase 4 will
      address; until then mobile users have no outline.
- [ ] TopBar collapses awkwardly below 1024px. Needs proper hamburger / drawer.

## Accessibility (Phase 4)

- [ ] Focus trap on mode toggle dropdown when open
- [ ] `aria-current="location"` on active breadcrumb item
- [ ] Skip-to-content link
- [ ] Screen-reader pass on en_bref labels

## Phase 2 leftovers (carried forward)

- [ ] **Sources-index parser refinement**: the current parser puts the
      source location string in `doc_name` and leaves `location` empty.
      Real `index_citations/*.xhtml` files have document-author headings
      (`<h1>/<h2>/<h3>`) above table rows; the parser should use those for
      `doc_name` and treat the first `<td>` as `location`. Affects the
      "Sources" panel tab display quality.
- [ ] **`/bible/[book]/[ch]` verse count uses only primary abbreviation**:
      `[N CEC]` markers count citations stored under `book.abbrs[0]` only.
      If the bible-index ever uses both `Gn` and `Gen` for Genesis (some
      sources do), the count is undercounted. The single-verse page
      (`/bible/[book]/[ch]/[v]`) already handles all abbrs correctly via
      `book.abbrs.some(...)`; the chapter-page lookup should match.
- [ ] **`/bible/[book]/[ch]/[v]` doesn't match chapter-range keys**:
      bible-index entries like `1 Cor 1-6` (chapter range with no verse)
      are silently skipped by the current regex. A verse like 1 Cor 3:5
      could be cited under such a key but won't surface. Either expand
      the regex to match chapter-range keys, or surface them under each
      verse of the chapter.
- [ ] **Sidebar `articles_direct` URL inconsistency**: sidebar uses paragraph
      ranges (`/ccc/{first}-{last}`) for articles directly under a section
      (Notre Père), while sommaire uses `/ccc/{part}/{section}/{article-slug}`
      which has no route handler. Pick one convention and unify.
- [ ] **Mega-menu keyboard a11y**: cascading dropdown supports `onfocus` for
      Tab navigation but no arrow-key navigation between columns. Phase 4
      a11y polish should add this.

## Inspirations from catholiccrossreference.online

- [ ] Liturgical-day navigation (calendar → relevant CCC paragraphs)
- [ ] Multiple entry points on the home page (by paragraph #, by topic,
      by Bible reference, by liturgical day)

## Deployment (Phase 1 D6 — owner action)

- [ ] Create GitHub repo `lecatechisme`, push current branch
- [ ] Cloudflare Pages → connect to repo, set build command `npm run build`,
      output dir `.svelte-kit/cloudflare`, env `NODE_VERSION=20`
- [ ] Verify preview URL serves the site end-to-end
- [ ] When `lecatechisme.fr` registration succeeds: nameservers → Cloudflare,
      add custom domain in Pages, TLS auto-provisions
