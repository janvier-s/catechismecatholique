<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const preamble = $derived(data.structure.chapters.find((c) => c.n === null));
	const numberedChapters = $derived(data.structure.chapters.filter((c) => c.n !== null));
</script>

<svelte:head>
	<title>Présentation Générale du Missel Romain</title>
	<meta
		name="description"
		content="Présentation Générale du Missel Romain (PGMR, 2002) — 399 paragraphes en 9 chapitres précédés d'un préambule."
	/>
</svelte:head>

<main class="pg-index">
	<header class="hero">
		<p class="hero-kicker">Congrégation pour le Culte divin · 2002</p>
		<h1 class="hero-title">Présentation Générale du Missel Romain</h1>
		<p class="hero-lede">
			Norme liturgique et théologique de la messe romaine en {data.structure.totalParagraphs} paragraphes,
			organisée en neuf chapitres précédés d'un préambule.
		</p>
	</header>

	{#if preamble}
		<section class="part part-intro">
			<header class="part-head">
				<h2 class="part-title">
					<a class="part-title-link" href="/pgmr/{preamble.slug}">Préambule</a>
				</h2>
				{#if preamble.paragraphRange}
					<span class="part-range">
						{preamble.paragraphRange[0]}–{preamble.paragraphRange[1]}
					</span>
				{/if}
			</header>
		</section>
	{/if}

	<ul class="chapters">
		{#each numberedChapters as ch (ch.slug)}
			<li>
				<a class="chapter-row" href="/pgmr/{ch.slug}">
					<span class="chapter-num">{ch.n}</span>
					<span class="chapter-title">{ch.title}</span>
					{#if ch.paragraphRange}
						<span class="chapter-range">
							{ch.paragraphRange[0]}–{ch.paragraphRange[1]}
						</span>
					{/if}
					<span class="chapter-arrow" aria-hidden="true">→</span>
				</a>
			</li>
		{/each}
	</ul>
</main>

<style>
	.pg-index {
		max-width: 900px;
		margin: 0 auto;
		padding: clamp(0.75rem, 3vw, 2rem) clamp(1.25rem, 4vw, 2.5rem);
		color: var(--color-fg);
		font-family: var(--font-body);
	}
	.hero {
		text-align: center;
		margin-bottom: clamp(2rem, 5vw, 3.5rem);
	}
	.hero-kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 0.85rem;
	}
	.hero-title {
		font-family: var(--font-heading);
		font-size: clamp(2rem, 5vw, 3.2rem);
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.01em;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.hero-lede {
		max-width: 52ch;
		margin: 1.25rem auto 0;
		font-style: italic;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--color-subtle);
	}
	.part {
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		padding-top: 1.25rem;
		margin: 1.75rem 0;
	}
	.part-head {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.part-title {
		font-family: var(--font-heading);
		font-size: clamp(1.3rem, 2.6vw, 1.7rem);
		font-weight: 700;
		line-height: 1.25;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.part-title-link {
		color: inherit;
		text-decoration: none;
	}
	.part-title-link:hover {
		color: var(--color-accent);
	}
	.part-range {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-muted);
		white-space: nowrap;
		margin-left: auto;
		font-variant-numeric: tabular-nums;
	}
	.chapters {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		padding-top: 1.25rem;
	}
	.chapter-row {
		display: grid;
		grid-template-columns: 2rem 1fr auto auto;
		align-items: center;
		gap: 0.85rem;
		padding: 0.6rem 0.75rem;
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
	.chapter-num {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
		text-align: right;
	}
	.chapter-row:hover .chapter-num {
		color: color-mix(in srgb, var(--color-accent) 60%, var(--color-muted));
	}
	.chapter-title {
		font-family: var(--font-body);
		font-size: 0.95rem;
		line-height: 1.4;
	}
	.chapter-range {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		color: var(--color-muted);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
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
