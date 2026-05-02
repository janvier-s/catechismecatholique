<script lang="ts">
	import BookGrid from '$lib/components/bible/BookGrid.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Bible — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-4xl px-6 py-12">
	<h1 class="font-heading text-5xl font-semibold mb-4">Recherche biblique</h1>
	<p class="text-muted mb-10">
		Choisissez un livre pour voir les paragraphes du Catéchisme qui le citent.
	</p>

	<h2 class="font-ui text-xl font-semibold mb-3">Ancien Testament</h2>
	<BookGrid books={data.ot} />

	<h2 class="font-ui text-xl font-semibold mt-10 mb-3">Nouveau Testament</h2>
	<BookGrid books={data.nt} />
</main>
