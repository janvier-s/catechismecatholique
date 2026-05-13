<script lang="ts">
	import MetaTags from '$lib/components/ui/MetaTags.svelte';
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<MetaTags
	title="Dieu · Institut du Bon Pasteur"
	description="Cours sur Dieu en 13 chapitres : existence et nature de Dieu, la Trinité, la Création, le Rédempteur, Marie, l'Église et les fins dernières."
	image="/img/bibliotheque/ibp-dieu.webp"
/>

<main class="dieu-index">
	<header class="hero">
		<BreadcrumbRail
			crumbs={[
				{ href: '/bon-pasteur', title: 'Institut du Bon Pasteur' },
				{ href: '/bon-pasteur/dieu', title: 'Dieu' }
			]}
		/>
		<p class="hero-kicker">Institut du Bon Pasteur · Doctrine de la foi</p>
		<h1 class="hero-title">Dieu</h1>
		<p class="hero-lede">
			Treize chapitres de catéchèse sur Dieu, la Trinité, la Création, l'homme, le Rédempteur,
			Notre-Seigneur, la Rédemption, le Saint-Esprit, la Vierge Marie, l'Église, les fins dernières
			et la communion des saints.
		</p>
	</header>

	<ul class="chapters">
		{#each data.structure.chapters as ch (ch.slug)}
			<li>
				<a class="chapter-row" href="/bon-pasteur/dieu/{ch.slug}">
					<span class="chapter-num">{ch.n}</span>
					<span class="chapter-title">{ch.title}</span>
					<span class="chapter-arrow" aria-hidden="true">→</span>
				</a>
			</li>
		{/each}
	</ul>
</main>

<style>
	.dieu-index {
		max-width: 760px;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1.25rem, 4vw, 2.5rem) 6rem;
		color: var(--color-fg);
		font-family: var(--font-body);
	}

	.hero {
		margin-bottom: 3rem;
	}
	.hero-kicker {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 1.25rem 0 0.5rem;
	}
	.hero-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: clamp(2.2rem, 5vw, 3.5rem);
		font-weight: 700;
		line-height: 1.08;
		margin: 0 0 0.75rem;
	}
	.hero-lede {
		font-style: italic;
		font-size: 0.97rem;
		line-height: 1.65;
		color: var(--color-subtle);
		max-width: 58ch;
		margin: 0;
	}

	.chapters {
		list-style: none;
		padding: 0;
		margin: 0;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
	}

	.chapter-row {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		padding: 0.85rem 0;
		border-bottom: 1px solid color-mix(in srgb, var(--color-fg) 8%, transparent);
		text-decoration: none;
		color: var(--color-fg);
		transition: color 160ms ease;
	}
	.chapter-row:hover {
		color: var(--color-accent);
	}

	.chapter-num {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.1em;
		color: var(--color-accent);
		flex: 0 0 2rem;
		text-align: right;
	}

	.chapter-title {
		flex: 1;
		font-family: var(--font-heading);
		font-size: 1.12rem;
		font-weight: 600;
		line-height: 1.25;
	}
	.chapter-row:hover .chapter-title {
		color: var(--color-accent);
	}

	.chapter-arrow {
		font-family: var(--font-ui);
		font-size: 0.9rem;
		color: var(--color-muted);
		transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.chapter-row:hover .chapter-arrow {
		transform: translateX(4px);
		color: var(--color-accent);
	}
</style>
