<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Prologue — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-reader px-6 py-12">
	<h1 class="font-ui text-4xl font-bold mb-10">Prologue</h1>
	{#each data.paragraphs as p (p.number)}
		<ParagraphView paragraph={p} />
	{/each}
</main>
