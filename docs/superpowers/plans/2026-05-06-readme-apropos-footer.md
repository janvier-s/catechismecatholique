# README · À propos · Footer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write a beautiful French README, create the `/a-propos` page, add a site-wide footer, and wire everything together.

**Architecture:** New `ProseLayout.svelte` (Svelte 5 runes, adapted from sibling DR project) wraps the about page. `Footer.svelte` is added to the root layout. README is a standalone markdown rewrite.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, Tailwind CSS 3, Cloudflare Pages, TypeScript strict

---

## File Map

| File                                       | Action  | Responsibility                                 |
| ------------------------------------------ | ------- | ---------------------------------------------- |
| `README.md`                                | Rewrite | Project presentation for GitHub visitors       |
| `src/lib/components/ui/ProseLayout.svelte` | Create  | Prose reading layout with header, TOC, JSON-LD |
| `src/lib/components/ui/Footer.svelte`      | Create  | Site-wide footer with nav links and credits    |
| `src/routes/a-propos/+page.ts`             | Create  | Prerender directive                            |
| `src/routes/a-propos/+page.svelte`         | Create  | French about page content                      |
| `src/routes/+layout.svelte`                | Modify  | Add `<Footer />` below the flex container      |

---

## Task 1 — ProseLayout component

**Files:**

- Create: `src/lib/components/ui/ProseLayout.svelte`

