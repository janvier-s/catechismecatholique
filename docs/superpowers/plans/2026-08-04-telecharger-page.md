# Page /telecharger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a standalone `/telecharger` page offering the 1992 and 2012
French PDF editions of the Catéchisme de l'Église catholique for download,
styled to match the site's existing visual language, with SEO copy and
structured data targeting real search queries.

**Architecture:** Two large PDFs (33.6 MB, 42.3 MB) are hosted as GitHub
Release assets on `janvier-s/catechismecatholique` rather than bundled into
`static/` — bundling would bloat the Cloudflare Pages build. The page itself
is a single self-contained, prerendered SvelteKit route (`+page.svelte` +
`+page.ts`) with no data dependency, following the existing pattern used by
the home page and `/glossaire`. No new shared components.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), Tailwind CSS 3, TypeScript,
Playwright for e2e, GitHub CLI (`gh`) for release creation.

## Global Constraints

- Runes only, strictly — `let { x } = $props()`, no `export let`, no `$:`.
  (`compilerOptions.runes: true` is enforced at the compiler level.)
- Route is standalone — do **not** add a link to it in `TopBar.svelte` or any
  other nav component.
- Filenames on the GitHub Release must be ASCII/kebab-case:
  `catechisme-eglise-catholique-1992.pdf`,
  `catechisme-eglise-catholique-2012.pdf`. Release tag: `pdf-1992-2012`.
- H1 must be exactly: "Télécharger le Catéchisme de l'Église catholique en
  PDF" (keyword-bearing, per SEO design).
- Canonical URL: `https://catechismecatholique.fr/telecharger`.
- `<title>`: "Télécharger le Catéchisme de l'Église catholique en PDF
  gratuit (1992, 2012)".
- `<meta name="description">`: "Téléchargez gratuitement le Catéchisme de
  l'Église catholique en PDF : édition originale de 1992 et réédition du
  texte définitif de 2012. Lecture en ligne ou hors ligne, sans
  inscription."
- Rights line text must be exactly: "Texte © Libreria Editrice Vaticana,
  Cité du Vatican. Reproduit dans un cadre non commercial."
- Theme colors/fonts consumed via CSS custom properties already defined in
  `src/app.css` (`--color-bg`, `--color-panel`, `--color-fg`, `--color-muted`,
  `--color-subtle`, `--color-accent`, `--color-accent-text`,
  `--color-border`, `--font-body`, `--font-heading`, `--font-ui`) — never
  hardcode colors/fonts.
- Publishing the GitHub Release is a public, shared action — confirm with
  the user immediately before running the `gh release create`/`upload`
  commands in Task 1, even though the plan itself is approved.

---

## File Structure

- Create: `src/routes/telecharger/+page.ts` — sets `prerender = true`.
- Create: `src/routes/telecharger/+page.svelte` — all markup, copy, JSON-LD,
  and page-local `<style>` (single file, no new components — matches the
  home page and `/glossaire` pattern of page-local styling for a one-off
  page).
- Create: `tests/e2e/telecharger.test.ts` — Playwright e2e coverage.
- No modifications to any existing file (TopBar, layout, etc. are
  untouched per the "standalone, no nav link" constraint).

---

### Task 1: Upload the PDFs as a GitHub Release

**Files:**
- No repo files change in this task. Produces two public URLs consumed by
  Task 3.

**Interfaces:**
- Produces (for Task 3 to hardcode as `href`/`download` values):
  - `https://github.com/janvier-s/catechismecatholique/releases/download/pdf-1992-2012/catechisme-eglise-catholique-1992.pdf`
  - `https://github.com/janvier-s/catechismecatholique/releases/download/pdf-1992-2012/catechisme-eglise-catholique-2012.pdf`

- [ ] **Step 1: Confirm with the user before publishing**

Stop and get explicit go-ahead from the user before running Step 2 — this
creates a public GitHub Release, a shared/visible action.

- [ ] **Step 2: Rename the source PDFs to ASCII/kebab-case in a scratch dir**

```bash
mkdir -p /tmp/telecharger-release
cp "/Users/Janvier/Downloads/Catéchisme de l'Eglise catholique 1992.pdf" \
   /tmp/telecharger-release/catechisme-eglise-catholique-1992.pdf
cp "/Users/Janvier/Downloads/Catéchisme de l'Église catholique 2012.pdf" \
   /tmp/telecharger-release/catechisme-eglise-catholique-2012.pdf
ls -la /tmp/telecharger-release
```

