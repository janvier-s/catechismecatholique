<script lang="ts">
	import type { PageData } from './$types';
	import { frenchPunct } from '$lib/utils/typography';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Catéchisme illustré des vérités nécessaires · Catéchisme</title>
	<meta
		name="description"
		content="Catéchisme illustré des vérités nécessaires, par A.&nbsp;L.&nbsp;R. (Wikisource) — 12 images, 12 leçons : la foi catholique enseignée par l'image et la parole."
	/>
</svelte:head>

<main class="ci-index">
	<header class="hero">
		<p class="hero-kicker">{data.structure.author} · {data.structure.year}</p>
		<h1 class="hero-title">
			Catéchisme illustré<br />des vérités nécessaires
		</h1>
		<p class="hero-lede">
			{data.structure.subtitle}. La foi catholique enseignée par l'image et la parole, dans la
			simplicité d'un manuel d'instruction populaire de la fin du XIX<sup>e</sup>&nbsp;siècle.
		</p>
		<a class="hero-toc" href="/catechisme-illustre/sommaire">Sommaire complet →</a>
	</header>

	{#if data.structure.front_matter.length > 0}
		<section class="front" aria-label="Préface et introduction">
			{#each data.structure.front_matter as page (page.slug)}
				<a class="flat-card" href="/catechisme-illustre/{page.slug}">
					<span class="flat-kicker">Avant-propos</span>
					<span class="flat-title">{page.title}</span>
					<span class="flat-arrow" aria-hidden="true">→</span>
				</a>
			{/each}
		</section>
	{/if}

	<section class="grid" aria-label="Les douze leçons">
		{#each data.structure.chapters as ch (ch.slug)}
			<a class="card" href="/catechisme-illustre/{ch.slug}">
				{#if ch.image_url}
					<div class="card-image">
						<img src={ch.image_url} alt={ch.title} loading="lazy" />
					</div>
				{/if}
				<div class="card-body">
					<span class="card-kicker">Leçon {ch.roman}</span>
					<h2 class="card-title">{ch.title}</h2>
					{#if ch.subtitle}
						<p class="card-subtitle">{frenchPunct(ch.subtitle)}</p>
					{/if}
				</div>
			</a>
		{/each}
	</section>

	{#if data.structure.back_matter.length > 0}
		<section class="back" aria-label="Annexes">
			{#each data.structure.back_matter as page (page.slug)}
				<a class="flat-card" href="/catechisme-illustre/{page.slug}">
					<span class="flat-kicker">Annexe</span>
					<span class="flat-title">{page.title}</span>
					<span class="flat-arrow" aria-hidden="true">→</span>
				</a>
			{/each}
		</section>
	{/if}
</main>

<style>
	.ci-index {
		max-width: 1100px;
		margin: 0 auto;
		padding: clamp(0.75rem, 3vw, 2rem) clamp(1.25rem, 4vw, 2.5rem);
		color: var(--color-fg);
		font-family: var(--font-body);
	}

	.hero {
		text-align: center;
		margin-bottom: clamp(2.5rem, 5vw, 4rem);
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
		font-size: clamp(2.4rem, 6vw, 4rem);
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: -0.01em;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.hero-lede {
		max-width: 44ch;
		margin: 1.25rem auto 0;
		font-style: italic;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--color-subtle);
	}
	.hero-toc {
		display: inline-block;
		margin-top: 1.5rem;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
		text-decoration: none;
	}
	.hero-toc:hover {
		text-decoration: underline;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1.5rem;
	}

	.card {
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: inherit;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		overflow: hidden;
		transition:
			transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
			border-color 150ms ease,
			box-shadow 150ms ease;
	}
	.card:hover {
		transform: translateY(-2px);
		border-color: color-mix(in srgb, var(--color-accent) 50%, var(--color-border));
		box-shadow: 0 4px 14px color-mix(in srgb, var(--color-fg) 8%, transparent);
	}
	.card-image {
		aspect-ratio: 3 / 4;
		overflow: hidden;
		background: color-mix(in srgb, var(--color-fg) 4%, transparent);
	}
	.card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform 400ms ease;
	}
	.card:hover .card-image img {
		transform: scale(1.03);
	}
	.card-body {
		padding: 1rem 1.1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.card-kicker {
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
	}
	.card-title {
		font-family: var(--font-heading);
		font-size: 1.15rem;
		font-weight: 600;
		line-height: 1.3;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.card-subtitle {
		font-family: var(--font-body);
		font-size: 0.85rem;
		font-style: italic;
		line-height: 1.5;
		color: var(--color-subtle);
		margin: 0.15rem 0 0;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.front,
	.back {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin: 1.5rem 0;
	}
	.flat-card {
		flex: 1 1 240px;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		text-decoration: none;
		color: inherit;
		padding: 1rem 1.25rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-panel);
		transition: border-color 150ms ease;
		position: relative;
	}
	.flat-card:hover {
		border-color: color-mix(in srgb, var(--color-accent) 50%, var(--color-border));
	}
	.flat-kicker {
		font-family: var(--font-ui);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.flat-title {
		font-family: var(--font-heading);
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--color-heading, var(--color-fg));
	}
	.flat-arrow {
		position: absolute;
		right: 1rem;
		bottom: 0.85rem;
		color: var(--color-accent);
		font-size: 0.95rem;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.flat-card:hover .flat-arrow {
		transform: translateX(4px);
	}
</style>
