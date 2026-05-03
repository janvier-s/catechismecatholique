<script lang="ts">
	import ChapterView from './ChapterView.svelte';
	import ChapterFilterBar from './ChapterFilterBar.svelte';
	import type { BibleVerseIndex } from '$lib/data/types';
	import type { BookInfo } from '$lib/utils/bibleBookSlug';

	let {
		book,
		chapter,
		verses,
		verseIdx,
		totalChapters
	}: {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		verseIdx: BibleVerseIndex;
		totalChapters: number;
	} = $props();

	let dimNonCited = $state(false);

	const prevHref = $derived(chapter > 1 ? `/bible/${book.slug}/${chapter - 1}` : null);
	const nextHref = $derived(chapter < totalChapters ? `/bible/${book.slug}/${chapter + 1}` : null);

	const citedCount = $derived(
		verses.reduce(
			(t, v) => t + (verseIdx[book.usfx]?.[String(chapter)]?.[String(v.v)]?.length ? 1 : 0),
			0
		)
	);
</script>

<main class="mx-auto max-w-reader px-6 py-10">
	<nav class="mb-6 font-ui text-sm">
		<a href="/bible" class="text-muted hover:text-accent">Bible</a>
		<span class="mx-2 text-subtle">›</span>
		<a href="/bible/{book.slug}" class="text-muted hover:text-accent">{book.frenchName}</a>
		<span class="mx-2 text-subtle">›</span>
		<span class="font-semibold">Chapitre {chapter}</span>
	</nav>

	<header
		class="mb-6 sticky top-[80px] bg-background/95 backdrop-blur z-10 py-2 border-b border-border flex items-baseline gap-4"
	>
		<h1 class="font-heading text-4xl font-semibold">
			{book.frenchName}
			<span class="text-muted font-normal">{chapter}</span>
		</h1>
		<span class="ml-auto font-ui text-xs text-muted tabular-nums">
			{citedCount}/{verses.length} versets cités
		</span>
	</header>

	<ChapterFilterBar bind:dimNonCited {citedCount} />

	<ChapterView
		bookSlug={book.slug}
		bookUsfx={book.usfx}
		{chapter}
		{verses}
		{verseIdx}
		{dimNonCited}
	/>

	<nav class="mt-12 flex justify-between font-ui text-sm">
		{#if prevHref}
			<a href={prevHref} class="text-accent hover:underline">← Chapitre {chapter - 1}</a>
		{:else}<span></span>{/if}
		{#if nextHref}
			<a href={nextHref} class="text-accent hover:underline">Chapitre {chapter + 1} →</a>
		{:else}<span></span>{/if}
	</nav>
</main>
