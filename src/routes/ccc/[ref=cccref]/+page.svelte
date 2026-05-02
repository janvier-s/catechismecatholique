<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	{#if data.kind === 'paragraph'}
		<title>§ {data.paragraph.number} — Catéchisme</title>
	{:else}
		<title>§ {data.from}–{data.to} — Catéchisme</title>
	{/if}
</svelte:head>

<main class="mx-auto max-w-reader px-6 py-12">
	{#if data.kind === 'paragraph'}
		<ParagraphView paragraph={data.paragraph} />
	{:else}
		{#each data.paragraphs as p (p.number)}
			<ParagraphView paragraph={p} />
		{/each}
	{/if}
</main>
