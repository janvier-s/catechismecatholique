<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { frenchPunct } from '$lib/utils/typography';
	import type { PatChapter, PatStructure } from '$lib/data/types';

	let {
		structure,
		chapter
	}: {
		structure: PatStructure;
		chapter: PatChapter;
	} = $props();

	const work = $derived(structure.slug);
</script>

<svelte:head>
	<title>{chapter.label} · {structure.title}</title>
	<meta
		name="description"
		content={`${chapter.label} — ${structure.title}, ${structure.author}.`}
	/>
</svelte:head>

<main class="pat-reader">
	<header class="head">
		<BreadcrumbRail
			crumbs={[
				{ href: `/${work}`, title: structure.title },
				{
					href: `/${work}/${chapter.slug}`,
					title: chapter.label
				}
			]}
		/>
		<p class="kicker">{structure.author} · {chapter.label}</p>
		<h1 class="title">{frenchPunct(structure.title)}</h1>
	</header>

	<article class="body reader-prose">
		<p class="chapter-marker" aria-label="Numéro de chapitre">
			<span class="chapter-roman">{chapter.roman}</span>
		</p>
		{#each chapter.blocks as block, i (i)}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<p class="para">{@html frenchPunct(block.html)}</p>
		{/each}
	</article>

	<nav class="pager" aria-label="Navigation">
		{#if chapter.prev}
			<NavCard
				href={`/${work}/${chapter.prev.slug}`}
				eyebrow={chapter.prev.label}
				title={structure.title}
				direction="prev"
			/>
		{:else}
			<span></span>
		{/if}
		{#if chapter.next}
			<NavCard
				href={`/${work}/${chapter.next.slug}`}
				eyebrow={chapter.next.label}
				title={structure.title}
				direction="next"
			/>
		{:else}
			<span></span>
		{/if}
	</nav>
</main>

<style>
	.pat-reader {
		max-width: 680px;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1.25rem, 4vw, 2.5rem);
		color: var(--color-fg);
		font-family: var(--font-body);
	}
	.head {
		margin-bottom: 1.5rem;
	}
	.kicker {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
		margin: 1.25rem 0 0.5rem;
	}
	.title {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: clamp(1.7rem, 4vw, 2.3rem);
		font-weight: 700;
		line-height: 1.15;
		margin: 0;
	}
	.body {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.7);
	}
	.chapter-marker {
		text-align: center;
		margin: 2rem 0 1.25rem;
	}
	.chapter-roman {
		display: inline-block;
		font-family: var(--font-heading);
		font-size: 1.75rem;
		font-weight: 700;
		font-style: italic;
		color: var(--color-accent);
		padding: 0 0.85rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 50%, transparent);
	}
	.para {
		margin: 0 0 1rem;
		text-align: justify;
		hyphens: auto;
	}
	/* Hemmer/Méridier verse markers (`[N]` in the source) — small accent
	   superscripts that don't break the line height. `:global` because the
	   class is set inside `{@html …}` content and would otherwise be
	   tree-shaken away. */
	.para :global(sup.verse-num) {
		display: inline-block;
		font-family: var(--font-ui);
		font-size: 0.62em;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-accent);
		margin-right: 0.25em;
		vertical-align: 0.45em;
		line-height: 1;
	}
	.pager {
		display: flex;
		gap: 1rem;
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 14%, transparent);
	}
	.pager > * {
		flex: 1;
		min-width: 0;
	}
</style>
