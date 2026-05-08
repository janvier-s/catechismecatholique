<script lang="ts">
	import TrentChapterReader from '$lib/components/trent/TrentChapterReader.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.chapter.title} · Catéchisme de Trente</title>
</svelte:head>

<TrentChapterReader chapter={data.chapter} sections={data.sections} />
