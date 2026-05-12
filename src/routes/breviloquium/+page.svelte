<script lang="ts">
	import { frenchPunct } from '$lib/utils/typography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const firstChapter = $derived(data.structure.parts[0]?.chapters[0]?.slug ?? '');
</script>

<svelte:head>
	<title>Breviloquium · Saint Bonaventure (1257)</title>
	<meta
		name="description"
		content="Le Breviloquium de saint Bonaventure (1257), somme de théologie en sept parties, traduite en français, présentée chapitre par chapitre."
	/>
</svelte:head>

<main class="brev-index">
	<a class="back" href="/bibliotheque#shelf-II">
		<span class="back-arrow" aria-hidden="true">←</span>
		Retour à la Bibliothèque
	</a>
	<header class="hero">
		<p class="hero-kicker">Saint Bonaventure · 1257</p>
		<h1 class="hero-title">Breviloquium</h1>
		<p class="hero-sub">Somme abrégée de la théologie chrétienne</p>
		<p class="hero-lede">
			Achevé vers l'an 1257, le <em>Breviloquium</em> de saint Bonaventure offre, en sept parties,
			une vue d'ensemble de la foi catholique : de la Trinité jusqu'aux fins dernières, en passant
			par la création, le péché, l'Incarnation, la grâce et les sacrements.
		</p>
		{#if firstChapter}
			<p class="hero-cta">
				<a class="cta-link" href={`/breviloquium/${firstChapter}`}>Commencer la lecture →</a>
			</p>
		{/if}
	</header>

	<nav class="parts" aria-label="Parties">
		{#each data.structure.parts as part (part.slug)}
			<section class="part" id={part.slug}>
				<header class="part-head">
					<p class="part-kicker">
						{#if part.kind === 'partie'}
							Partie {part.roman}
						{:else if part.kind === 'prologue'}
							Préambule
						{:else}
							Épilogue
						{/if}
					</p>
					<h2 class="part-title">{frenchPunct(part.title)}</h2>
				</header>
				<ol class="chapters">
					{#each part.chapters as ch (ch.slug)}
						<li>
							<a class="chapter-row" href={`/breviloquium/${ch.slug}`}>
								<span class="chapter-label">{ch.label}</span>
								<span class="chapter-title">{frenchPunct(ch.title)}</span>
								<span class="chapter-arrow" aria-hidden="true">→</span>
							</a>
						</li>
					{/each}
				</ol>
			</section>
		{/each}
	</nav>
</main>

<style>
	.brev-index {
		max-width: 760px;
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 4rem) clamp(1.25rem, 4vw, 2.5rem);
		color: var(--color-fg);
		font-family: var(--font-body);
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 1.5rem;
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-accent);
		text-decoration: none;
		transition: color 140ms ease;
	}
	.back-arrow {
		display: inline-block;
		line-height: 1;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.back:hover .back-arrow {
		transform: translateX(-4px);
	}

	.hero {
		text-align: center;
		margin-bottom: clamp(2.5rem, 6vw, 4rem);
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
		font-style: italic;
		font-size: clamp(2.2rem, 5.5vw, 3.4rem);
		font-weight: 700;
		line-height: 1.1;
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
	.cta-link:hover {
		color: var(--color-accent-text, var(--color-accent));
	}

	.part {
		margin-top: 2.5rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		padding-top: 1.5rem;
		scroll-margin-top: 80px;
	}
	.part-head {
		margin-bottom: 1rem;
	}
	.part-kicker {
		font-family: var(--font-ui);
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
		margin: 0 0 0.25rem;
	}
	.part-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 1.4rem;
		font-weight: 700;
		margin: 0;
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
		grid-template-columns: 5.5rem 1fr auto;
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
	.chapter-label {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
	}
	.chapter-title {
		font-family: var(--font-body);
		font-size: 0.98rem;
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
