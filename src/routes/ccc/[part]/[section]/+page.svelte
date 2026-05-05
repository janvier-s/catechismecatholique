<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	// Map paragraph_start → heading so the body loop can insert them inline.
	type IntroHeading = NonNullable<typeof data.section.intro_headings>[number];
	const headingByPara = $derived.by(() => {
		const m = new Map<number, IntroHeading>();
		for (const h of data.section.intro_headings ?? []) m.set(h.paragraph_start, h);
		return m;
	});
</script>

<svelte:head><title>{data.section.title} — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-reader px-6 py-10" use:scrollSpy>
	<nav class="mb-6 font-ui text-sm" aria-label="Fil d'Ariane">
		<ol class="space-y-1">
			<li><a href="/ccc" class="text-muted hover:text-accent">Catéchisme</a></li>
			<li class="pl-5">
				<a href="/ccc/{data.part.slug}" class="text-muted hover:text-accent">
					<span class="font-semibold">
						{data.part.number ? `Partie ${data.part.number} :` : 'Prologue :'}
					</span>
					{data.part.title}
				</a>
			</li>
			<li class="pl-10">
				<span class="font-semibold">
					{data.section.number ? `Section ${data.section.number} :` : 'Section :'}
				</span>
				{data.section.title}
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
			{/if}
			<ParagraphView paragraph={p} />
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
			<a
				class="section-nav-link prev"
				href="/ccc/{data.part.slug}/{data.prevChapter.section_slug}/{data.prevChapter.slug}"
			>
				<span class="section-nav-eyebrow">← Chapitre précédent</span>
				<span class="section-nav-title">{data.prevChapter.title}</span>
			</a>
		{:else}
			<a class="section-nav-link prev" href="/ccc/{data.part.slug}">
				<span class="section-nav-eyebrow">← Retour à la partie</span>
				<span class="section-nav-title">{data.part.title}</span>
			</a>
		{/if}

		{#if data.nextChapter}
			<a
				class="section-nav-link next"
				href="/ccc/{data.part.slug}/{data.section.slug}/{data.nextChapter.slug}"
			>
				<span class="section-nav-eyebrow">Premier chapitre →</span>
				<span class="section-nav-title">{data.nextChapter.title}</span>
			</a>
		{/if}
	</nav>
</main>

<style>
	.section-nav-link {
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
	.section-nav-link:hover {
		border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		color: var(--color-accent-text);
	}
	.section-nav-link.prev {
		text-align: left;
	}
	.section-nav-link.next {
		text-align: right;
	}
	.section-nav-eyebrow {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-muted);
	}
	.section-nav-title {
		font-family: var(--font-heading);
		font-size: 15px;
		line-height: 1.3;
		color: var(--color-fg);
	}
	.section-nav-link:hover .section-nav-title {
		color: var(--color-accent-text);
	}
</style>
