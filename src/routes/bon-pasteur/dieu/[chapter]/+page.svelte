<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const ch = $derived(data.chapter);
</script>

<svelte:head>
	<title>{ch.title} · Dieu · Institut du Bon Pasteur</title>
	<meta
		name="description"
		content="Chapitre {ch.n} : {ch.title} — cours de catéchèse de l'Institut du Bon Pasteur."
	/>
</svelte:head>

<main class="dieu-reader" id="top">
	<header class="head">
		<BreadcrumbRail
			crumbs={[
				{ href: '/bon-pasteur', title: 'Institut du Bon Pasteur' },
				{ href: '/bon-pasteur/dieu', title: 'Dieu' },
				{ href: `/bon-pasteur/dieu/${ch.slug}`, kicker: `Ch. ${ch.n}`, title: ch.title }
			]}
		/>
		<p class="kicker">Chapitre {ch.n}</p>
		<h1 class="title">{ch.title}</h1>
	</header>

	<article class="body reader-prose">
		{#each ch.blocks as block, i (i)}
			{#if block.kind === 'heading'}
				{#if block.level === 2}
					<h2 class="section-heading" id={block.anchor}>{block.title}</h2>
				{:else}
					<h3 class="sub-heading" id={block.anchor}>{block.title}</h3>
				{/if}
			{:else if block.kind === 'definition'}
				<div class="definition">
					<span class="definition-term">{block.term}</span>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					<div class="definition-body">{@html block.html}</div>
				</div>
			{:else}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="prose-block">{@html block.html}</div>
			{/if}
		{/each}
	</article>

	<nav class="pager" aria-label="Navigation">
		{#if data.prev}
			<NavCard
				href="/bon-pasteur/dieu/{data.prev.slug}"
				eyebrow="Ch. {data.prev.n}"
				title={data.prev.title}
				direction="prev"
			/>
		{:else}
			<span></span>
		{/if}
		{#if data.next}
			<NavCard
				href="/bon-pasteur/dieu/{data.next.slug}"
				eyebrow="Ch. {data.next.n}"
				title={data.next.title}
				direction="next"
			/>
		{:else}
			<span></span>
		{/if}
	</nav>
</main>

<style>
	.dieu-reader {
		max-width: 760px;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1.25rem, 4vw, 2.5rem);
		color: var(--color-fg);
		font-family: var(--font-body);
	}

	.head {
		margin-bottom: 2.5rem;
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
		font-style: italic;
		font-size: clamp(1.9rem, 4.5vw, 2.9rem);
		font-weight: 700;
		line-height: 1.1;
		margin: 0;
	}

	/* ── Body ──────────────────────────────────────────────────────────── */
	.body {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.6);
	}

	.section-heading {
		font-family: var(--font-heading);
		font-size: clamp(1.45rem, 2.4vw, 1.7rem);
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.005em;
		margin: 3rem 0 1.25rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
		scroll-margin-top: 80px;
		text-wrap: balance;
	}

	.sub-heading {
		font-family: var(--font-heading);
		font-size: 1.3rem;
		font-weight: 700;
		line-height: 1.25;
		letter-spacing: -0.003em;
		margin: 2.5rem 0 0.9rem;
		scroll-margin-top: 80px;
		text-wrap: balance;
	}
	.sub-heading::before {
		content: '';
		display: block;
		width: 2.5rem;
		height: 2px;
		background: var(--color-accent);
		opacity: 0.55;
		margin-bottom: 0.65rem;
	}

	.prose-block :global(p) {
		margin: 0 0 0.8rem;
	}
	.prose-block :global(p:last-child) {
		margin-bottom: 0;
	}
	.prose-block {
		margin: 0.8rem 0;
	}
	.prose-block :global(ul) {
		margin: 0.5rem 0 0.5rem 1.5rem;
		padding: 0;
	}
	.prose-block :global(li) {
		margin-bottom: 0.35rem;
	}

	/* ── Definition ────────────────────────────────────────────────────── */
	.definition {
		display: grid;
		grid-template-columns: minmax(7rem, max-content) 1fr;
		gap: 0.3rem 1rem;
		align-items: baseline;
		margin: 0.9rem 0;
		padding: 0.6rem 0.85rem;
		background: color-mix(in srgb, var(--color-accent) 5%, var(--color-panel));
		border-left: 2px solid var(--color-accent);
		border-radius: 0 2px 2px 0;
	}
	.definition-term {
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--color-accent);
		white-space: nowrap;
	}
	.definition-body {
		font-size: 0.93rem;
		line-height: 1.55;
		color: var(--color-subtle);
	}
	.definition-body :global(p) {
		margin: 0;
	}

	@media (max-width: 560px) {
		.definition {
			grid-template-columns: 1fr;
			gap: 0.15rem;
		}
	}

	/* ── Pager ─────────────────────────────────────────────────────────── */
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
