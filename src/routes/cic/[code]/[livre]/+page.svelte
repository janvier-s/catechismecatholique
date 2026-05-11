<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { frenchPunct } from '$lib/utils/typography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const livre = $derived(data.livre);

	function renderHtml(html: string): string {
		return frenchPunct(html);
	}
</script>

<svelte:head>
	<title>Livre {livre.n} · {livre.title} · Code de Droit Canonique {livre.code}</title>
	<meta
		name="description"
		content={`Livre ${livre.n} (${livre.canonRange[0]}–${livre.canonRange[1]}) — ${livre.title}. Code de Droit Canonique de ${livre.code}.`}
	/>
</svelte:head>

<main class="cic-reader" use:scrollSpy>
	<header class="head">
		<BreadcrumbRail
			crumbs={[
				{ href: '/cic', title: 'Code de Droit Canonique' },
				{
					href: `/cic/${livre.code}`,
					title: livre.code === '1983' ? 'Code de 1983' : 'Code Pio-Benedictin (1917)'
				},
				{
					href: `/cic/${livre.code}/${livre.slug}`,
					kicker: `Livre ${livre.n}`,
					title: livre.title
				}
			]}
		/>
		<p class="kicker">
			Code de {livre.code} · Livre {livre.n} · can. {livre.canonRange[0]}–{livre.canonRange[1]}
		</p>
		<h1 class="title">{frenchPunct(livre.title)}</h1>
	</header>

	<article class="body reader-prose">
		{#each livre.blocks as block, i (i)}
			{#if block.kind === 'heading'}
				{#if block.level === 'partie'}
					<h2 class="h-partie" id={block.anchor}>{frenchPunct(block.title)}</h2>
				{:else if block.level === 'section'}
					<h2 class="h-section" id={block.anchor}>{frenchPunct(block.title)}</h2>
				{:else if block.level === 'titre'}
					<h3 class="h-titre" id={block.anchor}>
						{#if block.label}
							<span class="h-label">Titre {block.label}</span>
						{/if}
						<span>{frenchPunct(block.title)}</span>
					</h3>
				{:else if block.level === 'chapitre'}
					<h4 class="h-chapitre" id={block.anchor}>
						{#if block.label}
							<span class="h-label">Chapitre {block.label}</span>
						{/if}
						<span>{frenchPunct(block.title)}</span>
					</h4>
				{:else}
					<h5 class="h-article" id={block.anchor}>
						{#if block.label}
							<span class="h-label">Art. {block.label}</span>
						{/if}
						<span>{frenchPunct(block.title)}</span>
					</h5>
				{/if}
			{:else}
				<section class="canon" id="can-{block.n}">
					<a class="canon-num" href={`/cic/${livre.code}/${livre.slug}#can-${block.n}`}>
						Can. {block.n}
					</a>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					<div class="canon-body">{@html renderHtml(block.html)}</div>
				</section>
			{/if}
		{/each}
	</article>

	<nav class="pager" aria-label="Navigation">
		{#if data.prev}
			<NavCard
				href={`/cic/${data.prev.code}/${data.prev.slug}`}
				eyebrow={`Livre ${data.prev.n}`}
				title={data.prev.title}
				direction="prev"
			/>
		{:else}
			<span></span>
		{/if}
		{#if data.next}
			<NavCard
				href={`/cic/${data.next.code}/${data.next.slug}`}
				eyebrow={`Livre ${data.next.n}`}
				title={data.next.title}
				direction="next"
			/>
		{:else}
			<span></span>
		{/if}
	</nav>
</main>

<style>
	.cic-reader {
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
		font-variant-numeric: tabular-nums;
		margin: 1.25rem 0 0.5rem;
	}
	.title {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: clamp(1.9rem, 4.5vw, 2.9rem);
		font-weight: 700;
		line-height: 1.15;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.body {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.6);
	}

	/* Heading levels: Partie / Section ≥ Titre > Chapitre > Article. */
	.h-partie,
	.h-section {
		font-family: var(--font-heading);
		font-size: 1.5rem;
		font-weight: 700;
		text-align: center;
		margin: 3rem 0 1.25rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
		text-wrap: balance;
		scroll-margin-top: 80px;
	}
	.h-titre,
	.h-chapitre,
	.h-article {
		font-family: var(--font-heading);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin: 2rem 0 0.85rem;
		scroll-margin-top: 80px;
		text-wrap: balance;
	}
	.h-titre {
		font-size: 1.3rem;
		font-weight: 700;
	}
	.h-chapitre {
		font-size: 1.1rem;
		font-weight: 600;
	}
	.h-article {
		font-size: 1rem;
		font-weight: 600;
		font-style: italic;
		color: var(--color-subtle);
	}
	.h-label {
		font-family: var(--font-ui);
		font-style: normal;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	.canon {
		margin: 1.5rem 0;
		scroll-margin-top: 80px;
	}
	.canon-num {
		display: inline-block;
		font-family: var(--font-ui);
		font-size: 0.8rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-accent);
		text-decoration: none;
		margin-bottom: 0.3rem;
		letter-spacing: 0.03em;
	}
	.canon-num:hover {
		opacity: 0.75;
	}
	.canon-body :global(p) {
		margin: 0 0 0.5rem;
	}
	.canon-body :global(p:last-child) {
		margin-bottom: 0;
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
