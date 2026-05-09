<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const PART_LEDE: Record<string, string> = {
		'0-intro':
			"Vingt-sept questions fondamentales sur l'existence de Dieu, la Trinité, l'Incarnation et les moyens du salut.",
		'1-credo':
			"Les grandes vérités de la foi catholique : la Trinité, la création, l'Incarnation, la Rédemption, l'Église et les fins dernières.",
		'2-morale':
			"Les commandements de Dieu et de l'Église, et les vertus nécessaires à la vie chrétienne.",
		'3-moyens-grace':
			'Les sept sacrements institués par le Christ et la prière, moyens ordinaires de la grâce sanctifiante.'
	};

	const ORDINALS = ['Première', 'Deuxième', 'Troisième'];
</script>

<svelte:head>
	<title>Petit Catéchisme de saint Pie X · Catéchisme</title>
	<meta
		name="description"
		content="Le Catéchisme de la Doctrine Chrétienne de saint Pie X (1912) en {data.structure
			.total_qa} questions et réponses : les vérités fondamentales de la foi catholique à l'usage de toute la jeunesse chrétienne."
	/>
</svelte:head>

<main class="pc-index">
	<header class="hero">
		<p class="hero-kicker">Édition française · 1912</p>
		<h1 class="hero-title">
			Petit Catéchisme de<br />Saint Pie&nbsp;X
		</h1>
		<p class="hero-lede">
			Catéchisme de la Doctrine Chrétienne, promulgué par Pie&nbsp;X en 1912. La foi catholique en {data
				.structure.total_qa} questions et réponses, à l'usage de toute la jeunesse chrétienne.<br />
			Les vérités fondamentales, la morale, les sacrements et la prière.
		</p>
	</header>

	<section class="intro-card-wrap" aria-label="Introduction">
		<a class="intro-card" href="/petit-catechisme/{data.structure.intro.part_slug}">
			<span class="intro-kicker"
				>Introduction · {data.structure.intro.qa_range[0]}–{data.structure.intro.qa_range[1]}</span
			>
			<span class="intro-title">{data.structure.intro.title}</span>
			<span class="intro-lede">{PART_LEDE['0-intro']}</span>
			<span class="intro-arrow" aria-hidden="true">→</span>
		</a>
	</section>

	<section class="parts" aria-label="Les parties du Petit Catéchisme">
		{#each data.structure.parts as part, i (part.slug)}
			<a class="part-card" href="/petit-catechisme/{part.slug}">
				<span class="part-kicker">
					{ORDINALS[i] ?? `Partie ${i + 1}`} partie · {part.qa_range[0]}–{part.qa_range[1]}
				</span>
				<h2 class="part-title">{part.title}</h2>
				{#if part.subtitle}
					<p class="part-subtitle">{part.subtitle}</p>
				{/if}
				{#if PART_LEDE[part.slug]}
					<p class="part-lede">{PART_LEDE[part.slug]}</p>
				{/if}
			</a>
		{/each}
	</section>

	<nav class="quick-links" aria-label="Navigation complémentaire">
		<a href="/petit-catechisme/sommaire" class="quick-link">Sommaire complet</a>
	</nav>
</main>

<style>
	.pc-index {
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

	.intro-card-wrap {
		max-width: 44rem;
		margin: 0 auto 2.5rem;
	}
	.intro-card {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		padding: 0.85rem 0;
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
		text-decoration: none;
		color: inherit;
		transition: border-color 150ms ease;
		flex-wrap: wrap;
	}
	.intro-card:hover {
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}
	.intro-kicker {
		flex: none;
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
	}
	.intro-title {
		flex: 0 0 auto;
		font-family: var(--font-body);
		font-size: 0.97rem;
		font-weight: 600;
		color: var(--color-fg);
	}
	.intro-lede {
		flex: 1 1 60%;
		font-family: var(--font-body);
		font-size: 0.95rem;
		font-style: italic;
		color: var(--color-subtle);
	}
	.intro-arrow {
		flex: none;
		font-size: 1.05rem;
		color: var(--color-muted);
		transition:
			transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
			color 150ms ease;
	}
	.intro-card:hover .intro-arrow {
		color: var(--color-accent);
		transform: translateX(3px);
	}

	.parts {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
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
		margin: 0 0 0.4rem;
		transition: color 150ms ease;
	}
	.part-subtitle {
		font-family: var(--font-body);
		font-size: 0.82rem;
		font-style: italic;
		color: var(--color-muted);
		margin: 0 0 0.6rem;
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
		.intro-card {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
			padding: 0.85rem 0.25rem;
		}
		.intro-arrow {
			align-self: flex-end;
		}
	}
</style>
