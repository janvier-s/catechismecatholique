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
- [x] ~~**Print stylesheet**~~: shipped 2026-05-07 in `app.css` `@media print`.

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

- [x] ~~**Cascading TopBar "Catéchisme" dropdown**~~: shipped as
      `CatechismDropdown.svelte` — 3-column mega-menu with hover-intent.
- [x] ~~**Persistent expandable sidebar TOC**~~: shipped as `Sidebar.svelte`,
      auto-expanding to active branch, toggleable via `SidebarToggle`.
- [x] ~~**Search-first homepage**~~: shipped via TopBar search with
      `detectIntent` for paragraph + bible refs.

## Mobile / responsive

- [x] ~~Sticky outline at narrow widths~~: out-of-scope on phones — the
      sidebar is desktop-only. Mobile users navigate via the hamburger menu
      and the dedicated `/ccc/sommaire` route.
- [x] ~~TopBar collapses awkwardly below 1024px~~: shipped 2026-05-07 with a
      mobile pass — proper hamburger, mobile-only search icon, and a
      bottom-sheet StudyPanel.

## Accessibility (Phase 4)

- [x] ~~Focus trap on mode toggle dropdown when open~~: shipped 2026-05-07.
- [ ] `aria-current="location"` on active breadcrumb item
- [x] ~~Skip-to-content link~~: shipped 2026-05-07.
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
- [x] ~~**Sidebar `articles_direct` URL inconsistency**~~: shipped 2026-05-07.
      Sidebar's `deepestHref` now handles articles_direct via the structural
      slug, and the chapter route redirects unknown chapter slugs that resolve
      to articles_direct to the canonical paragraph-range URL.
- [ ] **Mega-menu keyboard a11y**: cascading dropdown supports `onfocus` for
      Tab navigation but no arrow-key navigation between columns. Phase 4
      a11y polish should add this.

## Inspirations from catholiccrossreference.online

- [ ] Liturgical-day navigation (calendar → relevant CCC paragraphs)
- [ ] Multiple entry points on the home page (by paragraph #, by topic,
      by Bible reference, by liturgical day)

## Deployment (Phase 1 D6 — owner action)

- [x] ~~Create GitHub repo, push, connect Cloudflare Pages, custom domain~~:
      live at https://catechismecatholique.fr.

## Validation

- [ ] **Run Lighthouse against production** to validate audit fixes with real
      metrics. Command: `npx lighthouse https://catechismecatholique.fr --view`
      or use Chrome DevTools (right-click → Inspect → Lighthouse tab).
      Targets: - Performance ≥ 90 (LCP < 2.5s, CLS < 0.1, INP < 200ms) - Accessibility ≥ 95 (audits cleared this in code; live run validates contrast at all themes) - Best Practices ≥ 95 (CSP now in place) - SEO ≥ 95 (sitemap, robots, OG, JSON-LD all present)
      Run for both desktop (1920×1080) and mobile (Moto G4) presets. Repeat
      after Cloudflare cache settles (24h after deploy) for steady-state numbers.
