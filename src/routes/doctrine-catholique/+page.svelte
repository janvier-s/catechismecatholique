<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>La Doctrine Catholique · Abbé Boulenger (1927)</title>
	<meta
		name="description"
		content="La Doctrine catholique de l'Abbé Boulenger (Vitte, 1927) — 53 leçons en trois tomes : Le Dogme, La Morale, Les Moyens de Sanctification."
	/>
</svelte:head>

<main class="bl-index">
	<header class="hero">
		<p class="hero-kicker">Abbé A. Boulenger · 1927</p>
		<h1 class="hero-title">La Doctrine catholique</h1>
		<p class="hero-lede">
			Manuel de catéchisme en {data.structure.tomes.reduce((t, tm) => t + tm.lessons.length, 0)} leçons,
			réparti en trois tomes : Le Dogme, La Morale et Les Moyens de Sanctification.
		</p>
		<a class="hero-toc" href="/doctrine-catholique/sommaire">Sommaire complet →</a>
	</header>

	<div class="tomes">
		{#each data.structure.tomes as tome (tome.n)}
			{@const firstSlug = tome.lessons[0]?.slug}
			<section class="tome">
				<header class="tome-head">
					<span class="tome-kicker">Tome {tome.n}</span>
					{#if firstSlug}
						<h2 class="tome-title">
							<a class="tome-title-link" href="/doctrine-catholique/{firstSlug}">{tome.title}</a>
						</h2>
					{:else}
						<h2 class="tome-title">{tome.title}</h2>
					{/if}
					<span class="tome-count">{tome.lessons.length} leçons</span>
				</header>
				<ul class="lessons">
					{#each tome.lessons as lesson (lesson.slug)}
						<li>
							<a class="lesson-row" href="/doctrine-catholique/{lesson.slug}">
								<span class="lesson-num">{lesson.n}</span>
								<span class="lesson-title">{lesson.title}</span>
								<span class="lesson-arrow" aria-hidden="true">→</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
</main>

<style>
	.bl-index {
		max-width: 900px;
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 4rem) clamp(1.25rem, 4vw, 2.5rem);
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
		font-weight: 500;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--color-muted);
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
		max-width: 46ch;
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

	.tomes {
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.tome {
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		padding-top: 1.75rem;
	}
	.tome-head {
		margin-bottom: 1.25rem;
		display: flex;
		align-items: baseline;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.tome-kicker {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
		white-space: nowrap;
	}
	.tome-title {
		font-family: var(--font-heading);
		font-size: clamp(1.4rem, 3vw, 1.9rem);
		font-weight: 700;
		line-height: 1.2;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.tome-title-link {
		color: inherit;
		text-decoration: none;
		transition: color 140ms ease;
	}
	.tome-title-link:hover {
		color: var(--color-accent);
	}
	.tome-count {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-muted);
		white-space: nowrap;
		margin-left: auto;
	}

	.lessons {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.lesson-row {
		display: flex;
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
	.lesson-row:hover {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		color: var(--color-accent);
	}
	.lesson-num {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums lining-nums;
		color: var(--color-muted);
		min-width: 1.6rem;
		text-align: right;
	}
	.lesson-row:hover .lesson-num {
		color: color-mix(in srgb, var(--color-accent) 60%, var(--color-muted));
	}
	.lesson-title {
		flex: 1;
		font-family: var(--font-body);
		font-size: 0.95rem;
		line-height: 1.4;
	}
	.lesson-arrow {
		color: var(--color-muted);
		font-size: 0.85rem;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.lesson-row:hover .lesson-arrow {
		transform: translateX(3px);
		color: var(--color-accent);
	}
</style>
