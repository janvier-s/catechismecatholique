<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { frenchPunct } from '$lib/utils/typography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const section = $derived(data.section);
</script>

<svelte:head>
	<title>{section.title} · Catéchisme pour Adultes</title>
	<meta
		name="description"
		content={`Section ${section.ordinal} — ${section.title}. Catéchisme pour Adultes des Évêques de France (1991).`}
	/>
</svelte:head>

<main class="cpa-reader" use:scrollSpy>
	<header class="head">
		<BreadcrumbRail
			crumbs={[
				{ href: '/catechisme-adultes', title: 'Catéchisme pour Adultes' },
				{
					href: `/catechisme-adultes/${section.slug}`,
					kicker: `Section ${section.ordinal}`,
					title: section.title
				}
			]}
		/>
		<p class="kicker">
			Section {section.ordinal}
			{#if section.paraRange}
				· {section.paraRange[0] === section.paraRange[1]
					? section.paraRange[0]
					: `${section.paraRange[0]}–${section.paraRange[1]}`}
			{/if}
		</p>
		<h1 class="title">{frenchPunct(section.title)}</h1>
	</header>

	<article class="body reader-prose">
		{#each section.chapters as ch (ch.slug)}
			<section class="chapter" id={ch.slug}>
				<h2 class="chapter-h">{frenchPunct(ch.title)}</h2>
				{#each ch.blocks as block, i (i)}
					<p class="para">
						{#if block.n}
							<span class="para-num" id={`p-${block.n}`}>{block.n}</span>
						{/if}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->{@html frenchPunct(block.html)}
					</p>
				{/each}
			</section>
		{/each}
	</article>

	<nav class="pager" aria-label="Navigation">
		{#if section.prev}
			<NavCard
				href={`/catechisme-adultes/${section.prev.slug}`}
				eyebrow={`Section ${section.ordinal - 1}`}
				title={section.prev.title}
				direction="prev"
			/>
		{:else}
			<span></span>
		{/if}
		{#if section.next}
			<NavCard
				href={`/catechisme-adultes/${section.next.slug}`}
				eyebrow={`Section ${section.ordinal + 1}`}
				title={section.next.title}
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
		margin-bottom: 2rem;
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
		font-size: clamp(1.9rem, 4.5vw, 2.7rem);
		font-weight: 700;
		line-height: 1.15;
		margin: 0;
		text-wrap: balance;
	}
	.body {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.7);
	}
	.chapter {
		scroll-margin-top: 80px;
	}
	.chapter + .chapter {
		margin-top: 2.5rem;
	}
	.chapter-h {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 1.45rem;
		font-weight: 700;
		color: var(--color-heading, var(--color-fg));
		margin: 1rem 0 1.25rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
		text-wrap: balance;
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
