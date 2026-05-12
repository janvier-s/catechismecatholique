<script lang="ts">
	import type { PageData } from './$types';
	import { frenchPunct } from '$lib/utils/typography';

	let { data }: { data: PageData } = $props();

	const META: Record<
		'1983' | '1917',
		{ kicker: string; title: string; subtitle: string; lede: string }
	> = {
		'1983': {
			kicker: 'Codex Iuris Canonici · 1983',
			title: 'Code de Droit Canonique',
			subtitle: 'Promulgué par saint Jean-Paul II le 25 janvier 1983',
			lede: "Le code en vigueur dans l'Église latine · 1752 canons répartis en sept livres, fruit de la révision voulue par le concile Vatican II."
		},
		'1917': {
			kicker: 'Codex Iuris Canonici · 1917',
			title: 'Code Pio-Benedictin',
			subtitle: 'Promulgué par Benoît XV le 27 mai 1917',
			lede: "Premier code unifié du droit de l'Église latine · 2414 canons répartis en cinq livres, en vigueur jusqu'en 1983."
		}
	};

	const meta = $derived(META[data.code]);
	const totalCanons = $derived(data.livres.reduce((s, l) => s + l.totalCanons, 0));
</script>

<svelte:head>
	<title>{meta.title} ({data.code})</title>
	<meta
		name="description"
		content={`${meta.subtitle}. ${totalCanons} canons en ${data.livres.length} livres.`}
	/>
</svelte:head>

<main class="cic-index">
	<header class="hero">
		<p class="hero-kicker">{meta.kicker}</p>
		<h1 class="hero-title">{meta.title}</h1>
		<p class="hero-sub">{meta.subtitle}</p>
		<p class="hero-lede">{meta.lede}</p>
		<p class="hero-stats">
			<span>{data.livres.length} livres</span>
			<span aria-hidden="true">·</span>
			<span>{totalCanons.toString()} canons</span>
		</p>
	</header>

	<ul class="livres">
		{#each data.livres as livre (livre.slug)}
			<li>
				<a class="livre-row" href={`/cic/${data.code}/${livre.slug}`}>
					<span class="livre-num">Livre {livre.n}</span>
					<span class="livre-title">{frenchPunct(livre.title)}</span>
					<span class="livre-range">
						{livre.canonRange[0]}–{livre.canonRange[1]}
					</span>
					<span class="livre-arrow" aria-hidden="true">→</span>
				</a>
			</li>
		{/each}
	</ul>

	<nav class="other-code" aria-label="Autre code">
		{#if data.code === '1983'}
			<a href="/cic/1917">
				<span class="other-kicker">Code antérieur</span>
				<span class="other-title">Code Pio-Benedictin (1917)</span>
			</a>
		{:else}
			<a href="/cic/1983">
				<span class="other-kicker">Code actuel</span>
				<span class="other-title">Code de Droit Canonique (1983)</span>
			</a>
		{/if}
	</nav>
</main>

<style>
	.cic-index {
		max-width: 760px;
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 4rem) clamp(1.25rem, 4vw, 2.5rem);
		color: var(--color-fg);
		font-family: var(--font-body);
	}
	.hero {
		text-align: center;
		margin-bottom: clamp(2rem, 5vw, 3.5rem);
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
		font-size: clamp(2.2rem, 5.5vw, 3.4rem);
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.01em;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
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
		color: var(--color-fg);
	}
	.hero-stats {
		display: inline-flex;
		gap: 0.65rem;
		margin: 1.25rem 0 0;
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-muted);
		font-variant-numeric: tabular-nums;
	}

	.livres {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		padding-top: 1rem;
	}
	.livre-row {
		display: grid;
		grid-template-columns: 5.5rem 1fr auto auto;
		gap: 0.85rem;
		align-items: baseline;
		padding: 0.7rem 0.85rem;
		text-decoration: none;
		color: var(--color-fg);
		border-radius: 4px;
		transition:
			background-color 120ms ease,
			color 120ms ease;
	}
	.livre-row:hover {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		color: var(--color-accent);
	}
	.livre-num {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-accent);
	}
	.livre-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 600;
		font-size: 1.05rem;
	}
	.livre-range {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
	}
	.livre-arrow {
		color: var(--color-muted);
		font-size: 0.85rem;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.livre-row:hover .livre-arrow {
		transform: translateX(3px);
		color: var(--color-accent);
	}

	.other-code {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		text-align: center;
	}
	.other-code a {
		display: inline-flex;
		flex-direction: column;
		gap: 0.25rem;
		text-decoration: none;
		color: var(--color-fg);
		padding: 0.6rem 1rem;
		border-radius: 4px;
		transition: color 120ms ease;
	}
	.other-code a:hover {
		color: var(--color-accent);
	}
	.other-kicker {
		font-family: var(--font-ui);
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.other-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 1rem;
		font-weight: 600;
	}
</style>
