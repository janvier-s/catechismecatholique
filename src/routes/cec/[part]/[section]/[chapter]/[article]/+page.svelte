<script lang="ts">
	import ReadableUnit from '$lib/components/cec/ReadableUnit.svelte';
	import EnBrefBlock from '$lib/components/cec/EnBrefBlock.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import PartPanoramaTrigger from '$lib/components/ui/PartPanoramaTrigger.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { SvelteMap } from 'svelte/reactivity';
	import { page } from '$app/state';
	import type { Paragraph } from '$lib/data/types';
	import { ADJACENT_LABEL } from '$lib/data/types';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const breadcrumbJsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Catéchisme', item: `${page.url.origin}/ccc` },
				{
					'@type': 'ListItem',
					position: 2,
					name: data.chapter.part_title,
					item: `${page.url.origin}/cec/${data.chapter.part_slug}`
				},
				{
					'@type': 'ListItem',
					position: 3,
					name: data.chapter.section_title,
					item: `${page.url.origin}/cec/${data.chapter.part_slug}/${data.chapter.section_slug}`
				},
				{
					'@type': 'ListItem',
					position: 4,
					name: data.chapter.title,
					item: `${page.url.origin}/cec/${data.chapter.part_slug}/${data.chapter.section_slug}/${data.chapter.slug}`
				},
				{ '@type': 'ListItem', position: 5, name: data.article.title }
			]
		})
	);
	const breadcrumbJsonLdScript = $derived(
		`<${'script'} type="application/ld+json">${breadcrumbJsonLd}</${'script'}>`
	);

	// Map first-paragraph-of-block → block, plus a set of every paragraph
	// number that belongs to any En Bref block. The body loop renders the
	// summary box at the FIRST paragraph and skips the rest so they don't
	// double-render as regular ParagraphViews.
	const enBrefStartMap = $derived.by(() => {
		const map = new SvelteMap<number, { paragraphs: number[] }>();
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
	<title>{data.article.title} · Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content={`${data.article.number ? `Article ${data.article.number} : ` : ''}${data.article.title} | ${data.chapter.title}. Catéchisme de l'Église Catholique.`}
	/>
	{@html breadcrumbJsonLdScript}
</svelte:head>

<main class="mx-auto max-w-reader px-6 max-md:px-4 py-10" use:scrollSpy>
	<div class="breadcrumb-row mb-6">
		<nav class="breadcrumb-rail font-ui text-sm" aria-label="Fil d'Ariane">
			<ol class="space-y-1">
				<li><a href="/cec" class="text-muted hover:text-accent">Catéchisme</a></li>
				<li class="pl-5">
					<a href="/cec/{data.chapter.part_slug}" class="text-muted hover:text-accent">
						<span class="font-semibold bc-kicker"
							>{data.chapter.part_number ? `Partie ${data.chapter.part_number}` : 'Prologue'}</span
						>
						<span class="bc-title">&nbsp;: {data.chapter.part_title}</span>
					</a>
				</li>
				<li class="pl-10">
					<a
						href="/cec/{data.chapter.part_slug}/{data.chapter.section_slug}"
						class="text-muted hover:text-accent"
					>
						<span class="font-semibold bc-kicker"
							>{data.chapter.section_number
								? `Section ${data.chapter.section_number}`
								: 'Section'}</span
						>
						<span class="bc-title">&nbsp;: {data.chapter.section_title}</span>
					</a>
				</li>
				<li class="pl-[3.75rem]">
					<a
						href="/cec/{data.chapter.part_slug}/{data.chapter.section_slug}/{data.chapter.slug}"
						class="text-muted hover:text-accent"
					>
						<span class="font-semibold bc-kicker"
							>{data.chapter.number ? `Chapitre ${data.chapter.number}` : 'Chapitre'}</span
						>
						<span class="bc-title">&nbsp;: {data.chapter.title}</span>
					</a>
				</li>
				<li class="pl-20">
					<span class="font-semibold bc-kicker"
						>{data.article.number ? `Article ${data.article.number}` : 'Article'}</span
					>
					<span class="bc-title">&nbsp;: {data.article.title}</span>
				</li>
			</ol>
		</nav>
		<PartPanoramaTrigger />
	</div>

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
					class="font-heading text-2xl font-semibold mt-16 mb-6 pb-2 border-b border-border text-heading"
				>
					<span class="font-ui text-[11px] uppercase tracking-[0.18em] text-muted block mb-1">
						Paragraphe {paragraphe.number}
					</span>
					{paragraphe.title}
				</h2>
			{/if}
			{@const headingsHere = data.article.headings.filter((h) => h.paragraph_start === p.number)}
			{#each headingsHere as heading (heading.id)}
				{#if heading.level <= 2}
					<h3 id={heading.id} class="font-ui text-xl font-semibold mt-12 mb-4 text-accent">
						{heading.title}
					</h3>
				{:else}
					<h4 id={heading.id} class="font-ui text-lg font-semibold mt-8 mb-3 text-heading">
						{heading.title}
					</h4>
				{/if}
			{/each}
			<ReadableUnit unit={{ kind: 'ccc-paragraph', data: p }} />
		{/if}
	{/each}

	<nav
		class="mt-16 pt-6 border-t border-border flex items-stretch justify-between gap-6 font-ui"
		aria-label="Article suivant ou précédent"
	>
		{#if data.prevArticle}
			<NavCard
				direction="prev"
				href={`/cec/${data.chapter.part_slug}/${data.chapter.section_slug}/${data.chapter.slug}/${data.prevArticle.slug}`}
				eyebrow="← Précédent"
				title={(data.prevArticle.number ? `Article ${data.prevArticle.number}. ` : '') +
					data.prevArticle.title}
			/>
		{:else}
			<NavCard
				direction="prev"
				href="/cec/{data.chapter.part_slug}/{data.chapter.section_slug}/{data.chapter.slug}"
				eyebrow="← Retour au chapitre"
				title={data.chapter.title}
			/>
		{/if}

		{#if data.nextArticle}
			<NavCard
				direction="next"
				href={`/cec/${data.chapter.part_slug}/${data.chapter.section_slug}/${data.chapter.slug}/${data.nextArticle.slug}`}
				eyebrow="Suivant →"
				title={(data.nextArticle.number ? `Article ${data.nextArticle.number}. ` : '') +
					data.nextArticle.title}
			/>
		{:else if data.chapter.next}
			<NavCard
				direction="next"
				href={data.chapter.next.href}
				eyebrow={ADJACENT_LABEL.next[data.chapter.next.kind]}
				title={data.chapter.next.title}
			/>
		{/if}
	</nav>
</main>

<style>
	.breadcrumb-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}
	.breadcrumb-row .breadcrumb-rail {
		flex: 1 1 auto;
		min-width: 0;
	}
</style>
