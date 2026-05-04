<script lang="ts">
	import type { ConcordanceChapter, ConcordancePericope } from '$lib/data/types';
	import type { BookInfo } from '$lib/utils/bibleBookSlug';
	import ConcordanceVerseList from './ConcordanceVerseList.svelte';
	import ConcordancePericopeCard from './ConcordancePericopeCard.svelte';
	import PanelShell from '$lib/components/panels/PanelShell.svelte';

	let {
		book,
		verses,
		chapterData
	}: {
		book: BookInfo;
		verses: { v: number; text: string }[];
		chapterData: ConcordanceChapter;
	} = $props();

	let selectedPericopeRef = $state<string | null>(null);

	$effect(() => {
		// Initialize selection to the first pericope of the chapter on mount.
		if (selectedPericopeRef === null) {
			const first = chapterData.pericopes[0];
			if (first) selectedPericopeRef = first.verseRef;
		}
	});

	function handleSelectPericope(verseRef: string) {
		selectedPericopeRef = verseRef;
	}

	const selectedPericope = $derived<ConcordancePericope | null>(
		selectedPericopeRef === null
			? null
			: (chapterData.pericopes.find((p) => p.verseRef === selectedPericopeRef) ?? null)
	);
</script>

<!-- Desktop: horizontal split-pane. The left list flexes to fill remaining
     space; the right pane is a resizable PanelShell whose width is shared
     with the catechism StudyPanel via the `panelWidth` store. -->
<div class="hidden md:flex flex-1 items-stretch min-h-0">
	<div class="flex-1 min-w-0 flex flex-col">
		<ConcordanceVerseList
			{verses}
			{chapterData}
			{book}
			{selectedPericopeRef}
			onSelectPericope={handleSelectPericope}
		/>
	</div>
	<PanelShell ariaLabel="Détail de la péricope">
		{#snippet title()}
			{#if selectedPericope}
				<span class="text-accent font-semibold tabular-nums text-[13px]">
					{selectedPericope.verseRef}
				</span>
			{/if}
		{/snippet}
		{#snippet children()}
			<div class="flex-1 overflow-y-auto p-md styled-scroll bg-panel">
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
		{/snippet}
	</PanelShell>
</div>

<!-- Mobile: vertical split — pericope cards on top, the selected pericope's
     detail card directly below (no resizable shell on small viewports). -->
<div class="md:hidden flex flex-col flex-1 min-h-0">
	<div class="flex-1 overflow-y-auto border-b border-border styled-scroll">
		<ConcordanceVerseList
			{verses}
			{chapterData}
			{book}
			{selectedPericopeRef}
			onSelectPericope={handleSelectPericope}
		/>
	</div>
	<div class="flex-1 overflow-y-auto p-md styled-scroll bg-panel">
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