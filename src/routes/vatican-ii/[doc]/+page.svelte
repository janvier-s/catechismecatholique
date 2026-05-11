<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { frenchPunct } from '$lib/utils/typography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const doc = $derived(data.doc);

	const KIND_LABEL = {
		constitution: 'Constitution',
		decree: 'Décret',
		declaration: 'Déclaration'
	} as const;

	type TocItem = { anchor: string; title: string };
	const miniToc = $derived.by<TocItem[]>(() => {
		const out: TocItem[] = [];
		for (const b of doc.blocks) {
			if (b.kind === 'heading' && b.level === 1) out.push({ anchor: b.anchor, title: b.title });
		}
		return out;
	});

	function renderHtml(html: string): string {
		return frenchPunct(html);
	}
</script>

<svelte:head>
	<title>{doc.title} · Vatican II</title>
	<meta
		name="description"
		content={`${doc.title} — ${doc.subtitle} (${doc.date.slice(0, 4)}). ${KIND_LABEL[doc.kind]} du concile Vatican II.`}
	/>
</svelte:head>

<main class="vii-reader">
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

	{#if miniToc.length > 1}
		<details class="mini-toc" open>
			<summary>
				<span class="mini-toc-label">Plan</span>
				<span class="mini-toc-count">{miniToc.length} sections</span>
			</summary>
			<ol class="mini-toc-list">
				{#each miniToc as item (item.anchor)}
					<li>
						<a class="mini-toc-link" href="#{item.anchor}">{frenchPunct(item.title)}</a>
					</li>
				{/each}
			</ol>
		</details>
	{/if}

	<article class="body reader-prose">
		{#each doc.blocks as block, i (i)}
			{#if block.kind === 'heading'}
				{#if block.level === 1}
					<h2 class="section-heading" id={block.anchor}>{frenchPunct(block.title)}</h2>
				{:else if block.level === 2}
					<h3 class="sub-heading" id={block.anchor}>{frenchPunct(block.title)}</h3>
				{:else}
					<h4 class="sub-heading sub-heading-deep" id={block.anchor}>
						{frenchPunct(block.title)}
					</h4>
				{/if}
			{:else}
				<div class="paragraph" id="p{block.n}">
					<a
						class="paragraph-num"
						href={`/vatican-ii/${doc.slug}#p${block.n}`}
						aria-label={`Paragraphe ${block.n}`}
					>
						{block.n}
					</a>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					<div class="paragraph-body">{@html renderHtml(block.html)}</div>
				</div>
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

	.mini-toc {
		border: 1px solid color-mix(in srgb, var(--color-fg) 14%, transparent);
		border-radius: 6px;
		padding: 0.5rem 1rem;
		margin-bottom: 2rem;
		font-family: var(--font-ui);
	}
	.mini-toc summary {
		cursor: pointer;
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.4rem 0;
		font-size: 0.85rem;
	}
	.mini-toc-label {
		font-weight: 600;
	}
	.mini-toc-count {
		margin-left: auto;
		font-size: 0.72rem;
		color: var(--color-muted);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.mini-toc-list {
		list-style: decimal;
		padding: 0.5rem 0 0.75rem 2rem;
		margin: 0;
	}
	.mini-toc-link {
		display: block;
		padding: 0.25rem 0.4rem;
		font-size: 0.85rem;
		line-height: 1.4;
		color: var(--color-fg);
		text-decoration: none;
		border-radius: 4px;
	}
	.mini-toc-link:hover {
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		color: var(--color-accent);
	}

	.body {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.6);
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
	.sub-heading {
		font-family: var(--font-heading);
		font-size: 1.15rem;
		font-weight: 600;
		font-style: italic;
		line-height: 1.3;
		margin: 1.75rem 0 0.75rem;
		color: var(--color-heading, var(--color-fg));
		scroll-margin-top: 80px;
	}
	.sub-heading-deep {
		font-size: 1rem;
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
