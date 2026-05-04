<script lang="ts">
	import ConcordanceBar from '$lib/components/bible/concordance/ConcordanceBar.svelte';
	import ConcordanceReader from '$lib/components/bible/concordance/ConcordanceReader.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.book.frenchName} {data.chapter} — Concordance</title>
</svelte:head>

<div class="flex flex-col h-screen">
	<ConcordanceBar book={data.book} chapter={data.chapter} totalChapters={data.totalChapters} />
	<ConcordanceReader
		book={data.book}
		chapter={data.chapter}
		verses={data.verses}
		chapterData={data.chapterData}
	/>
</div>
