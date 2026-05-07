<script lang="ts">
	import type { Chapter, ChapterArticle, ChapterHeading, Paragraph } from '$lib/data/types';
	import { ADJACENT_LABEL } from '$lib/data/types';
	import ParagraphView from './ParagraphView.svelte';
	import EnBrefBlock from './EnBrefBlock.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { SvelteMap } from 'svelte/reactivity';
	let {
		chapter,
		paragraphs,
		enBrefParagraphMap = {}
	}: {
		chapter: Chapter;
		paragraphs: Paragraph[];
		enBrefParagraphMap?: Record<number, Paragraph>;
	} = $props();

	type Insertion =
		| { kind: 'article'; article: ChapterArticle }
		| { kind: 'paragraphe'; paragraphe: { number: number; title: string } }
		| { kind: 'heading'; heading: ChapterHeading };

	// $derived so the maps recompute when the user navigates to a different
	// chapter (the component instance is reused with new `chapter` props).
	// IIFEs only ran once at mount and left these stale — manifested as the
	// chapter's headings + article anchors disappearing on every nav.
	const insertionsByParagraph = $derived.by(() => {
		const map = new SvelteMap<number, Insertion[]>();
		const push = (n: number, ins: Insertion) => {
			const arr = map.get(n) ?? [];
			arr.push(ins);
			map.set(n, arr);
		};
		for (const h of chapter.headings) push(h.paragraph_start, { kind: 'heading', heading: h });
		for (const a of chapter.articles) {
			if (a.paragraphs.length > 0) push(a.paragraphs[0]!, { kind: 'article', article: a });
			for (const pg of a.paragraphes ?? [])
				push(pg.paragraph_start, {
					kind: 'paragraphe',
					paragraphe: { number: pg.number, title: pg.title }
				});
			for (const h of a.headings) push(h.paragraph_start, { kind: 'heading', heading: h });
		}
		return map;
	});

	// First-paragraph-of-en_bref → block; all en_bref paragraph numbers (so we can skip them in the body)
	const enBrefStartMap = $derived.by(() => {
		const map = new SvelteMap<number, { paragraphs: number[] }>();
		for (const block of chapter.en_brefs) {
			if (block.paragraphs.length > 0) map.set(block.paragraphs[0]!, block);
		}
		return map;
	});
	const enBrefAllNumbers = $derived(new Set<number>(chapter.en_brefs.flatMap((b) => b.paragraphs)));

	const chapterLabel = $derived(chapter.number ? `Chapitre ${chapter.number}` : 'Chapitre');
</script>

<main class="mx-auto max-w-4xl px-6 max-md:px-0 py-10" use:scrollSpy>
	<header class="mb-8">
		<nav class="breadcrumb-rail font-ui text-sm mb-4" aria-label="Fil d'Ariane">
			<ol class="space-y-1">
				<li>
					<a href="/ccc" class="text-muted hover:text-accent">Catéchisme</a>
				</li>
				<li class="pl-5">
					<a href="/ccc/{chapter.part_slug}" class="text-muted hover:text-accent">
						<span class="font-semibold bc-kicker">
							{chapter.part_number ? `Partie ${chapter.part_number}` : 'Prologue'}
						</span>
						<span class="bc-title">&nbsp;: {chapter.part_title}</span>
					</a>
				</li>
				<li class="pl-10">
					<a
						href="/ccc/{chapter.part_slug}/{chapter.section_slug}"
						class="text-muted hover:text-accent"
					>
						<span class="font-semibold bc-kicker">
							{chapter.section_number ? `Section ${chapter.section_number}` : 'Section'}
						</span>
						<span class="bc-title">&nbsp;: {chapter.section_title}</span>
					</a>
				</li>
			</ol>
		</nav>
		<p class="font-ui text-sm uppercase tracking-wider text-muted">{chapterLabel}</p>
		<h1 class="font-heading text-4xl font-semibold mt-1 text-heading">{chapter.title}</h1>
	</header>

	{#each paragraphs as p (p.number)}
		{#if enBrefStartMap.has(p.number)}
			{@const block = enBrefStartMap.get(p.number)!}
			{@const records = block.paragraphs
				.map((n) => enBrefParagraphMap[n])
				.filter((x): x is Paragraph => Boolean(x))}
			<EnBrefBlock paragraphs={records} />
		{:else if !enBrefAllNumbers.has(p.number)}
			{#each insertionsByParagraph.get(p.number) ?? [] as ins, i (i)}
				{#if ins.kind === 'article'}
					<h2
						id={ins.article.slug}
						class="font-heading text-3xl font-semibold mt-16 mb-6 pb-2 border-b border-border scroll-mt-24 text-heading"
					>
						{ins.article.number ? `Article ${ins.article.number} — ` : ''}{ins.article.title}
					</h2>
				{:else if ins.kind === 'paragraphe'}
					<h3
						id="paragraphe-{ins.paragraphe.number}"
						class="font-heading text-2xl font-semibold mt-14 mb-5 pb-2 border-b border-border scroll-mt-24 text-heading"
					>
						<span class="font-ui text-[11px] uppercase tracking-[0.18em] text-muted block mb-1">
							Paragraphe {ins.paragraphe.number}
						</span>
						{ins.paragraphe.title}
					</h3>
				{:else if ins.heading.level === 2}
					<h3
						id={ins.heading.id}
						class="font-ui text-xl font-semibold mt-12 mb-4 scroll-mt-24 text-accent"
					>
						{ins.heading.title}
					</h3>
				{:else}
					<h4
						id={ins.heading.id}
						class="font-ui text-lg font-semibold mt-8 mb-3 scroll-mt-24 text-heading"
					>
						{ins.heading.title}
					</h4>
				{/if}
			{/each}
			<ParagraphView paragraph={p} />
		{/if}
	{/each}

	<nav
		class="mt-16 pt-6 border-t border-border flex items-stretch justify-between gap-6 font-ui"
		aria-label="Chapitre précédent ou suivant"
	>
		{#if chapter.prev}
			<NavCard
				direction="prev"
				href={chapter.prev.href}
				eyebrow={ADJACENT_LABEL.prev[chapter.prev.kind]}
				title={chapter.prev.title}
			/>
		{:else}
			<span class="chapter-nav-spacer"></span>
		{/if}
		{#if chapter.next}
			<NavCard
				direction="next"
				href={chapter.next.href}
				eyebrow={ADJACENT_LABEL.next[chapter.next.kind]}
				title={chapter.next.title}
			/>
		{:else}
			<span class="chapter-nav-spacer"></span>
		{/if}
	</nav>
</main>

<style>
	.chapter-nav-spacer {
		flex: 1;
	}
</style>
