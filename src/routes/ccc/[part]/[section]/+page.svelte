<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	import EnBrefBlock from '$lib/components/ccc/EnBrefBlock.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { SvelteMap } from 'svelte/reactivity';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	// Map paragraph_start → heading so the body loop can insert them inline.
	type IntroHeading = NonNullable<typeof data.section.intro_headings>[number];
	const headingByPara = $derived.by(() => {
		const m = new SvelteMap<number, IntroHeading>();
		for (const h of data.section.intro_headings ?? []) m.set(h.paragraph_start, h);
		return m;
	});
</script>

<svelte:head>
	<title>{data.section.title} · Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content={`${data.section.number ? `Section ${data.section.number} : ` : ''}${data.section.title} | ${data.part.title}. ${data.section.chapters.length} chapitre${data.section.chapters.length > 1 ? 's' : ''} | Catéchisme de l'Église Catholique.`}
	/>
</svelte:head>

<main class="mx-auto max-w-reader px-6 max-md:px-0 py-10" use:scrollSpy>
	<nav class="breadcrumb-rail mb-6 font-ui text-sm" aria-label="Fil d'Ariane">
		<ol class="space-y-1">
			<li><a href="/ccc" class="text-muted hover:text-accent">Catéchisme</a></li>
			<li class="pl-5">
				<a href="/ccc/{data.part.slug}" class="text-muted hover:text-accent">
					<span class="font-semibold bc-kicker">
						{data.part.number ? `Partie ${data.part.number}` : 'Prologue'}
					</span>
					<span class="bc-title">&nbsp;: {data.part.title}</span>
				</a>
			</li>
			<li class="pl-10">
				<span class="font-semibold bc-kicker">
					{data.section.number ? `Section ${data.section.number}` : 'Section'}
				</span>
				<span class="bc-title">&nbsp;: {data.section.title}</span>
			</li>
		</ol>
	</nav>

	<p class="font-ui text-sm uppercase tracking-wider text-muted mt-4">
		{data.section.number ? `Section ${data.section.number}` : 'Section'}
	</p>
	<h1 class="font-heading text-4xl font-semibold mt-1 mb-8 text-heading">
		{data.section.title}
	</h1>

	{#if data.introParagraphs.length > 0}
		{#each data.introParagraphs as p (p.number)}
			{@const heading = headingByPara.get(p.number)}
			{#if heading}
				{#if heading.level <= 2}
					<h2
						id={heading.id}
						class="font-ui text-xl font-semibold mt-12 mb-4 scroll-mt-24 text-accent"
					>
						{heading.title}
					</h2>
				{:else}
					<h3
						id={heading.id}
						class="font-ui text-lg font-semibold mt-8 mb-3 scroll-mt-24 text-heading"
					>
						{heading.title}
					</h3>
				{/if}
			{/if}
			<ParagraphView paragraph={p} />
		{/each}
	{/if}

	{#if data.enBrefs && data.enBrefs.length > 0}
		{#each data.enBrefs as paragraphs, i (paragraphs[0]?.number ?? i)}
			<EnBrefBlock {paragraphs} />
		{/each}
	{/if}

	{#if data.section.chapters.length > 0}
		<h2 class="font-ui text-sm uppercase tracking-wider text-muted mt-12 mb-3">Chapitres</h2>
		<ol class="space-y-4 mb-10">
			{#each data.section.chapters as chapter (chapter.slug)}
				<li>
					<a href="/ccc/{data.part.slug}/{data.section.slug}/{chapter.slug}" class="block group">
						<h3 class="font-ui text-xl font-semibold group-hover:text-accent">
							<span class="font-semibold">Chapitre {chapter.number} :</span>
							{chapter.title}
						</h3>
						<p class="text-muted text-sm">{chapter.paragraphs.length} paragraphes</p>
					</a>
				</li>
			{/each}
		</ol>
	{/if}

	{#if data.section.articles_direct && data.section.articles_direct.length > 0}
		<h2 class="font-ui text-sm uppercase tracking-wider text-muted mb-3">Articles</h2>
		<ol class="space-y-4">
			{#each data.section.articles_direct as article (article.slug)}
				{@const firstPara = article.paragraphs[0]}
				{#if firstPara}
					<li>
						<a
							href="/ccc/{firstPara}-{article.paragraphs[article.paragraphs.length - 1]}"
							class="block group"
						>
							<h3 class="font-ui text-xl font-semibold group-hover:text-accent">
								{#if article.number}<span class="font-semibold">Article {article.number} :</span
									>{/if}
								{article.title}
							</h3>
							<p class="text-muted text-sm">
								{article.paragraphs.length} paragraphes (§§ {firstPara}–{article.paragraphs[
									article.paragraphs.length - 1
								]})
							</p>
						</a>
					</li>
				{/if}
			{/each}
		</ol>
	{/if}

	<nav
		class="mt-16 pt-6 border-t border-border flex items-stretch justify-between gap-6 font-ui"
		aria-label="Section précédente ou suivante"
	>
		{#if data.prevChapter}
			<NavCard
				direction="prev"
				href="/ccc/{data.part.slug}/{data.prevChapter.section_slug}/{data.prevChapter.slug}"
				eyebrow="← Chapitre précédent"
				title={data.prevChapter.title}
			/>
		{:else}
			<NavCard
				direction="prev"
				href="/ccc/{data.part.slug}"
				eyebrow="← Retour à la partie"
				title={data.part.title}
			/>
		{/if}

		{#if data.nextChapter}
			<NavCard
				direction="next"
				href="/ccc/{data.part.slug}/{data.section.slug}/{data.nextChapter.slug}"
				eyebrow="Premier chapitre →"
				title={data.nextChapter.title}
			/>
		{/if}
	</nav>
</main>
