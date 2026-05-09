<script lang="ts">
	import PiusXPetitChapterReader from '$lib/components/pius-x-petit/PiusXPetitChapterReader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.chapter.title} · Petit Catéchisme</title>
</svelte:head>

<PiusXPetitChapterReader chapter={data.chapter} />
