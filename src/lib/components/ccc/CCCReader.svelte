<script lang="ts">
	import type { Chapter, Paragraph, EnBrefBlock as EBT } from '$lib/data/types';
	import ChapterOutline from './ChapterOutline.svelte';
	import ParagraphView from './ParagraphView.svelte';
	import EnBrefBlock from './EnBrefBlock.svelte';
	let {
		chapter,
		paragraphs,
		enBref = null
	}: { chapter: Chapter; paragraphs: Paragraph[]; enBref?: EBT | null } = $props();
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
			<h1 class="font-ui text-3xl font-bold mt-1">{chapter.title}</h1>
		</header>

		{#each paragraphs as p (p.number)}
			{@const h = chapter.headings.find((hh) => hh.paragraph_start === p.number)}
			{#if h}
				<h2 id={h.id} class="font-ui text-xl font-semibold mt-12 mb-4 scroll-mt-24">{h.title}</h2>
			{/if}
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
