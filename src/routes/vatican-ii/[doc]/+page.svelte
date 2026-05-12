<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { frenchPunct } from '$lib/utils/typography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const doc = $derived(data.doc);

	const KIND_LABEL = {
		constitution: 'Constitution',
		decree: 'Décret',
		declaration: 'Déclaration'
	} as const;

	function renderHtml(html: string): string {
		return frenchPunct(html);
	}
</script>

<svelte:head>
	<title>{doc.title} · Vatican II</title>
	<meta
		name="description"
		content={`${doc.title} · ${doc.subtitle} (${doc.date.slice(0, 4)}). ${KIND_LABEL[doc.kind]} du concile Vatican II.`}
	/>
</svelte:head>

<main class="vii-reader" use:scrollSpy>
	<header class="head">
		<BreadcrumbRail
			crumbs={[
				{ href: '/vatican-ii', title: 'Vatican II' },
				{ href: `/vatican-ii/${doc.slug}`, kicker: doc.abbr, title: doc.title }
			]}
		/>
		<p class="kicker">
			{KIND_LABEL[doc.kind]} · {doc.date} · {doc.abbr}
		</p>
		<h1 class="title">{doc.title}</h1>
		<p class="subtitle">{frenchPunct(doc.subtitle)}</p>
	</header>

	<article class="body reader-prose">
		{#each doc.blocks as block, i (i)}
			{#if block.kind === 'heading'}
				{#if block.level <= 2}
					<h2 class="section-heading" id={block.anchor}>{frenchPunct(block.title)}</h2>
				{:else if block.level === 3}
					<h3 class="sub-heading" id={block.anchor}>{frenchPunct(block.title)}</h3>
				{:else}
					<h4 class="sub-heading sub-heading-deep" id={block.anchor}>
						{frenchPunct(block.title)}
					</h4>
				{/if}
			{:else}
				<section class="paragraph" id={block.title ? undefined : `p${block.n}`}>
					<header class="paragraph-head">
						<a
							class="paragraph-num"
							href={`/vatican-ii/${doc.slug}#p${block.n}`}
							aria-label={`Paragraphe ${block.n}`}
						>
							{block.n}
						</a>
						{#if block.title}
							<!-- id on the heading so scrollSpy (h2/h3/h4[id]) can
							     track it and so deep-link anchors resolve here. -->
							<h3 class="paragraph-title" id="p{block.n}">{frenchPunct(block.title)}</h3>
						{/if}
					</header>
					{#if block.html}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<div class="paragraph-body">{@html renderHtml(block.html)}</div>
					{/if}
				</section>
			{/if}
		{/each}
	</article>

	{#if doc.footnotes.length > 0}
		<section class="footnotes" aria-label="Notes">
			<h2 class="footnotes-head">Notes</h2>
			<ol class="footnotes-list">
				{#each doc.footnotes as fn (fn.n)}
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
				href={`/vatican-ii/${data.prev.slug}`}
				eyebrow={data.prev.abbr}
				title={data.prev.title}
				direction="prev"
			/>
		{:else}
			<span></span>
		{/if}
		{#if data.next}
			<NavCard
				href={`/vatican-ii/${data.next.slug}`}
				eyebrow={data.next.abbr}
				title={data.next.title}
				direction="next"
			/>
		{:else}
			<span></span>
		{/if}
	</nav>
</main>

<style>
	.vii-reader {
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
		line-height: 1.1;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.subtitle {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 1.05rem;
		line-height: 1.4;
		color: var(--color-subtle);
		margin: 0.4rem 0 0;
	}

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
		color: var(--color-heading, var(--color-fg));
		scroll-margin-top: 80px;
		text-wrap: balance;
	}
	/* Roman sub-chapters (I., II., III., …) · upright weighty heading
	   that sits between the CHAPITRE divider and the § body. A short
	   centered accent rule above gives it a chapter-like beat without
	   being as loud as the full CHAPITRE underline. */
	.sub-heading {
		font-family: var(--font-heading);
		font-size: 1.3rem;
		font-weight: 700;
		line-height: 1.25;
		letter-spacing: -0.003em;
		margin: 2.5rem 0 0.9rem;
		color: var(--color-heading, var(--color-fg));
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
	/* Letter sub-headings (A. Normes…, B. Normes…) · upright, slightly
	   bigger than body, with a thin accent rule on the left to mark them
	   as sub-sections of the Roman parent. No red, no italic. */
	.sub-heading-deep {
		font-size: 1.1rem;
		font-style: normal;
		font-weight: 600;
		color: var(--color-fg);
		margin: 1.75rem 0 0.75rem;
		padding-left: 0.65rem;
		border-left: 2px solid var(--color-accent);
	}

	.paragraph {
		margin: 1.75rem 0;
		scroll-margin-top: 80px;
	}
	/* When a § has a title, give it some extra breathing room above so it
	   reads like a sub-section opener rather than just another paragraph. */
	.paragraph:has(.paragraph-title) {
		margin-top: 2.25rem;
	}
	.paragraph-head {
		display: flex;
		align-items: baseline;
		gap: 0.7rem;
		margin-bottom: 0.55rem;
	}
	.paragraph-num {
		font-family: var(--font-ui);
		font-size: 0.95rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-accent);
		text-decoration: none;
		flex: 0 0 auto;
		align-self: baseline;
	}
	.paragraph-num:hover {
		opacity: 0.75;
	}
	/* § title: italic body, the number badge to the left supplies the red
	   accent so the title reads like an editorial sub-section. */
	.paragraph-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 600;
		font-size: clamp(1.15rem, 1.3vw, 1.3rem);
		line-height: 1.25;
		letter-spacing: -0.005em;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
		text-wrap: balance;
	}
	.paragraph-body :global(p) {
		margin: 0 0 0.75rem;
	}
	.paragraph-body :global(p:last-child) {
		margin-bottom: 0;
	}
	.paragraph-body :global(.emphasis em),
	.paragraph-body :global(em) {
		font-style: italic;
	}
	.paragraph-body :global(.vat-ii-fn-ref) {
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
		padding-left: 2.5rem;
		margin: 0;
		list-style: decimal;
	}
	.footnotes-list li {
		margin-bottom: 0.5rem;
	}
	.footnotes-list li::marker {
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
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
