<script lang="ts">
	import ConcordanceBar from '$lib/components/bible/concordance/ConcordanceBar.svelte';
	import ConcordanceReader from '$lib/components/bible/concordance/ConcordanceReader.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title
		>{data.book.frenchName} {data.chapter}, concordance du Catéchisme de l'Église Catholique</title
	>
</svelte:head>

<div class="flex flex-col h-screen">
	<ConcordanceBar
		book={data.book}
		chapter={data.chapter}
		totalChapters={data.totalChapters}
		chapterCounts={data.chapterCounts}
		concordanceManifest={data.concordanceManifest}
	/>
	{#if 'missing' in data && data.missing}
		<main class="mx-auto max-w-reader px-6 max-md:px-4 py-16 text-center">
			<p class="font-ui text-xs uppercase tracking-[0.32em] text-muted mb-3">Concordance</p>
			<h1 class="font-heading text-3xl font-semibold mb-4">
				{data.book.frenchName} chapitre {data.chapter}
			</h1>
			<p class="text-subtle italic max-w-prose mx-auto">
				Aucun croisement avec le Catéchisme n'est disponible pour ce chapitre dans la présente
				édition. Choisissez un autre chapitre dans la barre ci-dessus.
			</p>
			<a
				class="inline-block mt-6 font-ui text-xs uppercase tracking-[0.18em] text-accent hover:underline"
				href="/bible/{data.book.slug}/{data.chapter}"
			>
				← Retour au texte
			</a>
		</main>
	{:else}
		<ConcordanceReader book={data.book} verses={data.verses} chapterData={data.chapterData!} />
	{/if}
</div>
