<script lang="ts">
	import BibleReader from '$lib/components/bible/BibleReader.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<BibleReader
	book={data.book}
	chapter={data.chapter}
	verses={data.verses}
	verseIdx={data.verseIdx}
	totalChapters={data.totalChapters}
	sectionsByBook={data.sectionsByBook}
	concordanceManifest={data.concordanceManifest}
	chapterCounts={data.chapterCounts}
	paragraphs={data.paragraphs}
/>
