<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import OraisonBlock from '$lib/components/ui/OraisonBlock.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { frenchPunct } from '$lib/utils/typography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const chapter = $derived(data.chapter);
</script>

<svelte:head>
	<title>{chapter.title} · Catéchisme illustré</title>
	<meta
		name="description"
		content={chapter.kind === 'chapter'
			? `${chapter.title} — Catéchisme illustré des vérités nécessaires (1897). ${(chapter.subtitle ?? '').slice(0, 140)}`
			: `${chapter.title} du Catéchisme illustré des vérités nécessaires (1897).`}
	/>
</svelte:head>

<main class="ci-reader" use:scrollSpy>
	<header class="head">
		<BreadcrumbRail
			crumbs={[
				{ href: '/catechisme-illustre', title: 'Catéchisme illustré' },
				{
					href: `/catechisme-illustre/${chapter.slug}`,
					kicker: chapter.kind === 'chapter' ? `Leçon ${chapter.roman}` : 'Annexe',
					title: chapter.title
				}
			]}
		/>
		{#if chapter.kind === 'chapter'}
			<p class="kicker">Leçon {chapter.roman}</p>
		{/if}
		<h1 class="title" id="ch-{chapter.slug}">{chapter.title}</h1>
		{#if chapter.kind === 'chapter' && chapter.subtitle}
			<p class="subtitle">{frenchPunct(chapter.subtitle)}</p>
		{/if}
	</header>

	{#if chapter.kind === 'chapter' && chapter.image}
		<figure class="illustration">
			<img
				src={chapter.image.src}
				alt={chapter.image.alt}
				width="900"
				loading="eager"
				fetchpriority="high"
			/>
			{#if chapter.image.caption}
				<figcaption>{chapter.image.caption}</figcaption>
			{/if}
		</figure>
	{/if}

	{#if chapter.kind === 'chapter'}
		<section class="prose" aria-label="Texte de la leçon">
			{#each chapter.blocks as block (block.n)}
				<article class="para">
					<span class="para-num" aria-hidden="true">{block.n}</span>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					<div class="para-body">{@html frenchPunct(block.html)}</div>
				</article>
			{/each}
		</section>

		{#if chapter.questions.length > 0}
			<OraisonBlock eyebrow="Questions">
				<ol class="questions">
					{#each chapter.questions as qa (qa.n)}
						<li>
							<span class="q-num">{qa.n}.</span>
							<span class="q-text">{frenchPunct(qa.q)}</span>
							{#if qa.a}
								<span class="q-sep" aria-hidden="true">—</span>
								<span class="q-answer">{frenchPunct(qa.a)}</span>
							{/if}
						</li>
					{/each}
				</ol>
			</OraisonBlock>
		{/if}

		{#if chapter.image_explanation_html}
			<section class="image-explanation" aria-labelledby="image-explanation-h">
				<h2 class="section-eyebrow" id="image-explanation-h">L'image</h2>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="ie-body">{@html frenchPunct(chapter.image_explanation_html)}</div>
			</section>
		{/if}
	{:else}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		<section class="prose flat">{@html frenchPunct(chapter.html)}</section>
	{/if}

	<nav class="pager" aria-label="Navigation entre leçons">
		{#if data.prev}
			<NavCard
				href="/catechisme-illustre/{data.prev.slug}"
				title={data.prev.title}
				eyebrow="Précédent"
				direction="prev"
			/>
		{:else}
			<span></span>
		{/if}
		{#if data.next}
			<NavCard
				href="/catechisme-illustre/{data.next.slug}"
				title={data.next.title}
				eyebrow="Suivant"
				direction="next"
			/>
		{:else}
			<span></span>
		{/if}
	</nav>
</main>

<style>
	.ci-reader {
		max-width: 760px;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1.25rem, 4vw, 2.5rem) 4rem;
		color: var(--color-fg);
		font-family: var(--font-body);
	}

	.head {
		text-align: center;
		margin-bottom: 2.5rem;
	}
	.kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 1rem 0 0.5rem;
	}
	.title {
		font-family: var(--font-heading);
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.01em;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.subtitle {
		max-width: 44ch;
		margin: 1rem auto 0;
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--color-subtle);
	}

	.illustration {
		margin: 2.5rem auto 2.5rem;
		text-align: center;
	}
	.illustration img {
		display: block;
		max-width: 100%;
		height: auto;
		margin: 0 auto;
		border-radius: 4px;
		background: color-mix(in srgb, var(--color-fg) 4%, transparent);
		box-shadow: 0 2px 12px color-mix(in srgb, var(--color-fg) 8%, transparent);
	}
	.illustration figcaption {
		margin-top: 0.85rem;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	.prose {
		font-family: var(--font-body);
		font-size: 1.05rem;
		line-height: 1.8;
	}

	.para {
		display: flex;
		gap: 1rem;
		margin: 0 0 1.25rem;
	}
	.para-num {
		flex: none;
		width: 1.6rem;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--color-accent);
		line-height: 1.85;
		text-align: right;
	}
	.para-body {
		flex: 1;
		min-width: 0;
	}
	.para-body :global(p) {
		margin: 0 0 0.6em;
	}
	.para-body :global(p:last-child) {
		margin-bottom: 0;
	}
	.para-body :global(.small-caps) {
		font-variant-caps: small-caps;
		letter-spacing: 0.04em;
	}

	.questions {
		list-style: none;
		margin: 0;
		padding: 0;
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		font-family: var(--font-body);
		font-style: normal;
	}
	.questions li {
		font-size: 0.95rem;
		line-height: 1.7;
		color: var(--color-fg);
	}
	.q-num {
		font-family: var(--font-ui);
		font-weight: 600;
		color: var(--color-accent);
		margin-right: 0.4rem;
	}
	.q-text {
		font-style: italic;
		color: var(--color-fg);
	}
	.q-sep {
		margin: 0 0.3rem;
		color: var(--color-muted);
	}
	.q-answer {
		color: var(--color-fg);
	}

	.image-explanation {
		margin: 3rem 0 0;
	}
	.section-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 1rem;
		text-align: center;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 0.5rem;
	}
	.ie-body {
		font-family: var(--font-body);
		font-size: 0.95rem;
		line-height: 1.75;
		color: var(--color-subtle);
	}
	.ie-body :global(p) {
		margin: 0 0 0.6em;
	}

	.flat :global(h2),
	.flat :global(h3) {
		font-family: var(--font-heading);
		font-weight: 600;
		margin: 2rem 0 1rem;
	}
	.flat :global(p) {
		margin: 0 0 1rem;
	}
	.flat :global(.div-eyebrow) {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-align: center;
		margin: 2rem 0 1rem;
	}

	.pager {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 3rem;
	}
	@media (max-width: 640px) {
		.pager {
			grid-template-columns: 1fr;
		}
	}
</style>