Expected: two files, `catechisme-eglise-catholique-1992.pdf` (~33.6 MB) and
`catechisme-eglise-catholique-2012.pdf` (~42.3 MB).

- [ ] **Step 3: Create the release and upload both assets**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/catechismecatholique"
gh release create pdf-1992-2012 \
  /tmp/telecharger-release/catechisme-eglise-catholique-1992.pdf \
  /tmp/telecharger-release/catechisme-eglise-catholique-2012.pdf \
  --title "Catéchisme de l'Église catholique — PDF (1992, 2012)" \
  --notes "Deux éditions françaises du Catéchisme de l'Église catholique en PDF : l'édition originale de 1992 et la réédition de 2012 du texte définitif de 1997/1998. Textes non modifiés, hébergés ici pour /telecharger sur catechismecatholique.fr."
```

Expected: command prints the release URL and both asset URLs on success.

- [ ] **Step 4: Verify both asset URLs resolve**

```bash
curl -sIL "https://github.com/janvier-s/catechismecatholique/releases/download/pdf-1992-2012/catechisme-eglise-catholique-1992.pdf" | grep -i "^HTTP"
curl -sIL "https://github.com/janvier-s/catechismecatholique/releases/download/pdf-1992-2012/catechisme-eglise-catholique-2012.pdf" | grep -i "^HTTP"
```

Expected: final status `HTTP/2 200` (or `HTTP/1.1 200`) for both — curl
follows the GitHub → objects.githubusercontent.com redirect with `-L`.

- [ ] **Step 5: Clean up the scratch dir**

```bash
rm -rf /tmp/telecharger-release
```

---

### Task 2: Add the route with prerendering enabled

**Files:**
- Create: `src/routes/telecharger/+page.ts`

**Interfaces:**
- Produces: a prerendered static route at `/telecharger` (no `PageData`
  consumed by `+page.svelte` — content is fully static).

- [ ] **Step 1: Create the load file**

```typescript
export const prerender = true;
```

- [ ] **Step 2: Verify the route is picked up**

Run: `npm run dev` (in one terminal), then in another:

```bash
curl -s http://localhost:5173/telecharger -o /dev/null -w "%{http_code}\n"
```

Expected: `200` (page will render blank/minimal until Task 3 adds markup —
this step only confirms the route resolves and doesn't 404).

- [ ] **Step 3: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/catechismecatholique"
git add src/routes/telecharger/+page.ts
git commit -m "feat(telecharger): add prerendered route stub"
```

---

### Task 3: Build the page markup, copy, and structured data

**Files:**
- Create: `src/routes/telecharger/+page.svelte`

