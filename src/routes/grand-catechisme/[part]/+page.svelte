<script lang="ts">
	import PiusXGrandPartReader from '$lib/components/pius-x-grand/PiusXGrandPartReader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.part.title} · Grand Catéchisme</title>
</svelte:head>

<PiusXGrandPartReader
	part={data.part}
	chapters={data.chapters}
	prevPart={data.prevPart}
	nextPart={data.nextPart}
/>
