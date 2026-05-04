<script lang="ts">
	import type { ConcordanceChapter } from '$lib/data/types';
	import type { BookInfo } from '$lib/utils/bibleBookSlug';
	import ConcordanceVerseList from './ConcordanceVerseList.svelte';
	import ConcordancePericopePanel from './ConcordancePericopePanel.svelte';

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

	let selectedPericopeRef = $state<string | null>(null);

	$effect(() => {
		// Initialize selection to the first pericope of the chapter on mount.
		if (selectedPericopeRef === null) {
			const first = chapterData.pericopes[0];
			if (first) selectedPericopeRef = first.verseRef;
		}
	});

	function handleSelectPericope(verseRef: string) {
		selectedPericopeRef = verseRef;
	}
</script>

<!-- Desktop: horizontal split-pane -->
<div class="hidden md:flex flex-1 items-stretch min-h-0">
	<div class="border-r border-border flex flex-col" style="width: 50%;">
		<ConcordanceVerseList
			{verses}
			{chapterData}
			{chapter}
			{book}
			{selectedPericopeRef}
			onSelectPericope={handleSelectPericope}
		/>
	</div>
	<div class="flex-1 min-w-0 overflow-hidden">
		<ConcordancePericopePanel {chapterData} {selectedPericopeRef} />
	</div>
</div>

<!-- Mobile: vertical split (pericope cards on top, detail panel below) -->
<div class="md:hidden flex flex-col flex-1 min-h-0">
	<div class="flex-1 overflow-y-auto border-b border-border styled-scroll">
		<ConcordanceVerseList
			{verses}
			{chapterData}
			{chapter}
			{book}
			{selectedPericopeRef}
			onSelectPericope={handleSelectPericope}
		/>
	</div>
	<div class="flex-1 overflow-y-auto styled-scroll">
		<ConcordancePericopePanel {chapterData} {selectedPericopeRef} />
	</div>
</div>