**Interfaces:**
- Consumes: the two release asset URLs produced by Task 1 (hardcoded as
  constants at the top of the `<script>` block — this page has no backend,
  so there's no reason to route them through `+page.ts`/`PageData`).
- Produces: the full page — no other task depends on exported symbols from
  this file (it's a leaf route).

- [ ] **Step 1: Write the script block with the release URLs as constants**

```svelte
<script lang="ts">
	const PDF_1992_URL =
		'https://github.com/janvier-s/catechismecatholique/releases/download/pdf-1992-2012/catechisme-eglise-catholique-1992.pdf';
	const PDF_2012_URL =
		'https://github.com/janvier-s/catechismecatholique/releases/download/pdf-1992-2012/catechisme-eglise-catholique-2012.pdf';

	const faqJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: [
			{
				'@type': 'Question',
				name: "Le Catéchisme de l'Église catholique est-il gratuit en PDF ?",
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Oui, les deux éditions proposées ici (1992 et 2012) sont téléchargeables gratuitement, sans inscription.'
				}
			},
			{
				'@type': 'Question',
				name: "Quelle est la différence entre l'édition de 1992 et celle de 2012 ?",
				acceptedAnswer: {
					'@type': 'Answer',
					text: "L'édition de 1992 est le texte français provisoire original. L'édition de 2012 reprend le texte définitif de 1997/1998, qui comporte une centaine de corrections mineures et un changement notable au paragraphe 2267 sur la peine de mort."
				}
			},
			{
				'@type': 'Question',
				name: 'Peut-on lire le Catéchisme en ligne sans le télécharger ?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: "Oui, l'intégralité du texte est consultable directement sur ce site, paragraphe par paragraphe, depuis le sommaire."
				}
			},
			{
				'@type': 'Question',
				name: 'Ces PDF sont-ils fidèles au texte officiel ?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: "Oui. L'édition de 1992 a été publiée par Mame et Plon, celle de 2012 par Bayard, Cerf et Fleurus-Mame. Le texte est protégé par le droit d'auteur de la Libreria Editrice Vaticana et reproduit ici dans un cadre non commercial."
				}
			}
		]
	};

	const editionsJsonLd = [
		{
			'@context': 'https://schema.org',
			'@type': 'DigitalDocument',
			name: "Catéchisme de l'Église catholique (édition 1992)",
			datePublished: '1992',
			publisher: 'Mame / Plon',
			inLanguage: 'fr',
			encodingFormat: 'application/pdf',
			url: PDF_1992_URL
		},
		{
			'@context': 'https://schema.org',
			'@type': 'DigitalDocument',
			name: "Catéchisme de l'Église catholique (édition 2012)",
			datePublished: '2012',
			publisher: 'Bayard / Cerf / Fleurus-Mame',
			inLanguage: 'fr',
			encodingFormat: 'application/pdf',
			url: PDF_2012_URL
		}
	];
</script>
```

- [ ] **Step 2: Write `<svelte:head>` with title, description, canonical, OG, and JSON-LD**

```svelte
<svelte:head>
	<title>Télécharger le Catéchisme de l'Église catholique en PDF gratuit (1992, 2012)</title>
	<meta
		name="description"
		content="Téléchargez gratuitement le Catéchisme de l'Église catholique en PDF : édition originale de 1992 et réédition du texte définitif de 2012. Lecture en ligne ou hors ligne, sans inscription."
	/>
	<link rel="canonical" href="https://catechismecatholique.fr/telecharger" />
	<meta property="og:type" content="website" />
	<meta
		property="og:title"
		content="Télécharger le Catéchisme de l'Église catholique en PDF gratuit (1992, 2012)"
	/>
	<meta
		property="og:description"
		content="Téléchargez gratuitement le Catéchisme de l'Église catholique en PDF : édition originale de 1992 et réédition du texte définitif de 2012. Lecture en ligne ou hors ligne, sans inscription."
	/>
	<meta property="og:url" content="https://catechismecatholique.fr/telecharger" />
	{@html `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>`}
	{#each editionsJsonLd as doc}
		{@html `<script type="application/ld+json">${JSON.stringify(doc)}</script>`}
	{/each}
</svelte:head>
```

Note: `JSON.stringify` output here contains no user input and no `<` or
`</script>` sequences (all copy is authored, static French prose with no
raw angle brackets), so injecting it via `{@html}` inside a `<script
type="application/ld+json">` tag is safe — there's no untrusted data and
nothing for the browser to interpret as HTML.

- [ ] **Step 3: Write the title block**

```svelte
<main class="page">
	<div class="page-inner">
		<header class="title-block">
			<p class="eyebrow">Éditions imprimées · Gratuit</p>
			<h1 class="title">Télécharger le Catéchisme de l'Église catholique en PDF</h1>
			<p class="subhead">
				Le texte intégral du Catéchisme de l'Église catholique à télécharger gratuitement en
				PDF, pour le lire en ligne ou hors ligne, imprimer ou consulter hors connexion. Deux
				éditions françaises disponibles&nbsp;: 1992 et 2012.
			</p>
			<div class="ornament" aria-hidden="true">
				<span class="fleuron">✠</span>
				<span class="rule"></span>
			</div>
		</header>
```

- [ ] **Step 4: Write the two download cards**

```svelte
		<section class="cards" aria-label="Éditions disponibles">
			<article class="card">
				<p class="card-label">Édition française originale · 1992</p>
				<h2 class="card-title">Catéchisme de l'Église catholique (1992)</h2>
				<p class="card-desc">
					Première édition française du Catéchisme de l'Église catholique, publiée par Mame et
					Plon. Texte provisoire, antérieur à l'<i>editio typica</i> latine de 1997.
				</p>
				<p class="card-meta">PDF · téléchargement gratuit · 33,6 Mo</p>
				<a
					class="card-button"
					href={PDF_1992_URL}
					download="catechisme-eglise-catholique-1992.pdf"
					rel="noopener"
				>
					Télécharger le PDF (édition 1992)
				</a>
			</article>

			<article class="card">
				<p class="card-label">Réédition du texte définitif · 2012</p>
				<h2 class="card-title">Catéchisme de l'Église catholique (2012)</h2>
				<p class="card-desc">
					Réédition Bayard/Cerf/Fleurus-Mame du texte définitif de 1997/1998, publiée à
					l'occasion de l'Année de la Foi, avec guide de lecture.
				</p>
				<p class="card-meta">PDF · téléchargement gratuit · 42,3 Mo</p>
				<a
					class="card-button"
					href={PDF_2012_URL}
					download="catechisme-eglise-catholique-2012.pdf"
					rel="noopener"
				>
					Télécharger le PDF (édition 2012)
				</a>
			</article>
		</section>
```

- [ ] **Step 5: Write the "what changed" section**

```svelte
		<section class="prose" aria-labelledby="changes-heading">
			<h2 id="changes-heading" class="section-label">
				Qu'est-ce qui a changé entre 1992 et le texte définitif ?
			</h2>
			<p>
				Le texte français de 1992 était provisoire. L'<i>editio typica</i> latine a suivi en 1997
				(lettre apostolique <i>Laetamur magnopere</i>), avec le texte français définitif en 1998.
				L'édition de 2012 reprend ce texte définitif de 1998 — ce n'est pas une nouvelle révision.
			</p>
			<p>
				Environ 103 modifications séparent 1992 du texte définitif, la plupart mineures
				(vocabulaire, références, formulations plus claires). Le cardinal Ratzinger, alors
				préfet de la Congrégation pour la doctrine de la foi, avait précisé qu'il ne s'agissait
				pas d'un « nouveau catéchisme » et que les possesseurs de l'édition de 1992 n'avaient pas
				besoin de la remplacer.
			</p>
			<p>
				Le changement le plus notable porte sur le paragraphe 2267 (peine de mort), qui intègre
				l'enseignement d'<i>Evangelium vitae</i> (1995)&nbsp;: les cas de « nécessité absolue »
				justifiant la peine de mort sont désormais décrits comme rares ou pratiquement
				inexistants, grâce aux moyens modernes de rendre un coupable inoffensif.
			</p>
			<ul>
				<li>
					Anges gardiens (§336)&nbsp;: ils accompagnent la vie humaine « dès son commencement »,
					et non plus seulement dès la naissance.
				</li>
				<li>
					Salut des non-baptisés de bonne volonté (§1281)&nbsp;: formulation en « peuvent être
					sauvés » plutôt que « sont sauvés ».
				</li>
				<li>
					Précisions mineures sur le pouvoir sacré et le ministère diaconal (§875), les mariages
					mixtes (§1635) et l'observance du dimanche (§2042).
				</li>
			</ul>
			<p class="note">
				La reformulation de 2018 du paragraphe 2267, qui qualifie la peine de mort
				d'« inadmissible », est un changement ultérieur et distinct — non repris dans les deux
				éditions proposées ici (1992 et 2012).
			</p>
		</section>
```

- [ ] **Step 6: Write the FAQ section**

```svelte
		<section class="prose" aria-labelledby="faq-heading">
			<h2 id="faq-heading" class="section-label">Questions fréquentes</h2>

			<h3>Le Catéchisme de l'Église catholique est-il gratuit en PDF ?</h3>
			<p>
				Oui, les deux éditions proposées ici (1992 et 2012) sont téléchargeables gratuitement,
				sans inscription.
			</p>

			<h3>Quelle est la différence entre l'édition de 1992 et celle de 2012 ?</h3>
			<p>
				Voir la section <a href="#changes-heading">« Qu'est-ce qui a changé »</a> ci-dessus : le
				texte de 2012 reprend la version définitive de 1997/1998, avec environ 103 corrections
				par rapport à 1992.
			</p>

			<h3>Peut-on lire le Catéchisme en ligne sans le télécharger ?</h3>
			<p>
				Oui, l'intégralité du texte est aussi consultable directement sur ce site, paragraphe par
				paragraphe, depuis le <a href="/ccc/sommaire">sommaire</a>.
			</p>

			<h3>Ces PDF sont-ils fidèles au texte officiel ?</h3>
			<p>
				Oui. L'édition de 1992 a été publiée par Mame et Plon, celle de 2012 par Bayard, Cerf et
				Fleurus-Mame. Le texte est protégé par le droit d'auteur de la Libreria Editrice Vaticana
				et reproduit ici dans un cadre non commercial.
			</p>
		</section>
```

- [ ] **Step 7: Write the rights block and close the page**

```svelte
		<div class="rights">
			<p>
				Texte © Libreria Editrice Vaticana, Cité du Vatican. Reproduit dans un cadre non
				commercial.
			</p>
		</div>
	</div>
</main>
```

- [ ] **Step 8: Add the page-local `<style>` block**

```svelte
<style>
	.page {
		min-height: calc(100vh - 80px);
		padding: clamp(1.5rem, 4vh, 3rem) 1.5rem clamp(3rem, 6vh, 4rem);
		background: var(--color-bg);
		color: var(--color-fg);
		display: flex;
		justify-content: center;
	}
	.page-inner {
		width: 100%;
		max-width: 720px;
		display: flex;
		flex-direction: column;
		gap: clamp(2rem, 4vh, 3rem);
	}

	/* Title block */
	.title-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		text-align: center;
	}
	.eyebrow {
		font-family: var(--font-ui);
		font-size: 0.75rem;
		font-weight: 500;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0;
		padding-left: 0.28em;
	}
	.title {
		font-family: var(--font-heading);
		font-size: clamp(1.75rem, 4.5vw, 2.5rem);
		font-weight: 700;
		line-height: 1.15;
		color: var(--color-heading, var(--color-fg));
		margin: 0.5rem 0 0;
	}
	.subhead {
		font-family: var(--font-body);
		font-size: 1rem;
		line-height: 1.7;
		color: var(--color-muted);
		max-width: 560px;
		margin: 0;
	}
	.ornament {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.5rem;
	}
	.fleuron {
		font-family: var(--font-heading);
		font-size: 1.1rem;
		color: var(--color-accent);
		line-height: 1;
	}
	.rule {
		width: 56px;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 30%, transparent),
			transparent
		);
	}

	/* Cards */
	.cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1.5rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-panel);
	}
	.card-label {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-accent-text);
		margin: 0;
	}
	.card-title {
		font-family: var(--font-heading);
		font-size: 1.15rem;
		font-weight: 600;
		color: var(--color-fg);
		margin: 0;
	}
	.card-desc {
		font-family: var(--font-body);
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--color-muted);
		margin: 0;
	}
	.card-meta {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		color: var(--color-subtle);
		margin: 0.25rem 0 0;
	}
	.card-button {
		display: inline-flex;
		justify-content: center;
		margin-top: 0.75rem;
		padding: 0.65rem 1rem;
		border-radius: 4px;
		background: var(--color-accent);
		color: white;
		font-family: var(--font-ui);
		font-size: 0.8rem;
		font-weight: 600;
		text-decoration: none;
		transition: opacity 120ms ease;
	}
	.card-button:hover {
		opacity: 0.85;
	}

	/* Prose sections */
	.prose {
		font-family: var(--font-body);
		font-size: 1rem;
		line-height: 1.75;
		color: var(--color-fg);
	}
	.prose :global(p) {
		margin: 0 0 1rem;
	}
	.prose :global(h3) {
		font-family: var(--font-heading);
		font-size: 1.05rem;
		font-weight: 600;
		margin: 1.5rem 0 0.5rem;
	}
	.prose :global(ul) {
		margin: 0 0 1rem;
		padding-left: 1.25rem;
	}
	.prose :global(li) {
		margin-bottom: 0.5rem;
	}
	.prose :global(.note) {
		font-size: 0.88rem;
		color: var(--color-subtle);
	}
	.section-label {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-accent-text);
		margin: 0 0 1rem;
	}

	/* Rights */
	.rights {
		border-top: 1px solid var(--color-border);
		padding-top: 1rem;
	}
	.rights p {
		font-family: var(--font-ui);
		font-size: 0.75rem;
		color: var(--color-subtle);
		margin: 0;
	}

	@media (max-width: 640px) {
		.cards {
			grid-template-columns: 1fr;
		}
	}
</style>
```

- [ ] **Step 9: Run the dev server and manually check all four themes**

```bash
npm run dev
```

Visit `http://localhost:5173/telecharger` and toggle through light, sepia,
dark, and OLED themes (theme toggle in `TopBar`). Expected: cards, text,
and buttons all use theme-appropriate colors with no hardcoded values
clashing (e.g. no pure-black text in dark mode).

- [ ] **Step 10: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/catechismecatholique"
git add src/routes/telecharger/+page.svelte
git commit -m "feat(telecharger): build page content, cards, FAQ, and structured data"
```

---

### Task 4: Add Playwright e2e coverage

**Files:**
- Create: `tests/e2e/telecharger.test.ts`

**Interfaces:**
- Consumes: the rendered `/telecharger` route from Task 3 (H1 text, card
  `href`/`download` attributes, FAQ headings, JSON-LD script tags).

- [ ] **Step 1: Write the test file**

```typescript
import { test, expect } from '@playwright/test';

test('renders the title and both edition cards', async ({ page }) => {
	await page.goto('/telecharger');
	await expect(
		page.getByRole('heading', {
			level: 1,
			name: "Télécharger le Catéchisme de l'Église catholique en PDF"
		})
	).toBeVisible();
	await expect(page.getByRole('heading', { level: 2, name: /1992/ })).toBeVisible();
	await expect(page.getByRole('heading', { level: 2, name: /2012/ })).toBeVisible();
});

test('download links point at the GitHub release assets', async ({ page }) => {
	await page.goto('/telecharger');
	const link1992 = page.getByRole('link', { name: 'Télécharger le PDF (édition 1992)' });
	const link2012 = page.getByRole('link', { name: 'Télécharger le PDF (édition 2012)' });

	await expect(link1992).toHaveAttribute(
		'href',
		'https://github.com/janvier-s/catechismecatholique/releases/download/pdf-1992-2012/catechisme-eglise-catholique-1992.pdf'
	);
	await expect(link1992).toHaveAttribute('download', 'catechisme-eglise-catholique-1992.pdf');
	await expect(link1992).toHaveAttribute('rel', 'noopener');

	await expect(link2012).toHaveAttribute(
		'href',
		'https://github.com/janvier-s/catechismecatholique/releases/download/pdf-1992-2012/catechisme-eglise-catholique-2012.pdf'
	);
	await expect(link2012).toHaveAttribute('download', 'catechisme-eglise-catholique-2012.pdf');
	await expect(link2012).toHaveAttribute('rel', 'noopener');
});

test('renders the FAQ section with question headings', async ({ page }) => {
	await page.goto('/telecharger');
	await expect(
		page.getByRole('heading', { level: 2, name: 'Questions fréquentes' })
	).toBeVisible();
	await expect(
		page.getByRole('heading', {
			level: 3,
			name: "Le Catéchisme de l'Église catholique est-il gratuit en PDF ?"
		})
	).toBeVisible();
});

test('emits FAQPage structured data', async ({ page }) => {
	await page.goto('/telecharger');
	const jsonLdBlocks = await page.locator('script[type="application/ld+json"]').allTextContents();
	const parsed = jsonLdBlocks.map((block) => JSON.parse(block));
	const faqBlock = parsed.find((block) => block['@type'] === 'FAQPage');
	expect(faqBlock).toBeDefined();
	expect(faqBlock.mainEntity.length).toBeGreaterThanOrEqual(4);
});
```

- [ ] **Step 2: Run the new tests**

```bash
npx playwright test tests/e2e/telecharger.test.ts
```

Expected: all 4 tests PASS. (Requires the dev/preview server Playwright is
configured to run against — see `playwright.config.ts`; no extra setup
needed since this matches every other file in `tests/e2e/`.)

- [ ] **Step 3: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/catechismecatholique"
git add tests/e2e/telecharger.test.ts
git commit -m "test(telecharger): add e2e coverage for downloads page"
```

---

### Task 5: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Type-check and lint**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/catechismecatholique"
npm run check
npm run lint
```

Expected: both exit 0 with no errors.

- [ ] **Step 2: Full production build (verifies prerendering succeeds)**

```bash
npm run build
```

Expected: build succeeds; check the build output confirms
`build/telecharger/index.html` (or equivalent prerendered path) was
generated, and that `handleHttpError` in `svelte.config.js` doesn't flag
the new page's internal link to `/ccc/sommaire` as broken.

- [ ] **Step 3: Run the full e2e suite to check for regressions**

```bash
npm run test:e2e
```

Expected: all tests pass, including the new `telecharger.test.ts`.

- [ ] **Step 4: Final commit if any fixes were needed during verification**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/catechismecatholique"
git add -A
git commit -m "fix(telecharger): address verification findings"
```

(Skip this step if verification produced no changes.)
