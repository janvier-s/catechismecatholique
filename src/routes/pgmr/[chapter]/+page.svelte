<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { frenchPunct } from '$lib/utils/typography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const chapter = $derived(data.chapter);

	function renderHtml(html: string): string {
		return frenchPunct(html);
	}
</script>

<svelte:head>
	<title>{chapter.title} · Présentation Générale du Missel Romain</title>
	<meta
		name="description"
		content={`${chapter.n !== null ? `Chapitre ${chapter.n}` : 'Préambule'} — ${chapter.title}. Présentation Générale du Missel Romain (2002).`}
	/>
</svelte:head>

<main class="pg-reader">
	<header class="head">
		<BreadcrumbRail
			crumbs={[
				{ href: '/pgmr', title: 'PGMR' },
				{
					href: `/pgmr/${chapter.slug}`,
					kicker: chapter.n !== null ? `Chapitre ${chapter.n}` : 'Préambule',
					title: chapter.title
				}
			]}
		/>
		<p class="kicker">{chapter.n !== null ? `Chapitre ${chapter.n}` : 'Préambule'}</p>
		<h1 class="title">{frenchPunct(chapter.title)}</h1>
	</header>

	<article class="body reader-prose">
		{#each chapter.blocks as block, i (i)}
			{#if block.kind === 'heading'}
				<h2 class="section-heading" id={block.anchor}>{frenchPunct(block.title)}</h2>
			{:else}
				<div class="paragraph" id="p{block.n}">
					<a class="paragraph-num" href={`/pgmr/p/${block.n}`} aria-label={`Paragraphe ${block.n}`}>
						{block.n}
					</a>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					<div class="paragraph-body">{@html renderHtml(block.html)}</div>
				</div>
			{/if}
		{/each}
	</article>

	{#if chapter.footnotes.length > 0}
		<section class="footnotes" aria-label="Notes">
			<h2 class="footnotes-head">Notes</h2>
			<ol class="footnotes-list">
				{#each chapter.footnotes as fn (fn.n)}
					<li id="fn-{fn.n}" value={fn.n}>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<div class="footnote-body">{@html fn.html}</div>
					</li>
				{/each}
			</ol>
		</section>
	{/if}

	<nav class="pager" aria-label="Navigation">
		{#if data.prev}
			<NavCard
				href={`/pgmr/${data.prev.slug}`}
				eyebrow={data.prev.n !== null ? `Chapitre ${data.prev.n}` : 'Préambule'}
				title={data.prev.title}
				direction="prev"
			/>
		{:else}
			<span></span>
		{/if}
		{#if data.next}
			<NavCard
				href={`/pgmr/${data.next.slug}`}
				eyebrow={data.next.n !== null ? `Chapitre ${data.next.n}` : 'Préambule'}
				title={data.next.title}
				direction="next"
			/>
		{:else}
			<span></span>
		{/if}
	</nav>
</main>

<style>
	.pg-reader {
		max-width: 760px;
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
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 1.25rem 0 0.5rem;
	}
	.title {
		font-family: var(--font-heading);
		font-size: clamp(1.7rem, 4vw, 2.6rem);
		font-weight: 700;
		line-height: 1.15;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.body {
		font-size: 1rem;
		line-height: 1.75;
	}
	.section-heading {
		font-family: var(--font-heading);
		font-size: 1.4rem;
		font-weight: 700;
		line-height: 1.25;
		margin: 2.5rem 0 1rem;
		color: var(--color-heading, var(--color-fg));
		scroll-margin-top: 80px;
	}
	.paragraph {
		display: grid;
		grid-template-columns: 3rem 1fr;
		gap: 0.5rem;
		margin: 1.25rem 0;
		scroll-margin-top: 80px;
	}
	.paragraph-num {
		font-family: var(--font-ui);
		font-size: 0.85rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
		text-align: right;
		padding-top: 0.25rem;
		text-decoration: none;
	}
	.paragraph-num:hover {
		color: var(--color-accent);
	}
	.paragraph-body :global(p) {
		margin: 0;
	}
	.paragraph-body :global(em),
	.paragraph-body :global(i) {
		font-style: italic;
	}
	.paragraph-body :global(.pgmr-fn-ref) {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-accent);
		vertical-align: super;
		line-height: 0;
		margin: 0 0.15em;
	}
	.footnotes {
		margin-top: 4rem;
		padding-top: 1.5rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 14%, transparent);
		font-family: var(--font-ui);
		font-size: 0.85rem;
		line-height: 1.55;
		color: var(--color-subtle);
	}
	.footnotes-head {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 1rem;
	}
	.footnotes-list {
		padding-left: 2rem;
		margin: 0;
	}
	.footnotes-list li {
		margin-bottom: 0.5rem;
	}
	.footnote-body :global(p) {
		margin: 0;
		display: inline;
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
