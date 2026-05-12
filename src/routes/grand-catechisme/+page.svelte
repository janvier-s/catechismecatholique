<script lang="ts">
	import MetaTags from '$lib/components/ui/MetaTags.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const LECON_PRELIM_SLUG = '0-lecon-preliminaire';

	const PART_LEDE: Record<string, string> = {
		'1-credo':
			"Les douze articles du Credo des Apôtres exposant les mystères fondamentaux de la foi : la Trinité, la création, l'Incarnation, la Rédemption et la vie éternelle.",
		'2-priere':
			"La nature et les conditions de la prière chrétienne, l'Oraison Dominicale, l'Ave Maria et l'invocation des saints.",
		'3-commandements':
			"Le Décalogue et les commandements de l'Église, expliqués un à un, suivis des péchés contre chaque commandement et des vices capitaux.",
		'4-sacrements':
			'Les sept sacrements institués par le Christ : leur institution, leur matière et leur forme, leurs effets et les dispositions requises pour les recevoir.',
		'5-principales':
			'Les vertus théologales et cardinales, la grâce sanctifiante, les péchés, les fins dernières (mort, jugement, enfer, paradis) et les principales prières.'
	};

	const leconPrelim = $derived(data.structure.parts.find((p) => p.slug === LECON_PRELIM_SLUG));
	const mainParts = $derived(data.structure.parts.filter((p) => p.slug !== LECON_PRELIM_SLUG));
</script>

<MetaTags
	title="Grand Catéchisme de saint Pie X"
	description={`Le Grand Catéchisme de saint Pie X en ${data.structure.total_qa} questions et réponses sur la foi catholique : le Credo, la prière, les commandements, les sacrements et les vertus.`}
	image="/img/bibliotheque/grand-catechisme.webp"
	schema={{
		kind: 'book',
		name: 'Catéchisme de la Doctrine Chrétienne (édition majeure)',
		author: 'Saint Pie X',
		datePublished: '1905',
		about: 'Catéchisme romain en questions et réponses'
	}}
/>

<main class="gc-index">
	<header class="hero">
		<p class="hero-kicker">Édition française · 1905</p>
		<h1 class="hero-title">
			Grand Catéchisme de<br />Saint Pie&nbsp;X
		</h1>
		<p class="hero-lede">
			Promulgué par Pie&nbsp;X en 1905, ce catéchisme présente la doctrine catholique en {data
				.structure.total_qa} questions et réponses à l'usage des fidèles.<br />
			Le Credo, la prière, les commandements, les sacrements et les vertus.
		</p>
	</header>

	{#if leconPrelim}
		{@const firstCh = leconPrelim.chapters[0]}
		{#if firstCh}
			<section class="prologue" aria-label="Leçon préliminaire">
				<a href="/grand-catechisme/{leconPrelim.slug}" class="prologue-link">
					<span class="prologue-kicker"
						>Leçon préliminaire · {firstCh.qa_range[0]}–{firstCh.qa_range[1]}</span
					>
					<span class="prologue-lede"
						>Ce qu'est la doctrine chrétienne, pourquoi tout chrétien doit la connaître et quelles
						en sont les parties principales.</span
					>
					<span class="prologue-arrow" aria-hidden="true">→</span>
				</a>
			</section>
		{/if}
	{/if}

	<section class="parts" aria-label="Les parties du Grand Catéchisme">
		{#each mainParts as part, i (part.slug)}
			{@const firstChapter = part.chapters[0]}
			{@const lastChapter = part.chapters[part.chapters.length - 1]}
			{#if firstChapter}
				<a class="part-card" class:part-card-wide={i === 4} href="/grand-catechisme/{part.slug}">
					<span class="part-kicker">
						{['Première', 'Deuxième', 'Troisième', 'Quatrième', 'Cinquième'][i] ??
							`Partie ${i + 1}`} partie · {firstChapter.qa_range[0]}–{lastChapter?.qa_range[1]}
					</span>
					<h2 class="part-title">{part.title}</h2>
					{#if PART_LEDE[part.slug]}
						<p class="part-lede">{PART_LEDE[part.slug]}</p>
					{/if}
				</a>
			{/if}
		{/each}
	</section>

	<nav class="quick-links" aria-label="Navigation complémentaire">
		<a href="/grand-catechisme/sommaire" class="quick-link">Sommaire complet</a>
	</nav>
</main>

<style>
	.gc-index {
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
		font-size: clamp(1.15rem, 4.5vw, 2.6rem);
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

	.prologue {
		max-width: 44rem;
		margin: 0 auto 2.5rem;
	}
	.prologue-link {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		padding: 0.85rem 0;
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
		text-decoration: none;
		color: inherit;
		transition: border-color 150ms ease;
	}
	.prologue-link:hover {
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}
	.prologue-kicker {
		flex: none;
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
	}
	.prologue-lede {
		flex: 1;
		font-family: var(--font-body);
		font-size: 0.95rem;
		font-style: italic;
		color: var(--color-subtle);
	}
	.prologue-arrow {
		flex: none;
		font-size: 1.05rem;
		color: var(--color-muted);
		transition:
			transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
			color 150ms ease;
	}
	.prologue-link:hover .prologue-arrow {
		color: var(--color-accent);
		transform: translateX(3px);
	}

	.parts {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.5rem;
		margin-bottom: 3rem;
	}
	@media (max-width: 720px) {
		.parts {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}

	.part-card {
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
	.part-card:hover {
		border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
	}
	.part-card:hover .part-title {
		color: var(--color-accent);
	}
	.part-card-wide {
		grid-column: span 2;
	}
	@media (max-width: 720px) {
		.part-card-wide {
			grid-column: span 1;
		}
	}
	.part-kicker {
		display: block;
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin-bottom: 0.4rem;
	}
	.part-title {
		font-family: var(--font-heading);
		font-size: 1.4rem;
		font-weight: 600;
		line-height: 1.25;
		color: var(--color-fg);
		margin: 0 0 0.85rem;
		transition: color 150ms ease;
	}
	.part-lede {
		font-family: var(--font-body);
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--color-subtle);
		margin: 0;
	}

	.quick-links {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.6rem;
		padding-top: 1.5rem;
		border-top: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
	}
	.quick-link {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-decoration: none;
		transition: color 150ms ease;
	}
	.quick-link:hover {
		color: var(--color-accent);
	}

	@media (max-width: 640px) {
		.prologue-link {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
			padding: 0.85rem 0.25rem;
		}
		.prologue-arrow {
			align-self: flex-end;
		}
	}
</style>
