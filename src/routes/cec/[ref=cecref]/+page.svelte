<script lang="ts">
	import ReadableUnit from '$lib/components/cec/ReadableUnit.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const multiLabel = $derived(
		data.kind === 'multi' ? (page.url.searchParams.get('label') ?? null) : null
	);

	// Prev/next paragraph navigation. For ranges, prev steps back from the
	// first paragraph and next steps forward from the last · so navigation
	// keeps moving linearly through the catechism. Not shown for multi views.
	const prevNum = $derived(
		data.kind === 'paragraph'
			? data.paragraph.number - 1
			: data.kind === 'range'
				? data.from - 1
				: 0
	);
	const nextNum = $derived(
		data.kind === 'paragraph' ? data.paragraph.number + 1 : data.kind === 'range' ? data.to + 1 : 0
	);
	const hasPrev = $derived(data.kind !== 'multi' && prevNum >= 1);
	const hasNext = $derived(data.kind !== 'multi' && nextNum <= 2865);

	function chapterUrl(c: NonNullable<typeof data.context>): string {
		if (!c.section || !c.chapter) return '';
		return `/cec/${c.part.slug}/${c.section.slug}/${c.chapter.slug}`;
	}
	function fmtRange(r: { from: number; to: number } | undefined): string {
		if (!r) return '';
		return r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`;
	}
	function paraExcerpt(html: string, max = 155): string {
		return (
			html
				.replace(/<[^>]+>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim()
				.slice(0, max)
				.replace(/\s\S+$/, '') // don't cut mid-word
				.trimEnd()
				.replace(/[.,;:]$/, '') + '…'
		);
	}

	/** Pick the deepest available level for the "read complete X" link. */
	function deepestLevel(c: NonNullable<typeof data.context>): {
		label: string;
		title: string;
		href: string;
	} | null {
		if (c.heading && c.section && c.chapter) {
			const articlePart = c.article ? `/${c.article.slug}` : '';
			return {
				label: 'Lire la rubrique complète',
				title: c.heading.title,
				href: `/cec/${c.part.slug}/${c.section.slug}/${c.chapter.slug}${articlePart}#${c.heading.id}`
			};
		}
		if (c.article && c.chapter && c.section) {
			return {
				label: "Lire l'article complet",
				title: c.article.title,
				href: `/cec/${c.part.slug}/${c.section.slug}/${c.chapter.slug}/${c.article.slug}`
			};
		}
		if (c.chapter && c.section) {
			return {
				label: 'Lire le chapitre complet',
				title: c.chapter.title,
				href: `/cec/${c.part.slug}/${c.section.slug}/${c.chapter.slug}`
			};
		}
		if (c.section) {
			return {
				label: 'Lire la section complète',
				title: c.section.title,
				href: `/cec/${c.part.slug}/${c.section.slug}`
			};
		}
		const partLabel = c.part.number ? 'Lire la partie complète' : 'Lire le prologue complet';
		return {
			label: partLabel,
			title: c.part.title,
			href: `/cec/${c.part.slug}`
		};
	}
</script>

