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

- [ ] **First-word capitalization at start of paragraph body**: source data
      has lowercase first letters in some paragraphs (e.g. "saint Paul affirme
      au sujet des païens" should be "Saint Paul…"). Fix at prep time:
      walk paragraph `text_html`, capitalize the first letter of the first
      visible text node. Mid-sentence "saint" stays lowercase (correct).
- [ ] **§2153 (and likely others) bible_refs split bug**: source has
      `[{text: "Mt 5:33-34"}, {text: "5:37"}]` — second entry missing book.
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
