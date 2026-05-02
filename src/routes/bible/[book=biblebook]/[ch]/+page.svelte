<script lang="ts">
	import VerseList from '$lib/components/bible/VerseList.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.book.frenchName} {data.chapter} — Bible</title></svelte:head>

<main class="mx-auto max-w-3xl px-6 py-10">
	<nav class="mb-6 font-ui text-sm">
		<a href="/bible" class="text-muted hover:text-accent">Bible</a>
		<span class="mx-2 text-subtle">›</span>
		<a href="/bible/{data.book.slug}" class="text-muted hover:text-accent">{data.book.frenchName}</a>
		<span class="mx-2 text-subtle">›</span>
		<span class="font-semibold">Chapitre {data.chapter}</span>
	</nav>
	<h1 class="font-ui text-3xl font-bold mb-8">
		{data.book.frenchName}
		{data.chapter}
	</h1>
	<VerseList bookSlug={data.book.slug} chapter={data.chapter} verses={data.verses} />
</main>
