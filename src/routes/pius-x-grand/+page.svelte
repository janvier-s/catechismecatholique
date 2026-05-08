<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Grand Catéchisme de saint Pie X · Catéchisme</title>
	<meta
		name="description"
		content="Le Grand Catéchisme de saint Pie X en 989 questions et réponses sur la foi catholique."
	/>
</svelte:head>

<main class="pius-index">
	<header class="hero">
		<p class="hero-kicker">Édition française</p>
		<h1 class="hero-title">Grand Catéchisme de saint Pie X</h1>
		<p class="hero-lede">
			Promulgué par Pie&nbsp;X en 1905, ce catéchisme présente la foi catholique en {data.structure.total_qa} questions
			et réponses destinées à l'instruction des fidèles.
		</p>
	</header>

	<section class="parts" aria-label="Les parties du Grand Catéchisme">
		{#each data.structure.parts as part (part.slug)}
			{@const firstChapter = part.chapters[0]}
			{#if firstChapter}
				<a class="part-card" href="/pius-x-grand/{part.slug}/{firstChapter.slug}">
					<span class="part-kicker">
						Q.&nbsp;{part.chapters[0]?.qa_range[0]}–{part.chapters[part.chapters.length - 1]?.qa_range[1]}
					</span>
					<h2 class="part-title">{part.title}</h2>
					{#if part.chapters.length > 1}
						<p class="part-chapters">{part.chapters.length} chapitres</p>
					{/if}
				</a>
			{/if}
		{/each}
	</section>
</main>

<style>
	.pius-index {
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
		line-height: 1.1;
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
		margin: 0 0 0.5rem;
		transition: color 150ms ease;
	}

	.part-chapters {
		font-family: var(--font-ui);
		font-size: 0.82rem;
		color: var(--color-subtle);
		margin: auto 0 0;
		padding-top: 0.5rem;
	}
</style>
