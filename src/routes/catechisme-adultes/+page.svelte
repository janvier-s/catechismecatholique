<script lang="ts">
	import { frenchPunct } from '$lib/utils/typography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const firstSection = $derived(data.structure.sections[0]?.slug ?? '');
</script>

<svelte:head>
	<title>Catéchisme pour Adultes des Évêques de France (1991)</title>
	<meta
		name="description"
		content={`Le Catéchisme pour Adultes publié par les Évêques de France en 1991. ${data.structure.totalChapters} chapitres, ${data.structure.totalParagraphs} paragraphes — un exposé thématique de la foi catholique.`}
	/>
</svelte:head>

<main class="cpa-index">
	<header class="hero">
		<p class="hero-kicker">Conférence des Évêques de France · 1991</p>
		<h1 class="hero-title">Catéchisme pour Adultes</h1>
		<p class="hero-sub">Catéchisme pour adultes catholiques publié par les Évêques de France</p>
		<p class="hero-lede">
			Précédant le <em>Catéchisme de l'Église catholique</em> universel de 1992, ce catéchisme adapté
			à la mentalité française propose un exposé thématique de la foi : moins technique que le CEC, il
			accompagne le lecteur à travers les grands mouvements de la Révélation divine.
		</p>
		{#if firstSection}
			<p class="hero-cta">
				<a class="cta-link" href={`/catechisme-adultes/${firstSection}`}>Commencer la lecture →</a>
			</p>
		{/if}
		<p class="hero-stats">
			<span>{data.structure.sections.length} sections</span>
			<span aria-hidden="true">·</span>
			<span>{data.structure.totalChapters} chapitres</span>
			<span aria-hidden="true">·</span>
			<span>{data.structure.totalParagraphs} paragraphes</span>
		</p>
	</header>

	{#each data.structure.sections as section (section.slug)}
		<section class="section" id={section.slug}>
			<header class="section-head">
				<a class="section-link" href={`/catechisme-adultes/${section.slug}`}>
					<p class="section-kicker">Section {section.ordinal}</p>
					<h2 class="section-title">{frenchPunct(section.title)}</h2>
				</a>
			</header>
			<ol class="chapters">
				{#each section.chapters as ch (ch.slug)}
					<li>
						<a class="chapter-row" href={`/catechisme-adultes/${section.slug}#${ch.slug}`}>
							<span class="chapter-ord">{ch.ordinal}</span>
							<span class="chapter-title">{frenchPunct(ch.title)}</span>
							<span class="chapter-range">
								{#if ch.paraRange[0] === ch.paraRange[1]}
									{ch.paraRange[0]}
								{:else}
									{ch.paraRange[0]}–{ch.paraRange[1]}
								{/if}
							</span>
							<span class="chapter-arrow" aria-hidden="true">→</span>
						</a>
					</li>
				{/each}
			</ol>
		</section>
	{/each}
</main>

<style>
	.cpa-index {
		max-width: 820px;
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 4rem) clamp(1.25rem, 4vw, 2.5rem);
		color: var(--color-fg);
		font-family: var(--font-body);
	}
	.hero {
		text-align: center;
		margin-bottom: clamp(2rem, 5vw, 3.5rem);
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
		font-size: clamp(2.2rem, 5.5vw, 3.4rem);
		font-weight: 700;
		line-height: 1.1;
		margin: 0;
		text-wrap: balance;
	}
	.hero-sub {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1rem;
		color: var(--color-subtle);
		margin: 0.6rem 0 0;
	}
	.hero-lede {
		max-width: 52ch;
		margin: 1.25rem auto 0;
		font-size: 1rem;
		line-height: 1.65;
	}
	.hero-cta {
		margin: 1.75rem 0 0;
	}
	.cta-link {
		font-family: var(--font-ui);
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-accent);
		text-decoration: none;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 60%, transparent);
		padding-bottom: 0.15rem;
	}
	.hero-stats {
		display: inline-flex;
		gap: 0.65rem;
		margin: 1.5rem 0 0;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	.section {
		margin-top: 2.5rem;
		padding-top: 1.5rem;
		scroll-margin-top: 80px;
	}
	.section + .section {
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
	}
	.section-head {
		margin-bottom: 1rem;
	}
	.section-link {
		display: block;
		text-decoration: none;
		color: inherit;
	}
	.section-link:hover .section-title {
		color: var(--color-accent);
	}
	.section-kicker {
		font-family: var(--font-ui);
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
		margin: 0 0 0.25rem;
	}
	.section-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 1.4rem;
		font-weight: 700;
		margin: 0;
		text-wrap: balance;
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
		grid-template-columns: 2.5rem 1fr 5rem 1rem;
		gap: 0.85rem;
		align-items: baseline;
		padding: 0.55rem 0.85rem;
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
	.chapter-ord {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-accent);
		text-align: right;
	}
	.chapter-title {
		font-family: var(--font-body);
		font-size: 0.96rem;
		text-wrap: balance;
	}
	.chapter-range {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
		text-align: right;
	}
	.chapter-arrow {
		color: var(--color-muted);
		font-size: 0.85rem;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
		text-align: right;
	}
	.chapter-row:hover .chapter-arrow {
		transform: translateX(3px);
		color: var(--color-accent);
	}
</style>
