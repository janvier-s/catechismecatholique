<script lang="ts">
	import CompendiumReader from '$lib/components/compendium/CompendiumReader.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.part.title} · Compendium</title>
</svelte:head>

<CompendiumReader part={data.part} />
