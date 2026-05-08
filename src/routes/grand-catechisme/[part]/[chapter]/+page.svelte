<script lang="ts">
	import PiusXGrandReader from '$lib/components/pius-x-grand/PiusXGrandReader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.chapter.title} · Grand Catéchisme</title>
</svelte:head>

<PiusXGrandReader chapter={data.chapter} />
