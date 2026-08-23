<script lang="ts">
	import ChapterNavBar from './ChapterNavBar.svelte';
	import BibleChapter from './BibleChapter.svelte';
	import type { BibleVerseIndex, NclChapterBlocks, NclSectionMap } from '$lib/data/types';
	import { type BookInfo } from '$lib/utils/bibleBookSlug';
	import { prefs } from '$lib/stores/prefs';

	let {
		book,
		chapter,
		verses,
		verseIdx,
		totalChapters,
		sectionsByBook = {},
		concordanceManifest = {},
		chapterCounts = {},
		paragraphs = null
	}: {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		verseIdx: BibleVerseIndex;
		totalChapters: number;
		sectionsByBook?: NclSectionMap;
		concordanceManifest?: Record<string, number[]>;
		chapterCounts?: Record<string, number>;
		paragraphs?: NclChapterBlocks | null;
	} = $props();

	const bookSections = $derived(sectionsByBook[book.usfx] ?? []);
	const hasConcordance = $derived((concordanceManifest[book.slug] ?? []).includes(chapter));

	// Follows the pref alone. Citation count affects only whether the control
	// is disabled, never the layout attribute, because data-study-mode drives
	// the column-width compensation in app.css.
	const studyMode = $derived($prefs.bibleStudyMode);

	const prevHref = $derived(chapter > 1 ? `/bible/${book.slug}/${chapter - 1}` : null);
	const nextHref = $derived(chapter < totalChapters ? `/bible/${book.slug}/${chapter + 1}` : null);

	function citedCount(v: number): number {
		const arr = verseIdx[book.usfx]?.[String(chapter)]?.[String(v)];
		return arr ? arr.length : 0;
	}

	const totalCited = $derived(verses.reduce((t, v) => t + (citedCount(v.v) > 0 ? 1 : 0), 0));
</script>

<svelte:head>
	<title>{book.frenchName} {chapter} dans la Bible · Catéchisme de l'Église Catholique</title>
</svelte:head>

<!-- Chapter navigation bar · sticky below the global TopBar. Optional: readers
     who navigate by scrolling can reclaim the row. The concordance route has
     its own bar and is deliberately unaffected. -->
{#if !$prefs.hideChapterNav}
	<ChapterNavBar
		{book}
		{chapter}
		{totalChapters}
		{chapterCounts}
		{hasConcordance}
		citedVerseCount={totalCited}
		variant="reader"
	/>
{/if}

<main
	class="mx-auto max-w-reader px-6 max-md:px-4 pt-8 max-md:pt-5 pb-16"
	data-corpus="bible"
	data-bible-layout={$prefs.bibleLayout}
	data-study-mode={studyMode}
>
	<BibleChapter
		{book}
		{chapter}
		{verses}
		{verseIdx}
		sections={bookSections}
		{paragraphs}
		{studyMode}
		headingLevel="h1"
	/>

	<nav
		class="mt-16 pt-8 border-t border-border flex justify-between font-ui text-sm"
		aria-label="Chapitre précédent ou suivant"
	>
		{#if prevHref}
			<a href={prevHref} class="text-accent hover:underline whitespace-nowrap"
				>← Chapitre {chapter - 1}</a
			>
		{:else}<span></span>{/if}
		{#if nextHref}
			<a href={nextHref} class="text-accent hover:underline whitespace-nowrap"
				>Chapitre {chapter + 1} →</a
			>
		{:else}<span></span>{/if}
	</nav>
</main>

<style>
	/* Gap between stacked chapters, as a *bottom* margin on all but the last.
	   Deliberately not a top margin on all but the first: pruning a chapter off
	   the front would then change the surviving first chapter's box height, and
	   the scroll compensation would have to carry a magic constant to match
	   (ODR's BibleReader.svelte:214 does exactly that). Bottom margins keep
	   front-pruning purely subtractive. Back-pruning changes the last element
	   instead, and anything below the viewport cannot move the text above it. */
	main :global([data-chapter-section]:not(:last-of-type)) {
		margin-bottom: 3rem;
	}
</style>
