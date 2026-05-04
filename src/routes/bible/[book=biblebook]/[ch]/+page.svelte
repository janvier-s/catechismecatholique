<script lang="ts">
	import BibleReader from '$lib/components/bible/BibleReader.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.book.frenchName} {data.chapter} — Bible</title></svelte:head>

<BibleReader
	book={data.book}
	chapter={data.chapter}
	verses={data.verses}
	verseIdx={data.verseIdx}
	hasConcordance={data.hasConcordance}
	totalChapters={data.totalChapters}
	sections={data.sections}
	chapterCounts={data.chapterCounts}
/>
