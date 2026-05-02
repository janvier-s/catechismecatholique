<script lang="ts">
	import ChapterGrid from '$lib/components/bible/ChapterGrid.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.book.frenchName} — Bible</title></svelte:head>

<main class="mx-auto max-w-4xl px-6 py-10">
	<nav class="mb-6 font-ui text-sm">
		<a href="/bible" class="text-muted hover:text-accent">Bible</a>
		<span class="mx-2 text-subtle">›</span>
		<span class="font-semibold">{data.book.frenchName}</span>
	</nav>
	<h1 class="font-heading text-5xl font-semibold mb-8">{data.book.frenchName}</h1>
	<ChapterGrid bookSlug={data.book.slug} chapters={data.chapters} />
</main>
