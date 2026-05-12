<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type YearCard = {
		key: 'a' | 'b' | 'c';
		title: string;
		evangelist: string;
		lede: string;
	};

	const YEARS: YearCard[] = [
		{
			key: 'a',
			title: 'Année A',
			evangelist: 'saint Matthieu',
			lede: "L'Évangile de saint Matthieu, qui présente Jésus comme le nouveau Moïse et l'accomplissement de la Loi, est lu chaque dimanche."
		},
		{
			key: 'b',
			title: 'Année B',
			evangelist: 'saint Marc',
			lede: "L'Évangile de saint Marc · le plus ancien et le plus dépouillé · est lu chaque dimanche, complété par saint Jean au temps pascal."
		},
		{
			key: 'c',
			title: 'Année C',
			evangelist: 'saint Luc',
			lede: "L'Évangile de saint Luc, attentif aux pauvres et à la miséricorde, est lu chaque dimanche tout au long de l'année."
		}
	];

	const totalThemes = $derived(data.index.total_clusters);
</script>

<svelte:head>
	<title>Calendrier liturgique · Catéchisme</title>
	<meta
		name="description"
		content="Le calendrier liturgique romain (années A, B, C) cross-référencé au Catéchisme de l'Église catholique : pour chaque dimanche et chaque solennité, les paragraphes du CEC à méditer."
	/>
</svelte:head>

<main class="cal-index">
	<header class="hero">
		<p class="hero-kicker">Calendrier liturgique romain</p>
		<h1 class="hero-title">Lire le Catéchisme<br />au fil de l'année</h1>
		<p class="hero-lede">
			Pour chaque dimanche et chaque grande fête du calendrier romain, les paragraphes du Catéchisme
			à méditer&nbsp;: une lecture suivie de la doctrine catholique au rythme de la liturgie.
			<br /><span class="hero-stat"
				>{data.index.total_feasts} fêtes · {totalThemes} thèmes de référence</span
			>
		</p>
	</header>

	<div class="cards" aria-label="Les années liturgiques">
		{#each YEARS as year, i (year.key)}
			{@const stats = data.index.years[i]}
			<a class="year-card" href="/calendrier/{year.key}">
				<span class="year-kicker">{year.title}</span>
				<h2 class="year-title">L'Évangile selon<br />{year.evangelist}</h2>
				<p class="year-lede">{year.lede}</p>
				{#if stats}
					<p class="year-stat">
						{stats.total_feasts} fêtes · {stats.total_clusters} thèmes
					</p>
				{/if}
			</a>
		{/each}
		<a class="fixed-card" href="/calendrier/solennites">
			<span class="fixed-kicker">Solennités · dates fixes</span>
			<h2 class="fixed-title">Les grandes solennités du calendrier</h2>
			<p class="fixed-lede">
				Saint Joseph, saint Pierre et saint Paul, l'Assomption, la Toussaint, l'Immaculée Conception
				· les solennités principales avec leurs paragraphes du Catéchisme.
			</p>
			<ul class="fixed-list">
				{#each data.index.fixed_feasts as f (f.slug)}
					<li><span class="fixed-date">{f.date}</span> · {f.title}</li>
				{/each}
			</ul>
		</a>
	</div>
</main>

<style>
	.cal-index {
		max-width: 56rem;
		margin: 0 auto;
		padding: 2.75rem 1.5rem 3.5rem;
	}

	.hero {
		text-align: center;
		max-width: 44rem;
		margin: 0 auto 3rem;
	}
	.hero-kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.85rem;
	}
	.hero-title {
		font-family: var(--font-heading);
		font-size: clamp(1.6rem, 4.5vw, 2.6rem);
		font-weight: 600;
		line-height: 1.15;
		color: var(--color-fg);
		margin: 0 0 1.25rem;
	}
	.hero-lede {
		font-family: var(--font-body);
		font-size: clamp(1rem, 1.5vw, 1.1rem);
		line-height: 1.65;
		color: var(--color-subtle);
		margin: 0;
	}
	.hero-stat {
		display: inline-block;
		margin-top: 0.5rem;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		color: var(--color-muted);
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.25rem;
	}
	@media (max-width: 760px) {
		.cards {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}

	.year-card,
	.fixed-card {
		display: flex;
		flex-direction: column;
		padding: 1.5rem 1.5rem 1.25rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-border) 12%, transparent);
		text-decoration: none;
		color: inherit;
		transition:
			border-color 150ms ease,
			background-color 150ms ease;
	}
	.year-card:hover,
	.fixed-card:hover {
		border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
	}
	.year-card:hover .year-title,
	.fixed-card:hover .fixed-title {
		color: var(--color-accent);
	}

	.year-kicker,
	.fixed-kicker {
		display: block;
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin-bottom: 0.4rem;
	}
	.year-title,
	.fixed-title {
		font-family: var(--font-heading);
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.25;
		color: var(--color-fg);
		margin: 0 0 0.85rem;
		transition: color 150ms ease;
	}
	.year-lede,
	.fixed-lede {
		font-family: var(--font-body);
		font-size: 0.92rem;
		line-height: 1.6;
		color: var(--color-subtle);
		margin: 0 0 0.65rem;
	}
	.year-stat {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		color: var(--color-muted);
		margin: 0.4rem 0 0;
	}

	.fixed-card {
		grid-column: 1 / -1;
		padding: 1.75rem 1.75rem 1.5rem;
	}
	.fixed-title {
		font-size: 1.4rem;
	}
	.fixed-list {
		margin: 0.75rem 0 0;
		padding: 0;
		list-style: none;
		font-family: var(--font-body);
		font-size: 0.92rem;
		color: var(--color-subtle);
		line-height: 1.7;
	}
	.fixed-list li {
		padding: 0.1rem 0;
	}
	.fixed-date {
		display: inline-block;
		min-width: 6.5rem;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--color-muted);
	}
</style>
