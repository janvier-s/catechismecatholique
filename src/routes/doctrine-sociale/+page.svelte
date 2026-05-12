<script lang="ts">
	import MetaTags from '$lib/components/ui/MetaTags.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Numbered chapters (1..12), grouped under their part for display.
	// Front matter (Secrétairerie, Présentation) is browsable but not the
	// headline of the index · we surface it as a small "Préambule" rail.
	const numberedParts = $derived(data.structure.parts.filter((p) => p.kind === 'part'));
	const intro = $derived(data.structure.parts.find((p) => p.kind === 'intro'));
	const conclusion = $derived(data.structure.parts.find((p) => p.kind === 'conclusion'));
	const front = $derived(data.structure.parts.filter((p) => p.kind === 'front'));
</script>

<MetaTags
	title="Compendium de la doctrine sociale de l'Église"
	description="Compendium de la doctrine sociale de l'Église (2004) : 583 paragraphes en trois parties, du Conseil pontifical Justice et Paix."
	image="/img/bibliotheque/doctrine-sociale.webp"
	schema={{
		kind: 'book',
		name: "Compendium de la doctrine sociale de l'Église",
		author: 'Conseil pontifical Justice et Paix',
		datePublished: '2004',
		about: "Synthèse de l'enseignement social de l'Église catholique"
	}}
/>

<main class="ds-index">
	<header class="hero">
		<p class="hero-kicker">Conseil pontifical Justice et Paix · 2004</p>
		<h1 class="hero-title">Compendium de la doctrine sociale de l'Église</h1>
		<p class="hero-lede">
			Synthèse de l'enseignement social de l'Église en {data.structure.totalParagraphs} paragraphes, organisée
			en trois parties : les fondements, les domaines, et la doctrine sociale en action.
		</p>
	</header>

	{#if front.length > 0}
		<aside class="front-rail">
			{#each front as part (part.slug)}
				<a class="front-link" href="/doctrine-sociale/{part.slug}">{part.title} →</a>
			{/each}
		</aside>
	{/if}

	{#if intro}
		<section class="part part-intro">
			<header class="part-head">
				<h2 class="part-title">
					<a class="part-title-link" href="/doctrine-sociale/{intro.slug}">Introduction</a>
				</h2>
				{#if intro.chapters[0]?.paragraphRange}
					<span class="part-range">
						{intro.chapters[0].paragraphRange[0]}–{intro.chapters[0].paragraphRange[1]}
					</span>
				{/if}
			</header>
		</section>
	{/if}

	<div class="parts">
		{#each numberedParts as part, partIdx (part.slug)}
			<section class="part">
				<header class="part-head">
					<h2 class="part-title">
						{['Première', 'Deuxième', 'Troisième'][partIdx] ?? ''} partie
					</h2>
					<span class="part-count"
						>{part.chapters.length} chapitre{part.chapters.length > 1 ? 's' : ''}</span
					>
				</header>
				<ul class="chapters">
					{#each part.chapters as ch (ch.slug)}
						<li>
							<a class="chapter-row" href="/doctrine-sociale/{ch.slug}">
								{#if ch.n !== null}
									<span class="chapter-num">{ch.n}</span>
								{:else}
									<span class="chapter-num">·</span>
								{/if}
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
			</section>
		{/each}
	</div>

	{#if conclusion}
		<section class="part part-conclusion">
			<header class="part-head">
				<h2 class="part-title">
					<a class="part-title-link" href="/doctrine-sociale/{conclusion.slug}">Conclusion</a>
				</h2>
				{#if conclusion.chapters[0]?.paragraphRange}
					<span class="part-range">
						{conclusion.chapters[0].paragraphRange[0]}–{conclusion.chapters[0].paragraphRange[1]}
					</span>
				{/if}
			</header>
		</section>
	{/if}
</main>

<style>
	.ds-index {
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

	.front-rail {
		display: flex;
		gap: 1.25rem;
		flex-wrap: wrap;
		justify-content: center;
		margin-bottom: 2.5rem;
	}
	.front-link {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-decoration: none;
	}
	.front-link:hover {
		color: var(--color-accent);
	}

	.parts {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}
	.part {
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		padding-top: 1.75rem;
	}
	.part-intro,
	.part-conclusion {
		padding-top: 1.25rem;
		margin: 1.75rem 0;
	}
	.part-head {
		margin-bottom: 1.1rem;
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
	.part-count,
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
