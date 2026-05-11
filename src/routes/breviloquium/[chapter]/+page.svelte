<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { frenchPunct } from '$lib/utils/typography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const chapter = $derived(data.chapter);

	const partLabel = $derived.by(() => {
		if (chapter.partKind === 'partie') return `Partie ${chapter.partRoman}`;
		if (chapter.partKind === 'prologue') return 'Préambule';
		return 'Épilogue';
	});
</script>

<svelte:head>
	<title>{chapter.label} — {chapter.title} · Breviloquium</title>
	<meta
		name="description"
		content={`${chapter.label} — ${chapter.title}. ${chapter.partTitle}. Breviloquium de saint Bonaventure (1257).`}
	/>
</svelte:head>

<main class="brev-reader">
	<header class="head">
		<BreadcrumbRail
			crumbs={[
				{ href: '/breviloquium', title: 'Breviloquium' },
				{
					href: `/breviloquium#${chapter.partSlug}`,
					kicker: partLabel,
					title: chapter.partTitle
				},
				{
					href: `/breviloquium/${chapter.slug}`,
					kicker: chapter.label,
					title: chapter.title
				}
			]}
		/>
		<p class="kicker">
			{partLabel} · {chapter.partTitle} · {chapter.label}
		</p>
		<h1 class="title">{frenchPunct(chapter.title)}</h1>
	</header>

	<article class="body reader-prose">
		{#each chapter.blocks as block, i (i)}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<p class="para">{@html frenchPunct(block.html)}</p>
		{/each}
	</article>

	<nav class="pager" aria-label="Navigation">
		{#if chapter.prev}
			<NavCard
				href={`/breviloquium/${chapter.prev.slug}`}
				eyebrow={chapter.prev.label}
				title={chapter.prev.title}
				direction="prev"
			/>
		{:else}
			<span></span>
		{/if}
		{#if chapter.next}
			<NavCard
				href={`/breviloquium/${chapter.next.slug}`}
				eyebrow={chapter.next.label}
				title={chapter.next.title}
				direction="next"
			/>
		{:else}
			<span></span>
		{/if}
	</nav>
</main>

<style>
	.brev-reader {
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
		font-size: clamp(1.7rem, 4vw, 2.4rem);
		font-weight: 700;
		line-height: 1.15;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.body {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.7);
	}
	.para {
		margin: 0 0 1rem;
		text-align: justify;
		hyphens: auto;
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
