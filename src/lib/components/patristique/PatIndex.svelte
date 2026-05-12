<script lang="ts">
	import type { PatStructure } from '$lib/data/types';
	import { frenchPunct } from '$lib/utils/typography';

	let { structure, lede }: { structure: PatStructure; lede: string } = $props();
	const work = $derived(structure.slug);
</script>

<svelte:head>
	<title>{structure.title} — {structure.author}</title>
	<meta
		name="description"
		content={`${structure.title} (${structure.date}) — ${structure.author}. Traduction ${structure.translator}.`}
	/>
</svelte:head>

<main class="pat-index">
	<header class="hero">
		<p class="hero-kicker">{structure.author} · {structure.date}</p>
		<h1 class="hero-title">{frenchPunct(structure.title)}</h1>
		{#if structure.subtitle}
			<p class="hero-sub">{structure.subtitle}</p>
		{/if}
		<p class="hero-lede">{lede}</p>
		<p class="hero-translator">Traduction {structure.translator}</p>
	</header>

	<ol class="chapters">
		{#each structure.chapters as ch (ch.slug)}
			<li>
				<a class="chapter-row" href={`/${work}/${ch.slug}`}>
					<span class="chapter-label">{ch.label}</span>
					<span class="chapter-arrow" aria-hidden="true">→</span>
				</a>
			</li>
		{/each}
	</ol>
</main>

<style>
	.pat-index {
		max-width: 680px;
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 4rem) clamp(1.25rem, 4vw, 2.5rem);
		color: var(--color-fg);
		font-family: var(--font-body);
	}
	.hero {
		text-align: center;
		margin-bottom: clamp(2rem, 6vw, 3.5rem);
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
		font-size: clamp(2.2rem, 5.5vw, 3.2rem);
		font-weight: 700;
		line-height: 1.1;
		margin: 0;
	}
	.hero-sub {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1rem;
		color: var(--color-subtle);
		margin: 0.55rem 0 0;
	}
	.hero-lede {
		max-width: 52ch;
		margin: 1.25rem auto 0;
		font-size: 1rem;
		line-height: 1.65;
	}
	.hero-translator {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.12em;
		color: var(--color-muted);
		margin: 1.25rem 0 0;
	}

	.chapters {
		list-style: none;
		margin: 0;
		padding: 1.25rem 0 0;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 9rem), 1fr));
		gap: 0.3rem 0.5rem;
	}
	.chapter-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.65rem;
		padding: 0.5rem 0.85rem;
		text-decoration: none;
		color: var(--color-fg);
		border-radius: 4px;
		transition:
			background-color 120ms ease,
			color 120ms ease;
	}
	.chapter-row:hover {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		color: var(--color-accent);
	}
	.chapter-label {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 0.95rem;
		font-weight: 600;
	}
	.chapter-arrow {
		color: var(--color-muted);
		font-size: 0.85rem;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.chapter-row:hover .chapter-arrow {
		transform: translateX(3px);
		color: var(--color-accent);
	}
</style>
