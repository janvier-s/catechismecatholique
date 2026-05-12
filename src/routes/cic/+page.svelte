<script lang="ts">
	import MetaTags from '$lib/components/ui/MetaTags.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const codes = $derived(data.structure.codes);

	const META = {
		'1983': {
			eyebrow: 'Codex Iuris Canonici · 1983',
			title: 'Code de Droit Canonique',
			subtitle: 'Promulgué par saint Jean-Paul II',
			date: '25 janvier 1983',
			lede: "Le code en vigueur dans l'Église latine, fruit de la révision voulue par le concile Vatican II."
		},
		'1917': {
			eyebrow: 'Codex Iuris Canonici · 1917',
			title: 'Code Pio-Benedictin',
			subtitle: 'Promulgué par Benoît XV',
			date: '27 mai 1917',
			lede: "Premier code unifié du droit canonique de l'Église latine, en vigueur jusqu'en 1983."
		}
	} as const;

	function statsFor(code: '1983' | '1917') {
		const c = codes.find((x) => x.code === code);
		if (!c) return { livres: 0, canons: 0 };
		const canons = c.livres.reduce((s, l) => s + l.totalCanons, 0);
		return { livres: c.livres.length, canons };
	}
</script>

<MetaTags
	title="Code de Droit Canonique · 1917 et 1983"
	description="Les deux codes de droit canonique de l'Église latine : le Code de 1983 promulgué par saint Jean-Paul II, et le Code Pio-Benedictin de 1917."
	image="/img/bibliotheque/cic-1983.webp"
	schema={{
		kind: 'book',
		name: 'Codex Iuris Canonici',
		datePublished: '1983',
		about: "Droit canonique de l'Église latine"
	}}
/>

<main class="cic-chooser">
	<header class="hero">
		<p class="hero-kicker">Église latine</p>
		<h1 class="hero-title">Code de Droit Canonique</h1>
		<p class="hero-lede">
			L'Église latine a connu deux codifications successives de son droit. Choisissez l'un des deux
			codes pour le parcourir livre par livre.
		</p>
	</header>

	<div class="cards">
		{#each ['1917', '1983'] as const as code (code)}
			{@const stats = statsFor(code)}
			<a class="card" href={`/cic/${code}`}>
				<p class="card-eyebrow">{META[code].eyebrow}</p>
				<h2 class="card-title">{META[code].title}</h2>
				<p class="card-sub">{META[code].subtitle}</p>
				<p class="card-date">{META[code].date}</p>
				<p class="card-lede">{META[code].lede}</p>
				<p class="card-stats">
					<span>{stats.livres} livres</span>
					<span aria-hidden="true">·</span>
					<span>{stats.canons.toString()} canons</span>
				</p>
				<span class="card-cta" aria-hidden="true">Lire le code →</span>
			</a>
		{/each}
	</div>
</main>

<style>
	.cic-chooser {
		max-width: 900px;
		margin: 0 auto;
		padding: clamp(0.75rem, 3vw, 2rem) clamp(1.25rem, 4vw, 2.5rem);
		color: var(--color-fg);
		font-family: var(--font-body);
	}
	.hero {
		text-align: center;
		margin-bottom: clamp(2rem, 5vw, 3rem);
	}
	.hero-kicker {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 0.85rem;
	}
	.hero-title {
		font-family: var(--font-heading);
		font-size: clamp(2.2rem, 5.5vw, 3.4rem);
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

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
		gap: 1.25rem;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 1.5rem 1.5rem 1.75rem;
		border: 1px solid color-mix(in srgb, var(--color-fg) 14%, transparent);
		border-radius: 6px;
		text-decoration: none;
		color: var(--color-fg);
		background: var(--color-panel);
		transition:
			border-color 150ms ease,
			color 150ms ease,
			transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.card:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
		transform: translateY(-2px);
	}
	.card-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
		margin: 0 0 0.25rem;
	}
	.card-title {
		font-family: var(--font-heading);
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
		line-height: 1.2;
	}
	.card-sub {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.9rem;
		color: var(--color-subtle);
		margin: 0.25rem 0 0;
	}
	.card-date {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		color: var(--color-muted);
		font-variant-numeric: tabular-nums;
		margin: 0 0 0.35rem;
	}
	.card-lede {
		font-size: 0.92rem;
		line-height: 1.55;
		color: var(--color-fg);
		margin: 0.5rem 0 0;
	}
	.card-stats {
		display: flex;
		gap: 0.5rem;
		margin: 0.85rem 0 0;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-muted);
		font-variant-numeric: tabular-nums;
	}
	.card-cta {
		margin-top: auto;
		padding-top: 1rem;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--color-accent);
	}
	.card:hover .card-cta {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
