<script lang="ts">
	import CCCReader from '$lib/components/ccc/CCCReader.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.chapter.title} — Catéchisme</title>
</svelte:head>

<CCCReader
	chapter={data.chapter}
	paragraphs={data.paragraphs}
	enBrefParagraphMap={data.enBrefParagraphMap}
/>
