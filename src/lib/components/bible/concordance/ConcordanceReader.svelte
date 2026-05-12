<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
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

	// No pre-selection · the chapter lands with the verse list visible
	// only; the detail card opens on first user click.
	let selectedPericopeRef = $state<string | null>(null);

	function handleSelectPericope(verseRef: string) {
		selectedPericopeRef = verseRef;
	}
	function clearSelection() {
		selectedPericopeRef = null;
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
		<div class="flex-1 overflow-y-auto px-6 py-6 styled-scroll bg-panel">
			{#if chapterData.pericopes.length === 0}
				<div class="p-6 text-center text-subtle text-[14px]">
					<p>Aucune référence de concordance pour ce chapitre.</p>
				</div>
			{:else if selectedPericope === null}
				<div class="p-6 text-center text-subtle text-[14px]">
					<p>Sélectionnez une péricope.</p>
				</div>
			{:else}
				<ConcordancePericopeCard pericope={selectedPericope} />
			{/if}
		</div>
	</PanelShell>
</div>

<!-- Mobile: verse list takes the full surface until a pericope is
     chosen; the detail card then slides up from the bottom as a sheet
     with an X to close. -->
<div class="md:hidden flex flex-col flex-1 min-h-0 relative">
	<div class="flex-1 overflow-y-auto styled-scroll">
		<ConcordanceVerseList
			{verses}
			{chapterData}
			{book}
			{selectedPericopeRef}
			onSelectPericope={handleSelectPericope}
		/>
	</div>
	{#if selectedPericope}
		<div
			class="absolute inset-x-0 bottom-0 top-[40%] bg-panel border-t border-border flex flex-col shadow-[0_-12px_24px_-20px_rgba(0,0,0,0.25)]"
			role="dialog"
			aria-label="Péricope sélectionnée"
			transition:fly={{ y: 320, duration: 220, easing: cubicOut, opacity: 1 }}
		>
			<header class="flex items-center justify-between px-4 py-2 border-b border-border">
				<span class="font-ui text-[13px] font-semibold text-accent tabular-nums">
					{selectedPericope.verseRef}
				</span>
				<button
					type="button"
					class="w-9 h-9 inline-flex items-center justify-center text-muted hover:text-accent rounded"
					aria-label="Fermer le détail de la péricope"
					onclick={clearSelection}
				>
					<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
						<path
							d="M5 5l14 14M19 5L5 19"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</header>
			<div class="flex-1 overflow-y-auto px-5 py-4 styled-scroll">
				<ConcordancePericopeCard pericope={selectedPericope} />
			</div>
		</div>
	{/if}
</div>
