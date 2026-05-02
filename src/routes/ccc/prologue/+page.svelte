<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Prologue — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-reader px-6 py-12">
	<h1 class="font-heading text-5xl font-semibold mb-10">Prologue</h1>
	{#each data.paragraphs as p (p.number)}
		<ParagraphView paragraph={p} />
	{/each}

	<nav class="mt-16 flex justify-end font-ui text-sm border-t border-border pt-6">
		<a href="/ccc/la-profession-de-la-foi" class="text-accent hover:underline">
			Partie 1 : La profession de la foi →
		</a>
	</nav>
</main>
