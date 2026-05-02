<script lang="ts">
	import type {
		Chapter,
		ChapterArticle,
		ChapterHeading,
		Paragraph,
		EnBrefBlock as EBT
	} from '$lib/data/types';
	import ChapterOutline from './ChapterOutline.svelte';
	import ParagraphView from './ParagraphView.svelte';
	import EnBrefBlock from './EnBrefBlock.svelte';
	let {
		chapter,
		paragraphs,
		enBref = null
	}: { chapter: Chapter; paragraphs: Paragraph[]; enBref?: EBT | null } = $props();

	// Build a per-paragraph-number lookup of "things to render before this paragraph":
	//   - article title (when paragraph_start is the first paragraph of an article)
	//   - chapter heading (level 2)
	//   - article heading (level 2 inside an article)
	//   - sub_heading (level 3)
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
		// Chapter-level headings (only used for chapters that don't have articles)
		for (const h of chapter.headings) push(h.paragraph_start, { kind: 'heading', heading: h });
		// Article titles + their headings
		for (const a of chapter.articles) {
			if (a.paragraphs.length > 0) push(a.paragraphs[0]!, { kind: 'article', article: a });
			for (const h of a.headings) push(h.paragraph_start, { kind: 'heading', heading: h });
		}
		return map;
	})();
</script>

<div class="mx-auto max-w-7xl px-6 py-10 grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-10">
	<aside class="hidden lg:block">
		<div class="sticky top-24">
			<ChapterOutline {chapter} />
		</div>
	</aside>

	<main>
		<header class="mb-8">
			<p class="font-ui text-sm uppercase tracking-wider text-muted">Chapitre</p>
			<h1 class="font-ui text-3xl font-bold mt-1 text-heading">{chapter.title}</h1>
		</header>

		{#each paragraphs as p (p.number)}
			{#each insertionsByParagraph.get(p.number) ?? [] as ins, i (i)}
				{#if ins.kind === 'article'}
					<h2
						id={ins.article.slug}
						class="font-ui text-2xl font-bold mt-16 mb-6 pb-2 border-b border-border scroll-mt-24 text-heading"
					>
						{ins.article.title}
					</h2>
				{:else if ins.heading.level === 2}
					<h3
						id={ins.heading.id}
						class="font-ui text-xl font-semibold mt-12 mb-4 scroll-mt-24 text-heading"
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
		{/each}

		{#if enBref}
			<EnBrefBlock {enBref} />
		{/if}

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
</div>
