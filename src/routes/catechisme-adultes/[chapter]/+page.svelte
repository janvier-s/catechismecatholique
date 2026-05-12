<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { frenchPunct } from '$lib/utils/typography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const chapter = $derived(data.chapter);
</script>

<svelte:head>
	<title>{chapter.title} · Catéchisme pour Adultes</title>
	<meta
		name="description"
		content={`Chapitre ${chapter.ordinal} — ${chapter.title}. Catéchisme pour Adultes des Évêques de France (1991).`}
	/>
</svelte:head>

<main class="cpa-reader">
	<header class="head">
		<BreadcrumbRail
			crumbs={[
				{ href: '/catechisme-adultes', title: 'Catéchisme pour Adultes' },
				{
					href: `/catechisme-adultes#${chapter.sectionSlug}`,
					title: chapter.sectionTitle
				},
				{
					href: `/catechisme-adultes/${chapter.slug}`,
					kicker: `Chapitre ${chapter.ordinal}`,
					title: chapter.title
				}
			]}
		/>
		<p class="kicker">
			{chapter.sectionTitle} · Chapitre {chapter.ordinal} · §
			{#if chapter.paraRange[0] === chapter.paraRange[1]}
				{chapter.paraRange[0]}
			{:else}
				{chapter.paraRange[0]}–{chapter.paraRange[1]}
			{/if}
		</p>
		<h1 class="title">{frenchPunct(chapter.title)}</h1>
	</header>

	<article class="body reader-prose">
		{#each chapter.blocks as block, i (i)}
			<p class="para">
				{#if block.n}
					<span class="para-num" id={`p-${block.n}`}>{block.n}</span>
				{/if}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->{@html frenchPunct(block.html)}
			</p>
		{/each}
	</article>

	<nav class="pager" aria-label="Navigation">
		{#if chapter.prev}
			<NavCard
				href={`/catechisme-adultes/${chapter.prev.slug}`}
				eyebrow={`Chapitre ${chapter.ordinal - 1}`}
				title={chapter.prev.title}
				direction="prev"
			/>
		{:else}
			<span></span>
		{/if}
		{#if chapter.next}
			<NavCard
				href={`/catechisme-adultes/${chapter.next.slug}`}
				eyebrow={`Chapitre ${chapter.ordinal + 1}`}
				title={chapter.next.title}
				direction="next"
			/>
		{:else}
			<span></span>
		{/if}
	</nav>
</main>

<style>
	.cpa-reader {
		max-width: 720px;
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
		font-size: clamp(1.7rem, 4vw, 2.4rem);
		font-weight: 700;
		line-height: 1.15;
		margin: 0;
		text-wrap: balance;
	}
	.body {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.7);
	}
	.para {
		margin: 0 0 1rem;
		scroll-margin-top: 80px;
	}
	.para-num {
		display: inline-block;
		font-family: var(--font-ui);
		font-size: 0.78em;
		font-weight: 700;
		color: var(--color-accent);
		margin-right: 0.45em;
		font-variant-numeric: tabular-nums;
		scroll-margin-top: 80px;
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
