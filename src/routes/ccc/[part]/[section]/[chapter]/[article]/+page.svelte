<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	import EnBrefBlock from '$lib/components/ccc/EnBrefBlock.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import type { Paragraph } from '$lib/data/types';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	// Map first-paragraph-of-block → block, plus a set of every paragraph
	// number that belongs to any En Bref block. The body loop renders the
	// summary box at the FIRST paragraph and skips the rest so they don't
	// double-render as regular ParagraphViews.
	const enBrefStartMap = $derived.by(() => {
		const map = new Map<number, { paragraphs: number[] }>();
		for (const block of data.enBrefBlocks ?? []) {
			if (block.paragraphs.length > 0) map.set(block.paragraphs[0]!, block);
		}
		return map;
	});
	const enBrefAllNumbers = $derived(
		new Set<number>((data.enBrefBlocks ?? []).flatMap((b) => b.paragraphs))
	);
</script>

<svelte:head>
	<title>{data.article.title} — Catéchisme</title>
</svelte:head>

<main class="mx-auto max-w-reader px-6 py-10" use:scrollSpy>
	<nav class="mb-6 font-ui text-sm" aria-label="Fil d'Ariane">
		<ol class="space-y-1">
			<li><a href="/ccc" class="text-muted hover:text-accent">Catéchisme</a></li>
			<li class="pl-5">
				<a href="/ccc/{data.chapter.part_slug}" class="text-muted hover:text-accent">
					<span class="font-semibold"
						>{data.chapter.part_number
							? `Partie ${data.chapter.part_number} :`
							: 'Prologue :'}</span
					>
					{data.chapter.part_title}
				</a>
			</li>
			<li class="pl-10">
				<a
					href="/ccc/{data.chapter.part_slug}/{data.chapter.section_slug}"
					class="text-muted hover:text-accent"
				>
					<span class="font-semibold"
						>{data.chapter.section_number
							? `Section ${data.chapter.section_number} :`
							: 'Section :'}</span
					>
					{data.chapter.section_title}
				</a>
			</li>
			<li class="pl-[3.75rem]">
				<a
					href="/ccc/{data.chapter.part_slug}/{data.chapter.section_slug}/{data.chapter.slug}"
					class="text-muted hover:text-accent"
				>
					<span class="font-semibold"
						>{data.chapter.number ? `Chapitre ${data.chapter.number} :` : 'Chapitre :'}</span
					>
					{data.chapter.title}
				</a>
			</li>
			<li class="pl-20">
				<span class="font-semibold"
					>{data.article.number ? `Article ${data.article.number} :` : 'Article :'}</span
				>
				{data.article.title}
			</li>
		</ol>
	</nav>

	<p class="font-ui text-sm uppercase tracking-wider text-muted mt-4">
		{data.article.number ? `Article ${data.article.number}` : 'Article'}
	</p>
	<h1 class="font-heading text-4xl font-semibold mt-1 mb-8 text-heading">{data.article.title}</h1>

	{#each data.paragraphs as p (p.number)}
		{#if enBrefStartMap.has(p.number)}
			{@const block = enBrefStartMap.get(p.number)!}
			{@const records = block.paragraphs
				.map((n) => data.enBrefParagraphMap?.[n])
				.filter((x): x is Paragraph => Boolean(x))}
			<EnBrefBlock paragraphs={records} />
		{:else if !enBrefAllNumbers.has(p.number)}
			{@const paragraphe = (data.article.paragraphes ?? []).find(
				(pg) => pg.paragraph_start === p.number
			)}
			{#if paragraphe}
				<h2
					id="paragraphe-{paragraphe.number}"
					class="font-heading text-2xl font-semibold mt-16 mb-6 pb-2 border-b border-border scroll-mt-24 text-heading"
				>
					<span class="font-ui text-[11px] uppercase tracking-[0.18em] text-muted block mb-1">
						Paragraphe {paragraphe.number}
					</span>
					{paragraphe.title}
				</h2>
			{/if}
			{@const headingsHere = data.article.headings.filter(
				(h) => h.paragraph_start === p.number
			)}
			{#each headingsHere as heading (heading.id)}
				{#if heading.level <= 2}
					<h3
						id={heading.id}
						class="font-ui text-xl font-semibold mt-12 mb-4 scroll-mt-24 text-accent"
					>
						{heading.title}
					</h3>
				{:else}
					<h4
						id={heading.id}
						class="font-ui text-lg font-semibold mt-8 mb-3 scroll-mt-24 text-heading"
					>
						{heading.title}
					</h4>
				{/if}
			{/each}
			<ParagraphView paragraph={p} />
		{/if}
	{/each}

	<nav
		class="mt-16 pt-6 border-t border-border flex items-stretch justify-between gap-6 font-ui"
		aria-label="Article suivant ou précédent"
	>
		{#if data.prevArticle}
			{@const href =
				`/ccc/${data.chapter.part_slug}/${data.chapter.section_slug}/${data.chapter.slug}/${data.prevArticle.slug}`}
			<a class="article-nav-link prev" href={href}>
				<span class="article-nav-eyebrow">← Précédent</span>
				<span class="article-nav-title">
					{data.prevArticle.number ? `Article ${data.prevArticle.number}. ` : ''}{data.prevArticle.title}
				</span>
			</a>
		{:else}
			<a
				class="article-nav-link prev"
				href="/ccc/{data.chapter.part_slug}/{data.chapter.section_slug}/{data.chapter.slug}"
			>
				<span class="article-nav-eyebrow">← Retour au chapitre</span>
				<span class="article-nav-title">
					{data.chapter.title}
				</span>
			</a>
		{/if}


		{#if data.nextArticle}
			{@const href =
				`/ccc/${data.chapter.part_slug}/${data.chapter.section_slug}/${data.chapter.slug}/${data.nextArticle.slug}`}
			<a class="article-nav-link next" href={href}>
				<span class="article-nav-eyebrow">Suivant →</span>
				<span class="article-nav-title">
					{data.nextArticle.number ? `Article ${data.nextArticle.number}. ` : ''}{data.nextArticle.title}
				</span>
			</a>
		{:else if data.chapter.next}
			{@const next = data.chapter.next}
			{@const viaPart = next.crosses_part && next.part_has_intro}
			{@const viaSection = !viaPart && next.crosses_section && next.section_has_intro}
			{@const href = viaPart
				? `/ccc/${next.part_slug}`
				: viaSection
					? `/ccc/${next.part_slug}/${next.section_slug}`
					: `/ccc/${next.part_slug}/${next.section_slug}/${next.slug}`}
			<a class="article-nav-link next" href={href}>
				<span class="article-nav-eyebrow">
					{viaPart ? 'Partie suivante →' : viaSection ? 'Section suivante →' : 'Chapitre suivant →'}
				</span>
				<span class="article-nav-title">
					{viaPart ? next.part_title : viaSection ? next.section_title : next.title}
				</span>
			</a>
		{/if}
	</nav>
</main>

<style>
	.article-nav-link {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.85rem 1rem;
		background: var(--color-panel);
		border: 1px solid color-mix(in srgb, var(--color-fg) 22%, transparent);
		border-radius: 4px;
		color: var(--color-fg);
		text-decoration: none;
		transition:
			border-color 140ms ease,
			background 140ms ease,
			color 140ms ease;
	}
	.article-nav-link:hover {
		border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		color: var(--color-accent-text);
	}
	.article-nav-link.prev {
		text-align: left;
	}
	.article-nav-link.next {
		text-align: right;
	}
	.article-nav-eyebrow {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-muted);
	}
	.article-nav-title {
		font-family: var(--font-heading);
		font-size: 15px;
		line-height: 1.3;
		color: var(--color-fg);
	}
	.article-nav-link:hover .article-nav-title {
		color: var(--color-accent-text);
	}
</style>
