<script lang="ts">
	import ReadableUnit from '$lib/components/cec/ReadableUnit.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head
	><title
		>{data.book.frenchName}
		{data.chapter}, {data.verse} · Bible · Catéchisme de l'Église Catholique</title
	></svelte:head
>

<main class="mx-auto max-w-reader px-6 py-10">
	<nav class="mb-6 font-ui text-sm" aria-label="Fil d'Ariane">
		<a href="/bible" class="text-muted hover:text-accent">Bible</a>
		<span class="mx-2 text-subtle">›</span>
		<a href="/bible/{data.book.slug}" class="text-muted hover:text-accent">{data.book.frenchName}</a
		>
		<span class="mx-2 text-subtle">›</span>
		<a href="/bible/{data.book.slug}/{data.chapter}" class="text-muted hover:text-accent">
			Chapitre {data.chapter}
		</a>
		<span class="mx-2 text-subtle">›</span>
		<span class="font-semibold">Verset {data.verse}</span>
	</nav>
	<h1 class="font-heading text-4xl font-semibold mb-2">
		{data.book.frenchName}
		{data.chapter}, {data.verse}
	</h1>
	<blockquote class="border-l-4 border-accent pl-4 my-6 italic text-lg">
		{data.text}
	</blockquote>

	<h2 class="font-ui text-sm uppercase tracking-wider text-muted mt-10 mb-4">
		Paragraphes du Catéchisme citant ce verset ({data.paragraphs.length})
	</h2>
	{#if data.paragraphs.length === 0}
		<p class="text-muted italic">Aucun paragraphe.</p>
	{:else}
		{#each data.paragraphs as p (p.number)}
			<ReadableUnit unit={{ kind: 'ccc-paragraph', data: p }} />
		{/each}
	{/if}
</main>
