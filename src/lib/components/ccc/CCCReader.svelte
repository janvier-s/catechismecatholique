<script lang="ts">
	import type { Chapter, ChapterArticle, ChapterHeading, Paragraph } from '$lib/data/types';
	import ParagraphView from './ParagraphView.svelte';
	import EnBrefBlock from './EnBrefBlock.svelte';
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
		| { kind: 'heading'; heading: ChapterHeading };

	const insertionsByParagraph = (() => {
		const map = new Map<number, Insertion[]>();
		const push = (n: number, ins: Insertion) => {
			const arr = map.get(n) ?? [];
			arr.push(ins);
			map.set(n, arr);
		};
		for (const h of chapter.headings) push(h.paragraph_start, { kind: 'heading', heading: h });
		for (const a of chapter.articles) {
			if (a.paragraphs.length > 0) push(a.paragraphs[0]!, { kind: 'article', article: a });
			for (const h of a.headings) push(h.paragraph_start, { kind: 'heading', heading: h });
		}
		return map;
	})();

	// First-paragraph-of-en_bref → block; all en_bref paragraph numbers (so we can skip them in the body)
	const enBrefStartMap = (() => {
		const map = new Map<number, { paragraphs: number[] }>();
		for (const block of chapter.en_brefs) {
			if (block.paragraphs.length > 0) map.set(block.paragraphs[0]!, block);
		}
		return map;
	})();
	const enBrefAllNumbers = $derived(new Set<number>(chapter.en_brefs.flatMap((b) => b.paragraphs)));

	const chapterLabel = $derived(chapter.number ? `Chapitre ${chapter.number}` : 'Chapitre');
</script>

<main class="mx-auto max-w-4xl px-6 py-10">
	<header class="mb-8">
		<nav class="font-ui text-sm mb-4" aria-label="Fil d'Ariane">
			<ol class="space-y-1">
				<li>
					<a href="/ccc" class="text-muted hover:text-accent">Catéchisme</a>
				</li>
				<li class="pl-5">
					<a href="/ccc/{chapter.part_slug}" class="text-muted hover:text-accent">
						<span class="font-semibold">
							{chapter.part_number ? `Partie ${chapter.part_number}` : 'Prologue'}{' :'}
						</span>
						{chapter.part_title}
					</a>
				</li>
				<li class="pl-10">
					<a
						href="/ccc/{chapter.part_slug}/{chapter.section_slug}"
						class="text-muted hover:text-accent"
					>
						<span class="font-semibold">
							{chapter.section_number ? `Section ${chapter.section_number}` : 'Section'}{' :'}
						</span>
						{chapter.section_title}
					</a>
				</li>
			</ol>
		</nav>
		<p class="font-ui text-sm uppercase tracking-wider text-muted">{chapterLabel}</p>
		<h1 class="font-ui text-3xl font-bold mt-1 text-heading">{chapter.title}</h1>
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
						class="font-ui text-2xl font-bold mt-16 mb-6 pb-2 border-b border-border scroll-mt-24 text-heading"
					>
						{ins.article.number ? `Article ${ins.article.number} — ` : ''}{ins.article.title}
					</h2>
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

	<nav class="mt-12 flex justify-between font-ui text-sm">
		{#if chapter.prev}
			<a
				href="/ccc/{chapter.part_slug}/{chapter.section_slug}/{chapter.prev.slug}"
				class="text-accent hover:underline">← {chapter.prev.title}</a
			>
		{:else}<span></span>{/if}
		{#if chapter.next}
			<a
				href="/ccc/{chapter.part_slug}/{chapter.section_slug}/{chapter.next.slug}"
				class="text-accent hover:underline">{chapter.next.title} →</a
			>
		{:else}<span></span>{/if}
	</nav>
</main>
