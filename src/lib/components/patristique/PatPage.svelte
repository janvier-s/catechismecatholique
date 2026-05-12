<script lang="ts">
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { frenchPunct } from '$lib/utils/typography';
	import type { PatFull } from '$lib/data/types';

	let { full, lede }: { full: PatFull; lede: string } = $props();

	const work = $derived(full.structure.slug);
	const meta = $derived(full.structure);
</script>

<svelte:head>
	<title>{meta.title} — {meta.author}</title>
	<meta
		name="description"
		content={`${meta.title} (${meta.date}) — ${meta.author}. Traduction ${meta.translator}.`}
	/>
</svelte:head>

<main class="pat-page" use:scrollSpy>
	<header class="hero">
		<p class="hero-kicker">{meta.author} · {meta.date}</p>
		<h1 class="hero-title">{frenchPunct(meta.title)}</h1>
		{#if meta.subtitle}
			<p class="hero-sub">{meta.subtitle}</p>
		{/if}
		<p class="hero-lede">{lede}</p>
		<p class="hero-meta">
			<span>Traduction {meta.translator}</span>
			<span aria-hidden="true">·</span>
			<span>{meta.totalChapters} chapitres</span>
		</p>
	</header>

	<article class="prose reader-prose">
		{#each full.chapters as ch (ch.slug)}
			<section class="chapter" id={ch.slug} aria-labelledby={`h-${ch.slug}`}>
				<header class="chapter-head">
					<h2 class="chapter-h" id={`h-${ch.slug}`}>
						<span class="chapter-roman">{ch.roman}</span>
						{#if ch.title}
							<span class="chapter-title">{frenchPunct(ch.title)}</span>
						{/if}
						<a
							class="chapter-anchor"
							href={`/${work}#${ch.slug}`}
							aria-label={`Lien direct au chapitre ${ch.roman}`}
						>
							<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
								<path
									d="M9.5 14.5L14.5 9.5M7 17L10 14M14 10L17 7M5 19a3 3 0 010-4l3-3a3 3 0 014 0M16 5a3 3 0 014 4l-3 3a3 3 0 01-4 0"
									fill="none"
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
								/>
							</svg>
						</a>
					</h2>
				</header>
				{#each ch.blocks as block, i (i)}
					{#if block.kind === 'subheading'}
						<h3 class="subheading">{frenchPunct(block.text)}</h3>
					{:else if block.kind === 'epigraph'}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<p class="epigraph">{@html frenchPunct(block.html)}</p>
					{:else}
						<p class="para">
							{#if block.n}
								<span class="para-num" aria-hidden="true">{block.n}.</span>
							{/if}
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->{@html frenchPunct(
								block.html
							)}
						</p>
					{/if}
				{/each}
			</section>
		{/each}
	</article>

	<footer class="colophon">
		<p>
			Traduction de {meta.translator}, publiée par la <em>Librairie Alphonse Picard et fils</em>
			(Paris). Texte établi par Hippolyte Hemmer.
		</p>
		<p class="source">
			Source numérique&nbsp;: <a href="https://fr.wikisource.org/" rel="noopener"
				>fr.wikisource.org</a
			>
		</p>
	</footer>
</main>

<style>
	.pat-page {
		max-width: 720px;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1.25rem, 4vw, 2.5rem);
		color: var(--color-fg);
		font-family: var(--font-body);
	}

	/* Hero */
	.hero {
		text-align: center;
		margin-bottom: clamp(2rem, 6vw, 3.5rem);
		padding-bottom: 1.75rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
	}
	.hero-kicker {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
		margin: 0 0 0.85rem;
	}
	.hero-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: clamp(2rem, 5vw, 2.9rem);
		font-weight: 700;
		line-height: 1.1;
		margin: 0;
		text-wrap: balance;
	}
	.hero-sub {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1.05rem;
		color: var(--color-subtle);
		margin: 0.55rem 0 0;
	}
	.hero-lede {
		max-width: 54ch;
		margin: 1.5rem auto 0;
		font-size: 1rem;
		line-height: 1.65;
	}
	.hero-meta {
		display: inline-flex;
		gap: 0.65rem;
		margin: 1.5rem 0 0;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	/* Body */
	.prose {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.7);
	}

	.chapter {
		scroll-margin-top: 80px;
		padding-top: 0.5rem;
	}
	.chapter + .chapter {
		margin-top: 2.5rem;
	}
	.chapter-head {
		margin: 0 0 1.25rem;
	}
	.chapter-h {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.65rem;
		margin: 0;
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--color-heading, var(--color-fg));
		text-wrap: balance;
	}
	.chapter-roman {
		display: inline-flex;
		align-items: baseline;
		font-variant-numeric: tabular-nums;
		color: var(--color-accent);
		padding: 0.1rem 0.55rem 0.2rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
		min-width: 2.5em;
		justify-content: center;
		flex: 0 0 auto;
	}
	.chapter-title {
		flex: 1 1 auto;
		min-width: 0;
	}
	.subheading {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-heading, var(--color-fg));
		margin: 1.75rem 0 0.75rem;
		padding-left: 0.75rem;
		border-left: 2px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
		text-wrap: balance;
	}
	.epigraph {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.92rem;
		color: var(--color-subtle);
		line-height: 1.55;
		margin: 0 0 1.5rem;
		padding: 0 0 0.75rem;
		border-bottom: 1px dashed color-mix(in srgb, var(--color-fg) 18%, transparent);
	}
	.para-num {
		display: inline-block;
		font-family: var(--font-ui);
		font-size: 0.78em;
		font-weight: 700;
		color: var(--color-accent);
		margin-right: 0.45em;
		font-variant-numeric: tabular-nums;
	}
	.chapter-anchor {
		display: inline-flex;
		align-items: center;
		color: var(--color-muted);
		text-decoration: none;
		opacity: 0;
		transition: opacity 150ms ease;
		padding: 0.25rem;
	}
	.chapter-h:hover .chapter-anchor {
		opacity: 1;
	}
	.chapter-anchor:hover {
		color: var(--color-accent);
	}

	.para {
		margin: 0 0 1rem;
	}
	.para:last-child {
		margin-bottom: 0;
	}

	/* Hemmer/Méridier verse markers */
	.para :global(sup.verse-num) {
		display: inline-block;
		font-family: var(--font-ui);
		font-size: 0.62em;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-accent);
		margin-right: 0.25em;
		vertical-align: 0.45em;
		line-height: 1;
	}

	/* Colophon */
	.colophon {
		margin-top: 4rem;
		padding-top: 2rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 14%, transparent);
		font-family: var(--font-ui);
		font-size: 0.75rem;
		color: var(--color-muted);
		line-height: 1.6;
	}
	.colophon p {
		margin: 0 0 0.45rem;
	}
	.colophon .source {
		font-size: 0.7rem;
	}
	.colophon a {
		color: inherit;
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--color-fg) 30%, transparent);
		text-underline-offset: 3px;
	}
	.colophon a:hover {
		color: var(--color-accent);
	}
</style>
