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

- Eyebrow: "Éditions imprimées · Gratuit"
- H1: "Télécharger le Catéchisme de l'Église catholique en PDF"
  (keyword-bearing H1 — matches how people actually search, rather than the
  generic "Télécharger")
- Subhead: "Le texte intégral du Catéchisme de l'Église catholique à
  télécharger gratuitement en PDF, pour le lire en ligne ou hors ligne,
  imprimer ou consulter hors connexion. Deux éditions françaises
  disponibles : 1992 et 2012."

  (subhead naturally carries "télécharger", "gratuitement", "PDF", "en
  ligne" — the actual query terms — without reading as stuffed, since every
  word there is also literally true and useful to a visitor)

### Download cards

**1992**
- Label: "Édition française originale · 1992"
- Description: "Première édition française du Catéchisme de l'Église
  catholique, publiée par Mame et Plon. Texte provisoire, antérieur à
  l'*editio typica* latine de 1997. PDF gratuit, téléchargement direct."
- Size: ~33 MB
- Button: "Télécharger le PDF (édition 1992)"

**2012**
- Label: "Réédition du texte définitif · 2012"
- Description: "Réédition Bayard/Cerf/Fleurus-Mame du texte définitif de
  1997/1998, publiée à l'occasion de l'Année de la Foi, avec guide de
  lecture. PDF gratuit, téléchargement direct."
- Size: ~42 MB
- Button: "Télécharger le PDF (édition 2012)"

Each card's visible size/format line also states "PDF · téléchargement
gratuit" in plain text, not just an icon — so "gratuit" and "PDF" are always
present as real, crawlable words next to each edition, not only in the
meta tags.

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

### FAQ block ("Questions fréquentes")

A short `<h2>Questions fréquentes</h2>` section with 3–4 Q/A pairs, each a
real question worth answering on its own merits — chosen because they also
happen to match how people phrase this search, not written backwards from
keywords:

- **"Le Catéchisme de l'Église catholique est-il gratuit en PDF ?"** — Oui,
  les deux éditions proposées ici (1992 et 2012) sont téléchargeables
  gratuitement, sans inscription.
- **"Quelle est la différence entre l'édition de 1992 et celle de 2012 ?"**
  — links down to the changes section above rather than repeating it.
- **"Peut-on lire le Catéchisme en ligne sans le télécharger ?"** — Oui,
  l'intégralité du texte est aussi consultable directement sur ce site,
  paragraphe par paragraphe → link to `/ccc/sommaire`.
- **"Ces PDF sont-ils fidèles au texte officiel ?"** — short answer citing
  the publishers (Mame/Plon 1992; Bayard/Cerf/Fleurus-Mame 2012) and the
  Libreria Editrice Vaticana copyright line.

This block does double duty: it's genuinely useful, it's the natural home
for query-shaped phrases ("gratuit", "en ligne", "télécharger",
"catéchisme de l'Église catholique pdf") without stuffing them into the H1
repeatedly, and it's the source for the `FAQPage` structured data below.

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

Target queries this page is written for: *"télécharger catéchisme de
l'église catholique pdf"*, *"catéchisme église catholique pdf gratuit"*,
*"catéchisme en ligne"*, *"catéchisme 1992 pdf"*, *"catéchisme 2012 pdf"*.
Every one of those phrases is addressed by content that's true and useful
on its own — the keywords ride on real sentences (title block, card
descriptions, FAQ), not on tag-stuffing.

- `<title>`: "Télécharger le Catéchisme de l'Église catholique en PDF
  gratuit (1992, 2012)" — leads with the exact phrase people type, under
  ~60 chars is impossible here so we prioritize the head phrase first
  (title truncation in SERPs cuts the tail, not the head).
- `<meta name="description">`: "Téléchargez gratuitement le Catéchisme de
  l'Église catholique en PDF : édition originale de 1992 et réédition du
  texte définitif de 2012. Lecture en ligne ou hors ligne, sans
  inscription." (~155 chars, every clause true and non-redundant with the
  title).
- `<link rel="canonical" href="https://catechismecatholique.fr/telecharger">`
- Open Graph + Twitter card: `og:title`, `og:description` (reuse the meta
  description), `og:url`, `og:type=website`; falls back to site default OG
  image if one exists, no bespoke image needed for a utility page.
- Structured data: `FAQPage` JSON-LD built directly from the FAQ block's
  Q/A pairs (see Content § FAQ block) — this is the highest-leverage SEO
  addition here, since it's what actually earns rich-result real estate in
  search for question-shaped queries like these. Also add `DigitalDocument`
  (or `CreativeWork`) structured data per edition with `name`,
  `datePublished`, `publisher`, `inLanguage: fr`, and `encodingFormat:
  application/pdf` — gives crawlers explicit machine-readable confirmation
  of what's being offered.
- Heading outline stays clean: one `<h1>` (the keyword-bearing title
  above), edition names as `<h2>`, FAQ question as `<h2>Questions
  fréquentes</h2>` with each Q as `<h3>`.
- Download links use descriptive, keyword-carrying anchor text
  ("Télécharger le PDF gratuit (édition 1992)"), never "Cliquez ici" — and
  the file size/format/"gratuit" line is real text next to each card, not
  just an icon, so it's both indexable and accessible to assistive tech.
- `+page.ts` sets `prerender = true` so the page ships as static HTML (no
  client-side content flash, fully crawlable without JS, fast enough for
  good Core Web Vitals on a content-only page).
- No sitemap.xml currently exists in this project despite `robots.txt`
  referencing one — out of scope for this task, but worth fixing separately
  since a real sitemap would get this page (and others) crawled faster;
  noting it here so it isn't silently assumed to be handled.
- External GitHub-hosted PDF links: since these are off-domain, add
  `rel="noopener"` (no `nofollow` — first-party content, no reason to
  suppress link equity) and let crawlers follow through to index the actual
  PDF if they choose.
- Internal link from the FAQ ("lire en ligne sans télécharger") to
  `/ccc/sommaire` and mention of `/glossaire` where relevant — internal
  links from a page targeting a high-intent query toward the site's core
  reading experience are worth more than they cost.

## Testing

No unit-testable logic (static content page). Manual check: page renders in
light/sepia/dark/OLED themes, both download links resolve to valid GitHub
release assets, page passes `npm run check` and `npm run lint`.
