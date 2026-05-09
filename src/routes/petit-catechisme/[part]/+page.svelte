<script lang="ts">
	import PiusXPetitPartReader from '$lib/components/pius-x-petit/PiusXPetitPartReader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.part.title} · Petit Catéchisme</title>
</svelte:head>

<PiusXPetitPartReader
	part={data.part}
	chapters={data.chapters}
	prevPart={data.prevPart}
	nextPart={data.nextPart}
/>
