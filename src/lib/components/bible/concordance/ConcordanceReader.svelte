<script lang="ts">
	import type { ConcordanceChapter } from '$lib/data/types';
	import type { BookInfo } from '$lib/utils/bibleBookSlug';
	import ConcordanceVerseList from './ConcordanceVerseList.svelte';
	import ConcordancePericopePanel from './ConcordancePericopePanel.svelte';

	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- `book` reserved for future use (breadcrumbs, schema refs)
	let {
		book,
		chapter,
		verses,
		chapterData
	}: {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		chapterData: ConcordanceChapter;
	} = $props();

	let selectedVerse = $state<number | null>(null);
	let selectedPericope = $state<string | null>(null);

	function handleSelectVerse(v: number) {
		selectedVerse = selectedVerse === v ? null : v;
		selectedPericope = null;
	}

	function handleSelectPericope(verseRef: string) {
		selectedPericope = verseRef;
		selectedVerse = null;
	}
</script>

<!-- Desktop: horizontal split-pane -->
<div class="hidden md:flex flex-1 items-stretch min-h-0">
	<div class="border-r border-border flex flex-col" style="width: 50%;">
		<ConcordanceVerseList
			{verses}
			{chapterData}
			{chapter}
			{selectedVerse}
			onSelectVerse={handleSelectVerse}
			onSelectPericope={handleSelectPericope}
		/>
	</div>
	<div class="flex-1 min-w-0 overflow-hidden">
		<ConcordancePericopePanel
			{chapterData}
			{selectedVerse}
			{selectedPericope}
		/>
	</div>
</div>

<!-- Mobile: vertical split (verse list on top, pericope panel below) -->
<div class="md:hidden flex flex-col flex-1 min-h-0">
	<div class="flex-1 overflow-y-auto border-b border-border">
		<ConcordanceVerseList
			{verses}
			{chapterData}
			{chapter}
			{selectedVerse}
			onSelectVerse={handleSelectVerse}
			onSelectPericope={handleSelectPericope}
		/>
	</div>
	<div class="flex-1 overflow-y-auto">
		<ConcordancePericopePanel
			{chapterData}
			{selectedVerse}
			{selectedPericope}
		/>
	</div>
</div>
