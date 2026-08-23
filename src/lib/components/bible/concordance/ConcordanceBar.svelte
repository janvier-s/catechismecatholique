<script lang="ts">
	import type { BookInfo } from '$lib/utils/bibleBookSlug';
	import ChapterNavBar from '../ChapterNavBar.svelte';

	let {
		book,
		chapter,
		totalChapters,
		chapterCounts = {},
		concordanceManifest = {}
	}: {
		book: BookInfo;
		chapter: number;
		totalChapters: number;
		chapterCounts?: Record<string, number>;
		concordanceManifest?: Record<string, number[]>;
	} = $props();
</script>

<ChapterNavBar
	{book}
	{chapter}
	{totalChapters}
	{chapterCounts}
	{concordanceManifest}
	variant="concordance"
/>