<svelte:head>
	{#if data.kind === 'paragraph'}
		<title>Paragraphe {data.paragraph.number} du Catéchisme de l'Église Catholique</title>
		<meta name="description" content={paraExcerpt(data.paragraph.text_html)} />
	{:else if data.kind === 'range'}
		<title>Paragraphes {data.from}–{data.to} du Catéchisme de l'Église Catholique</title>
		<meta
			name="description"
			content="Paragraphes {data.from}–{data.to} du Catéchisme de l'Église Catholique."
		/>
	{:else}
		<title>{data.numbers.length} paragraphes · Catéchisme de l'Église Catholique</title>
		<meta
			name="description"
			content="Sélection de {data.numbers.length} paragraphes du Catéchisme de l'Église Catholique."
		/>
	{/if}
</svelte:head>

<main class="mx-auto max-w-reader px-6 max-md:px-4 py-10">
	{#if data.context}
		{@const c = data.context}
		<nav class="breadcrumb-rail mb-8 font-ui text-sm" aria-label="Fil d'Ariane">
			<ol class="space-y-1">
				<li>
					<a href="/cec" class="text-muted hover:text-accent">Catéchisme</a>
				</li>
				<li class="pl-5">
					<a href="/cec/{c.part.slug}" class="text-muted hover:text-accent">
						<span class="font-semibold bc-kicker">
							{c.part.number ? `Partie ${c.part.number}` : 'Prologue'}
						</span>
						<span class="bc-title">
							&nbsp;: {c.part.title}
							{#if c.part.range}
								<span class="text-subtle bc-range">({fmtRange(c.part.range)})</span>
							{/if}
						</span>
					</a>
				</li>
				{#if c.section}
					<li class="pl-10">
						<a href="/cec/{c.part.slug}/{c.section.slug}" class="text-muted hover:text-accent">
							<span class="font-semibold bc-kicker">
								{c.section.number ? `Section ${c.section.number}` : 'Section'}
							</span>
							<span class="bc-title">
								&nbsp;: {c.section.title}
								{#if c.section.range}
									<span class="text-subtle bc-range">({fmtRange(c.section.range)})</span>
								{/if}
							</span>
						</a>
					</li>
				{/if}
				{#if c.chapter}
					<li class="pl-[3.75rem]">
						<a href={chapterUrl(c)} class="text-muted hover:text-accent">
							<span class="font-semibold bc-kicker">
								{c.chapter.number ? `Chapitre ${c.chapter.number}` : 'Chapitre'}
							</span>
							<span class="bc-title">
								&nbsp;: {c.chapter.title}
								{#if c.chapter.range}
									<span class="text-subtle bc-range">({fmtRange(c.chapter.range)})</span>
								{/if}
							</span>
						</a>
					</li>
				{/if}
				{#if c.article}
					<li class="pl-20">
						<a href="{chapterUrl(c)}/{c.article.slug}" class="text-muted hover:text-accent">
							<span class="font-semibold bc-kicker">
								{c.article.number ? `Article ${c.article.number}` : 'Article'}
							</span>
							<span class="bc-title">
								&nbsp;: {c.article.title}
								{#if c.article.range}
									<span class="text-subtle bc-range">({fmtRange(c.article.range)})</span>
								{/if}
							</span>
						</a>
					</li>
				{/if}
			</ol>
		</nav>

		{#if c.heading}
			<h2 class="font-ui text-lg font-semibold text-accent mt-2 mb-4">
				<a href="{chapterUrl(c)}#{c.heading.id}" class="hover:underline">
					{c.heading.title}
				</a>
			</h2>
		{/if}

		<div class="border-t border-border pt-6 mt-2">
			{#if data.kind === 'paragraph'}
				<ReadableUnit unit={{ kind: 'ccc-paragraph', data: data.paragraph }} />
			{:else}
				{#each data.paragraphs as p (p.number)}
					<ReadableUnit unit={{ kind: 'ccc-paragraph', data: p }} />
				{/each}
			{/if}
		</div>

		{@const level = deepestLevel(c)}
		{#if level}
			<p class="mt-12 font-ui text-sm">
				<a href={level.href} class="text-accent hover:underline">
					{level.label}&nbsp;: {level.title} →
				</a>
			</p>
		{/if}
	{:else if data.kind === 'paragraph'}
		<ReadableUnit unit={{ kind: 'ccc-paragraph', data: data.paragraph }} />
	{:else if data.kind === 'multi'}
		<header class="mb-8">
			<a
				href="/cec"
				class="inline-flex items-center gap-1 font-ui text-sm text-muted hover:text-accent mb-4"
			>
				<span aria-hidden="true">←</span> Catéchisme
			</a>
			{#if multiLabel}
				<h1 class="font-heading text-2xl font-semibold mb-1">{multiLabel}</h1>
			{/if}
			<p class="font-ui text-[12px] uppercase tracking-[0.15em] text-muted">
				{data.numbers.length} paragraphes sélectionnés
			</p>
			<p class="font-ui text-sm text-muted mt-1 tabular-nums">
				{data.numbers.join(', ')}
			</p>
		</header>
		<div class="border-t border-border pt-6">
			{#each data.paragraphs as p (p.number)}
				<ReadableUnit unit={{ kind: 'ccc-paragraph', data: p }} />
			{/each}
		</div>
	{:else}
		{#each data.paragraphs as p (p.number)}
			<ReadableUnit unit={{ kind: 'ccc-paragraph', data: p }} />
		{/each}
	{/if}

	{#if data.kind !== 'multi'}
		<nav
			class="mt-10 pt-6 border-t border-border flex items-stretch justify-between gap-4"
			aria-label="Paragraphe précédent ou suivant"
		>
			{#if hasPrev}
				<NavCard
					direction="prev"
					href="/cec/{prevNum}"
					eyebrow="Précédent"
					title={String(prevNum)}
				/>
			{:else}
				<span style="flex:1"></span>
			{/if}
			{#if hasNext}
				<NavCard direction="next" href="/cec/{nextNum}" eyebrow="Suivant" title={String(nextNum)} />
			{:else}
				<span style="flex:1"></span>
			{/if}
		</nav>
	{/if}
</main>
