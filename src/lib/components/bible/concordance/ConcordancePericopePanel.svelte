<script lang="ts">
	import type { ConcordanceChapter, ConcordancePericope } from '$lib/data/types';
	import ConcordancePericopeCard from './ConcordancePericopeCard.svelte';

	let {
		chapterData,
		selectedPericopeRef
	}: {
		chapterData: ConcordanceChapter;
		selectedPericopeRef: string | null;
	} = $props();

	const selectedPericope = $derived<ConcordancePericope | null>(
		selectedPericopeRef === null
			? null
			: (chapterData.pericopes.find((p) => p.verseRef === selectedPericopeRef) ?? null)
	);
</script>

<div class="flex flex-col h-full overflow-hidden">
	<div class="flex-1 overflow-y-auto p-md">
		{#if chapterData.pericopes.length === 0}
			<div class="p-lg text-center text-subtle text-[14px]">
				<p>Aucune référence de concordance pour ce chapitre.</p>
			</div>
		{:else if selectedPericope === null}
			<div class="p-lg text-center text-subtle text-[14px]">
				<p>Sélectionnez une péricope.</p>
			</div>
		{:else}
			<ConcordancePericopeCard pericope={selectedPericope} highlighted={true} />
		{/if}
	</div>
</div>