- [ ] **Step 1: Create the file**

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle = '',
		description = '',
		children
	}: {
		title: string;
		subtitle?: string;
		description?: string;
		children: Snippet;
	} = $props();

	const SITE = 'https://catechismecatholique.fr';

	const canonicalUrl = $derived(SITE + page.url.pathname);

	const scriptOpen = '<' + 'script type="application/ld+json">';
	const scriptClose = '</' + 'script>';

	const jsonLd = $derived(
		scriptOpen +
			JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'Article',
				headline: title,
				description: description || subtitle || title,
				url: canonicalUrl,
				inLanguage: 'fr-FR',
				author: {
					'@type': 'Organization',
					name: "Catéchisme de l'Église Catholique",
					url: SITE
				},
				publisher: {
					'@type': 'Organization',
					name: "Catéchisme de l'Église Catholique",
					url: SITE,
					logo: { '@type': 'ImageObject', url: SITE + '/favicon-96x96.png' }
				},
				isPartOf: { '@type': 'WebSite', name: "Catéchisme de l'Église Catholique", url: SITE }
			}) +
			scriptClose
	);

	// TOC: auto-built from h2 headings after mount
	let articleEl: HTMLElement | undefined = $state();
	let tocItems: { id: string; text: string }[] = $state([]);
	let activeId = $state('');

	function slugify(text: string): string {
		return text
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^\w\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
	}

	$effect(() => {
		if (!articleEl) return;
		const headings = Array.from(articleEl.querySelectorAll('h2'));
		const items: { id: string; text: string }[] = [];
		for (const h of headings) {
			const text = (h.textContent ?? '').trim();
			if (!h.id) h.id = slugify(text);
			items.push({ id: h.id, text });
		}
		tocItems = items;
		if (items.length > 0) activeId = items[0].id;
	});

	$effect(() => {
		const onScroll = () => {
			if (!articleEl) return;
			const threshold = window.innerHeight * 0.25;
			let current = '';
			for (const h of Array.from(articleEl.querySelectorAll('h2[id]'))) {
				if ((h as HTMLElement).getBoundingClientRect().top <= threshold) {
					current = (h as HTMLElement).id;
				}
			}
			if (current) activeId = current;
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<svelte:head>
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description || subtitle || title} />
	{@html jsonLd}
</svelte:head>

<main id="main-content" class="prose-page">
	<header class="prose-header">
		<a href="/" class="prose-eyebrow">
			<span aria-hidden="true">✠</span> Catéchisme de l'Église Catholique
		</a>
		<h1 class="prose-title">{title}</h1>
		{#if subtitle}
			<p class="prose-subtitle">{subtitle}</p>
		{/if}
		<div class="prose-rule"></div>
	</header>

	<article class="prose-body" bind:this={articleEl}>
		{@render children()}
	</article>
</main>

{#if tocItems.length > 1}
	<aside class="prose-toc" aria-label="Sommaire">
		<p class="toc-label">Sommaire</p>
		<ul class="toc-list">
			{#each tocItems as item}
				<li class:toc-active={activeId === item.id}>
					<a href="#{item.id}">{item.text}</a>
				</li>
			{/each}
		</ul>
	</aside>
{/if}

<style>
	.prose-page {
		max-width: 700px;
		margin: 0 auto;
		padding: 48px 24px 96px;
	}

	.prose-header {
		margin-bottom: 48px;
	}

	.prose-eyebrow {
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.28em;
		color: var(--color-accent);
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 16px;
		text-decoration: none;
	}

	.prose-title {
		font-family: var(--font-heading);
		font-size: clamp(1.9rem, 4vw, 2.6rem);
		font-weight: 700;
		color: var(--color-heading, var(--color-fg));
		letter-spacing: -0.02em;
		line-height: 1.15;
		margin: 0 0 12px;
	}

	.prose-subtitle {
		font-family: var(--font-heading);
		font-size: 1.05rem;
		line-height: 1.65;
		color: var(--color-muted);
		margin: 0 0 20px;
		max-width: 560px;
	}

	.prose-rule {
		width: 40px;
		height: 1px;
		background: var(--color-accent);
		opacity: 0.7;
	}

	/* Prose body */
	.prose-body {
		font-family: var(--font-body);
		font-size: 1.0625rem;
		line-height: 1.75;
		color: var(--color-fg);
	}

	.prose-body :global(h2) {
		font-family: var(--font-heading);
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-heading, var(--color-fg));
		letter-spacing: -0.01em;
		margin: 52px 0 14px;
		line-height: 1.25;
		scroll-margin-top: 88px;
	}

	.prose-body :global(p) {
		margin: 0 0 20px;
	}

	.prose-body :global(a) {
		color: var(--color-accent-text);
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in srgb, var(--color-accent-text) 40%, transparent);
		transition: text-decoration-color 150ms ease;
	}

	.prose-body :global(a:hover) {
		text-decoration-color: var(--color-accent-text);
	}

	.prose-body :global(ul) {
		margin: 0 0 20px;
		padding-left: 22px;
	}

	.prose-body :global(li) {
		margin-bottom: 7px;
	}

	.prose-body :global(hr) {
		border: none;
		height: 1px;
		background: var(--color-border);
		margin: 40px 0;
	}

	/* TOC */
	.prose-toc {
		position: fixed;
		right: 24px;
		top: 100px;
		width: 190px;
		max-height: calc(100vh - 120px);
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
		opacity: 0;
		transform: translateX(6px);
		animation: toc-enter 400ms ease 300ms forwards;
	}

	@keyframes toc-enter {
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.toc-label {
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.24em;
		color: var(--color-accent-text);
		margin: 0 0 10px;
		opacity: 0.8;
	}

	.toc-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.toc-list li a {
		display: block;
		font-family: var(--font-ui);
		font-size: 12px;
		line-height: 1.5;
		padding: 3px 0;
		color: var(--color-subtle);
		text-decoration: none;
		opacity: 0.8;
		transition:
			color 200ms ease,
			opacity 200ms ease;
	}

	.toc-list li a:hover {
		color: var(--color-fg);
		opacity: 1;
	}

	.toc-list li.toc-active a {
		color: var(--color-accent-text);
		opacity: 1;
		font-weight: 600;
	}

	@media (max-width: 1100px) {
		.prose-toc {
			display: none;
		}
	}
</style>
```

- [ ] **Step 2: Run type check**

```bash
npm run check
```

Expected: no errors on the new file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/ui/ProseLayout.svelte
git commit -m "feat: add ProseLayout component (Svelte 5 runes)"
```

---

## Task 2 — Footer component

**Files:**

- Create: `src/lib/components/ui/Footer.svelte`

- [ ] **Step 1: Create the file**

```svelte
<footer class="site-footer">
	<nav class="footer-nav" aria-label="Navigation du pied de page">
		<a href="/ccc">Catéchisme</a>
		<span class="footer-sep" aria-hidden="true">·</span>
		<a href="/bible">Bible</a>
		<span class="footer-sep" aria-hidden="true">·</span>
		<a href="/glossaire">Glossaire</a>
		<span class="footer-sep" aria-hidden="true">·</span>
		<a href="/a-propos">À propos</a>
	</nav>
	<p class="footer-motto">
		<span class="footer-cross" aria-hidden="true">✠</span>
		<span
			>MMXXVI · Pour la plus grande gloire de Dieu · <abbr title="Ad Majorem Dei Gloriam"
				>A.M.D.G.</abbr
			></span
		>
	</p>
	<p class="footer-copy">
		Texte du Catéchisme © Libreria Editrice Vaticana &nbsp;·&nbsp; Bible © 2022 Fraternité de
		Tibériade (CC BY-SA 4.0)
	</p>
</footer>

<style>
	.site-footer {
		border-top: 1px solid var(--color-border);
		padding: 2.5rem 1.5rem 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		background: var(--color-bg);
	}

	.footer-nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.footer-nav a {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-decoration: none;
		transition: color 150ms ease;
	}

	.footer-nav a:hover {
		color: var(--color-accent-text);
	}

	.footer-sep {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		color: var(--color-border);
	}

	.footer-motto {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-subtle);
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin: 0;
	}

	.footer-cross {
		color: var(--color-accent);
		font-size: 0.8rem;
	}

	.footer-copy {
		font-family: var(--font-ui);
		font-size: 0.62rem;
		color: var(--color-subtle);
		opacity: 0.7;
		margin: 0;
		text-align: center;
		line-height: 1.6;
	}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/ui/Footer.svelte
git commit -m "feat: add Footer component"
```

---

## Task 3 — Wire Footer into root layout

**Files:**

- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Add Footer import and usage**

In `src/routes/+layout.svelte`, add the import at the top of `<script>`:

```svelte
import Footer from '$lib/components/ui/Footer.svelte';
```

Then add `<Footer />` after the closing `</div>` of the flex container (line 63 in current file):

```svelte
<TopBar />
<div class="flex">
	{#if showSidebar}
		<Sidebar />
		<SidebarToggle />
	{/if}
	<div class="flex-1 min-w-0">
		{@render children()}
	</div>
	<StudyPanel />
</div>
<Footer />
```

- [ ] **Step 2: Run check and verify build**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "feat: add Footer to root layout"
```

---

## Task 4 — About page

**Files:**

- Create: `src/routes/a-propos/+page.ts`
- Create: `src/routes/a-propos/+page.svelte`

- [ ] **Step 1: Create `+page.ts`**

```ts
export const prerender = true;
```

- [ ] **Step 2: Create `+page.svelte`**

```svelte
<script lang="ts">
	import ProseLayout from '$lib/components/ui/ProseLayout.svelte';
</script>

<svelte:head>
	<title>À propos · Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content="Comment et pourquoi ce site a été construit : la première édition française du Catéchisme librement lisible et consultable sur le web."
	/>
	<link rel="canonical" href="https://catechismecatholique.fr/a-propos" />
	<meta property="og:title" content="À propos · Catéchisme de l'Église Catholique" />
	<meta
		property="og:description"
		content="La première édition numérique française du Catéchisme de l'Église Catholique, librement lisible, consultable et croisable avec la Bible."
	/>
</svelte:head>

<ProseLayout
	title="À propos de ce site"
	subtitle="La première édition numérique française du Catéchisme de l'Église Catholique, librement lisible et consultable sur le web."
	description="Comment et pourquoi ce site a été construit : la première édition française du Catéchisme librement lisible et consultable sur le web."
>
	<h2>Le Catéchisme et la lacune numérique</h2>

	<p>
		Le Catéchisme de l'Église catholique, promulgué le 11 octobre 1992 par saint Jean-Paul&nbsp;II
		et révisé en 1997, est le texte doctrinal de référence de l'Église universelle. En 2&nbsp;865
		paragraphes, il expose avec clarté et rigueur l'ensemble de la foi catholique : ce qu'elle
		croit, ce qu'elle célèbre, comment elle vit et comment elle prie.
	</p>

	<p>
		Pour qui souhaite le consulter en français sur le web, les options sont rares et imparfaites. Le
		site officiel <a
			href="https://www.vatican.va/archive/FRA0013/_INDEX.HTM"
			target="_blank"
			rel="noopener noreferrer">vatican.va</a
		>
		propose le texte intégral, mais dans une interface vieillissante, difficile à naviguer et peu lisible
		sur les appareils modernes. Des PDF et des ePubs circulent librement, mais ils restent cloisonnés
		: on peut les lire, pas vraiment les chercher ni les croiser avec d'autres sources. En anglais,
		<a
			href="https://www.catholiccrossreference.online/catechism/"
			target="_blank"
			rel="noopener noreferrer">catholiccrossreference.online</a
		>
		offre une lecture fluide avec concordance biblique, mais en anglais seulement.
	</p>

	<p>Le monde francophone méritait mieux.</p>

	<h2>Cette édition</h2>

	<p>
		Ce site reproduit fidèlement le texte de l'édition française officielle du Catéchisme de
		l'Église catholique (1998). Aucune modification éditoriale n'a été apportée : ni ajout, ni
		omission, ni reformulation. Ce que le Catéchisme dit, ce site le dit.
	</p>

	<p>
		La traduction de la Bible utilisée pour les références scripturaires est le
		<a
			href="https://pacificbibles.org/details.php?id=francl"
			target="_blank"
			rel="noopener noreferrer"><em>Néo-Crampon Libre</em></a
		>, une modernisation soigneuse de la traduction catholique française d'Augustin Crampon, mise à
		disposition par la Fraternité de Tibériade sous licence libre.
	</p>

	<div class="rights-block">
		<p class="rights-title">
			<span class="rights-cross" aria-hidden="true">✠</span> Catéchisme de l'Église Catholique
		</p>
		<p class="rights-body">
			© Libreria Editrice Vaticana, Cité du Vatican. Reproduit dans un cadre non commercial, à des
			fins d'accès libre à l'enseignement de l'Église.
		</p>
		<a
			href="https://www.vatican.va/archive/FRA0013/_INDEX.HTM"
			target="_blank"
			rel="noopener noreferrer"
			class="rights-link"
		>
			Texte officiel sur vatican.va →
		</a>
	</div>

	<div class="rights-block">
		<p class="rights-title">
			<span class="rights-cross" aria-hidden="true">✠</span> Néo-Crampon Libre · traduction biblique
		</p>
		<p class="rights-body">
			© 2022 Fraternité de Tibériade. Mise à disposition sous licence
			<a
				href="https://creativecommons.org/licenses/by-sa/4.0/"
				target="_blank"
				rel="noopener noreferrer"
				>Creative Commons Attribution - Partage dans les mêmes conditions 4.0</a
			>
			(CC BY-SA 4.0).
		</p>
		<a
			href="https://pacificbibles.org/details.php?id=francl"
			target="_blank"
			rel="noopener noreferrer"
			class="rights-link"
		>
			Néo-Crampon Libre sur pacificbibles.org →
		</a>
	</div>

	<h2>Ce que le site permet</h2>

	<ul>
		<li>
			Lire les 2&nbsp;865 paragraphes en navigation structurée (parties, sections, chapitres,
			articles)
		</li>
		<li>
			Rechercher par mot, par numéro de paragraphe (§&nbsp;27) ou par référence biblique
			(Jn&nbsp;1,&nbsp;14)
		</li>
		<li>Croiser chaque verset de la Bible avec les paragraphes du Catéchisme qui le citent</li>
		<li>Explorer le glossaire des termes théologiques, classés par thème</li>
		<li>Choisir parmi cinq modes d'affichage : clair, sépia, sombre, OLED, automatique</li>
	</ul>

	<p>Les textes sont libres de lecture. Aucun compte n'est requis.</p>

	<h2>Une idée simple</h2>

	<p>
		Ce projet a commencé comme une page de lecture : un simple affichage du texte du Catéchisme,
		propre et lisible sur un écran. Il a grandi, comme ces choses-là grandissent : la lecture
		appelait la recherche, la recherche appelait la concordance biblique, la concordance appelait le
		glossaire. Chaque ajout découlait naturellement du précédent.
	</p>

	<p>
		Le résultat est ce site. Il est offert librement, à toute personne qui souhaite lire, étudier ou
		approfondir sa foi à travers ce que l'Église enseigne. Il n'est pas fait pour un seul lecteur,
		ni pour sa gloire. Il est fait pour Dieu et pour Son Église, afin que Son enseignement demeure
		accessible à tous ceux qui le cherchent.
	</p>

	<p class="intercession">
		Saint Thomas d'Aquin, priez pour nous.<br />
		Saint Pie&nbsp;X, priez pour nous.
	</p>

	<p class="laus-deo"><em>Laus Deo.</em></p>

	<div class="cta-row">
		<a href="/ccc" class="cta-btn">Lire le Catéchisme →</a>
	</div>
</ProseLayout>

<style>
	.rights-block {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 18px 22px;
		margin: 28px 0;
		background: color-mix(in srgb, var(--color-border) 25%, transparent);
	}

	.rights-title {
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.1em;
		color: var(--color-accent-text);
		margin: 0 0 8px;
		display: flex;
		align-items: center;
		gap: 7px;
	}

	.rights-cross {
		color: var(--color-accent);
	}

	.rights-body {
		font-family: var(--font-body);
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--color-fg);
		margin: 0 0 10px;
	}

	.rights-link {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-accent-text);
		text-decoration: none;
		letter-spacing: 0.04em;
	}

	.rights-link:hover {
		color: var(--color-accent);
	}

	.intercession {
		margin-top: 2.5rem;
		text-align: center;
		color: var(--color-subtle);
		font-size: 0.92rem;
		font-style: italic;
		line-height: 1.8;
	}

	.laus-deo {
		margin-top: 1.25rem;
		text-align: center;
		color: var(--color-accent-text);
		font-family: var(--font-heading);
		font-size: 1.4rem;
		letter-spacing: 0.06em;
	}

	.cta-row {
		display: flex;
		justify-content: center;
		margin-top: 2.5rem;
	}

	.cta-btn {
		display: inline-block;
		padding: 10px 26px;
		border: 1px solid var(--color-accent);
		border-radius: 3px;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-accent-text);
		text-decoration: none;
		transition:
			background 150ms ease,
			color 150ms ease;
	}

	.cta-btn:hover {
		background: var(--color-accent);
		color: var(--color-panel);
	}
</style>
```

- [ ] **Step 3: Run check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 4: Verify build succeeds**

```bash
npm run build
```

Expected: build completes, `/a-propos` prerendered.

- [ ] **Step 5: Commit**

```bash
git add src/routes/a-propos/
git commit -m "feat: add /a-propos page in French"
```

---

## Task 5 — README rewrite

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Rewrite README.md**

````markdown
# Catéchisme de l'Église Catholique

**Édition numérique française.** Lecture, recherche et concordance biblique en ligne.

→ [catechismecatholique.fr](https://catechismecatholique.fr)

---

Le Catéchisme de l'Église catholique, promulgué par saint Jean-Paul II en 1992,
rassemble l'ensemble de la doctrine de l'Église en 2 865 paragraphes. Ce site en
est l'édition numérique française : lisible, consultable et librement accessible.

## Fonctionnalités

- Lecture des 2 865 paragraphes par partie, section et chapitre
- Recherche plein texte par mot, référence (§ 27) ou verset biblique (Jn 1, 14)
- Concordance biblique : chaque verset lié aux paragraphes du Catéchisme qui le citent
- Glossaire des termes théologiques classés par thème
- Cinq thèmes d'affichage : clair, sépia, sombre, OLED, automatique

## Stack

| Couche      | Technologie                    |
| ----------- | ------------------------------ |
| Framework   | SvelteKit 2 + Svelte 5 (runes) |
| Style       | Tailwind CSS 3 + CSS variables |
| Déploiement | Cloudflare Pages + Workers     |
| Recherche   | MiniSearch (client-side)       |
| Tests       | Vitest · Playwright            |

## Développement local

```bash
npm install
npm run dev          # serveur de développement
npm run build        # build complet (prepare-data + vite)
npm run check        # svelte-check + tsc
npm run test         # tests unitaires (vitest)
npm run test:e2e     # tests e2e (playwright)
```
````

La commande `build` exécute d'abord `scripts/prepare-data.ts`, qui génère les
fichiers JSON dans `static/data/` à partir des sources XML du Catéchisme.

## Source & droits

**Catéchisme :** © Libreria Editrice Vaticana, Cité du Vatican.  
Reproduit dans un cadre non commercial, à des fins d'accès libre.  
Texte officiel : [vatican.va](https://www.vatican.va/archive/FRA0013/_INDEX.HTM)

**Traduction biblique :** _Néo-Crampon Libre_ © 2022 Fraternité de Tibériade —
modernisation de la traduction catholique française de Crampon.  
Licence : [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)  
Source : [pacificbibles.org](https://pacificbibles.org/details.php?id=francl)

**Code source :** licence MIT.

---

_Pour la plus grande gloire de Dieu. A.M.D.G._

````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README in French"
````

---

## Task 6 — Final check and push

- [ ] **Step 1: Run full check suite**

```bash
npm run check && npm run lint
```

Expected: no errors, no lint warnings.

- [ ] **Step 2: Push**

```bash
git push
```

---

## Self-Review

**Spec coverage:**

- ✅ README rewritten in French (Task 5)
- ✅ ProseLayout component created in Svelte 5 runes (Task 1)
- ✅ Footer component with nav + motto + copyright (Task 2)
- ✅ Footer wired to root layout (Task 3)
- ✅ `/a-propos` page with all 4 sections + litanie + Laus Deo + CTA (Task 4)
- ✅ Vatican.va link in about page
- ✅ catholiccrossreference.online link in about page
- ✅ Copyright block: © LEV + link
- ✅ Copyright block: Néo-Crampon Libre © 2022 Fraternité de Tibériade + CC BY-SA 4.0 + pacificbibles.org link
- ✅ Saints patrons: Thomas d'Aquin, Pie X
- ✅ Canonical: catechismecatholique.fr
- ✅ Prerender for `/a-propos`

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:** `ProseLayout` uses `Snippet` import for `children` prop — consistent with Svelte 5 patterns used throughout this codebase (see `ConcordanceReader.svelte`).
