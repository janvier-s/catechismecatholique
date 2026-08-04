# Page /telecharger — design

## Purpose

Add a downloads page offering the two French editions of the Catéchisme de
l'Église catholique as PDF: the original 1992 edition and the 2012
anniversary reprint of the definitive 1997/1998 text. Standalone route, not
linked from TopBar navigation (user will link to it manually where desired).

## Route & files

- `src/routes/telecharger/+page.svelte`
- `src/routes/telecharger/+page.ts` — `export const prerender = true;` (static
  page, no data dependency)

No new components needed; page is self-contained (single file), following the
site's existing pattern of page-local `<style>` blocks (see `+page.svelte`
home page, `glossaire/+page.svelte`).

## Visual design

Reuses the site's established visual language rather than inventing a new
one:

- Title block styled like the home page's `.title-block`: small tracked
  uppercase eyebrow, serif `H1` in `--font-heading` (Libre Baskerville), thin
  rule + fleuron (✠) ornament below.
- Two download cards (not a bare table) — one per edition — each a bordered
  panel (`--color-panel` / `--color-border`, matching `.cluster-card` in
  glossaire) containing: year + publisher line, one-sentence description,
  file size, and a prominent download button in `--color-accent`.
- A prose section below the cards, `max-width` constrained for readability,
  using `--font-body` (Libre Baskerville) for running text and `--font-ui`
  for the small-caps section label, matching the glossaire heading style
  (`font-ui text-[11px] uppercase tracking-[0.2em]`).
- Rights/license line at the bottom, small and muted, same tone as the
  README's "Droits" section.
- Respects `prefers-reduced-motion` if any reveal animation is added (optional
  — home page precedent), but this page can ship without one; it's not a
  landing page and shouldn't feel precious.

## Content

### Title block

- Eyebrow: "Éditions imprimées"
- H1: "Télécharger"
- Subhead: "Le texte intégral du Catéchisme en PDF, pour lecture hors ligne
  ou impression."

### Download cards

**1992**
- Label: "Édition française originale · 1992"
- Description: "Première édition française du Catéchisme, publiée par Mame
  et Plon. Texte provisoire, antérieur à l'*editio typica* latine de 1997."
- Size: ~33 MB
- Button: "Télécharger le PDF (1992)"

**2012**
- Label: "Réédition du texte définitif · 2012"
- Description: "Réédition Bayard/Cerf/Fleurus-Mame du texte définitif de
  1997/1998, publiée à l'occasion de l'Année de la Foi, avec guide de
  lecture."
- Size: ~42 MB
- Button: "Télécharger le PDF (2012)"

### "Qu'est-ce qui a changé entre 1992 et le texte définitif ?"

Condensed, accurate summary (not the full research dump) covering:

- The 1992 French text was provisional; the Latin *editio typica* followed
  in 1997 (*Laetamur magnopere*), with the definitive French text in 1998.
  The 2012 edition reprints that definitive 1998 text — it is not a new
  revision.
- Roughly 103 changes were made between 1992 and the definitive text, most
  minor (vocabulary, cross-references, clearer phrasing). Cardinal
  Ratzinger, then prefect of the CDF, stated this was not a "new catechism"
  and that owners of the 1992 edition did not need to replace it.
- The one substantive change: §2267 (peine de mort), which integrated the
  teaching of *Evangelium vitae* (1995) — cases of "absolute necessity" for
  the death penalty are now described as rare or practically nonexistent
  given modern means of rendering an offender harmless.
- A few other precisions, listed briefly: guardian angels accompany human
  life "from its beginning" (§336, not just from birth); the salvation of
  non-baptized persons of good will is phrased as "can be saved" rather than
  "are saved" (§1281); minor clarifications on sacred power/diaconal
  ministry (§875), mixed marriages (§1635), and Sunday observance (§2042).
- Explicit callout: the 2018 rewording of §2267 declaring the death penalty
  "inadmissible" (under Pope Francis) is a *later, separate* change not
  reflected in either the 1992 or 2012 files offered here.

Presented as a short intro paragraph plus a tight bullet list — not the full
enumerated research, to keep the page scannable.

### Rights line

"Texte © Libreria Editrice Vaticana, Cité du Vatican. Reproduit dans un
cadre non commercial." — matches README wording.

## Hosting

Both PDFs are too large to bundle into `static/` (33 MB + 42 MB would bloat
the Cloudflare Pages build). They will be uploaded as assets on a new GitHub
Release on `janvier-s/catechismecatholique`, tag `pdf-1992-2012`, following
the same externally-hosted-large-PDF pattern used on the sister
douayrheimsbible project. Filenames on the release will be normalized to
ASCII/kebab-case (`catechisme-eglise-catholique-1992.pdf`,
`catechisme-eglise-catholique-2012.pdf`) to avoid accented-character/URL
issues; the page's download buttons carry a `download="..."` attribute with
a friendly filename regardless of the served name.

Publishing the release is a shared/public action — confirm with the user
before it goes out.

## SEO

- `<title>`: "Télécharger le Catéchisme en PDF (1992, 2012) · Catéchisme de
  l'Église catholique"
- `<meta name="description">`: concise summary mentioning both editions and
  "PDF gratuit" — under ~155 chars.
- `<link rel="canonical" href="https://catechismecatholique.fr/telecharger">`
- Open Graph: `og:title`, `og:description`, `og:url`, `og:type=website` (no
  bespoke OG image needed — falls back to site default if one exists).
- One `<h1>` only ("Télécharger"); edition names as `<h2>`/`<h3>` so the
  outline stays clean for crawlers and screen readers.
- Download links use descriptive anchor text ("Télécharger le PDF (1992)"),
  not "Cliquez ici" — and include the file size and format inline as plain
  text (not just visual) so it's readable to assistive tech and indexable.
- `+page.ts` sets `prerender = true` so the page ships as static HTML (no
  client-side content flash, fully crawlable without JS).
- No sitemap.xml currently exists in this project despite `robots.txt`
  referencing one — out of scope for this task; noting it here so it isn't
  silently assumed to be handled.
- External GitHub-hosted PDF links: since these are off-domain, add
  `rel="noopener"` (no `nofollow` — first-party content, no reason to
  suppress link equity) and let crawlers follow through to index the actual
  PDF if they choose.

## Testing

No unit-testable logic (static content page). Manual check: page renders in
light/sepia/dark/OLED themes, both download links resolve to valid GitHub
release assets, page passes `npm run check` and `npm run lint`.
