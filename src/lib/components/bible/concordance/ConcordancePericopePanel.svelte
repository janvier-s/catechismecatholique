<script lang="ts">
	import { tick } from 'svelte';
	import type { ConcordanceChapter } from '$lib/data/types';
	import ConcordancePericopeCard from './ConcordancePericopeCard.svelte';

	let {
		chapterData,
		selectedVerse,
		selectedPericope
	}: {
		chapterData: ConcordanceChapter;
		selectedVerse: number | null;
		selectedPericope: string | null;
	} = $props();

	let scrollContainer = $state<HTMLElement | null>(null);

	$effect(() => {
		if (selectedVerse !== null) scrollToVerse(selectedVerse);
	});

	$effect(() => {
		if (selectedPericope !== null) scrollToPericopeRef(selectedPericope);
	});

	async function scrollToEl(el: HTMLElement | null) {
		if (!el || !scrollContainer) return;
		const containerTop = scrollContainer.getBoundingClientRect().top;
		const elTop = el.getBoundingClientRect().top;
		const offset = elTop - containerTop + scrollContainer.scrollTop;
		scrollContainer.scrollTo({ top: offset, behavior: 'smooth' });
	}

	async function scrollToVerse(verse: number) {
		await tick();
		if (!scrollContainer) return;
		const idx = chapterData.pericopes.findIndex(
			(p) => verse >= p.startVerse && verse <= p.endVerse
		);
		if (idx < 0) return;
		const el = scrollContainer.querySelector(`[data-pericope-idx="${idx}"]`) as HTMLElement | null;
		scrollToEl(el);
	}

	async function scrollToPericopeRef(verseRef: string) {
		await tick();
		if (!scrollContainer) return;
		const el = scrollContainer.querySelector(
			`[data-pericope-ref="${CSS.escape(verseRef)}"]`
		) as HTMLElement | null;
		scrollToEl(el);
	}

	function pericopeHighlighted(p: { startVerse: number; endVerse: number; verseRef: string }) {
		if (selectedVerse !== null && selectedVerse >= p.startVerse && selectedVerse <= p.endVerse) {
			return true;
		}
		if (selectedPericope === p.verseRef) return true;
		return false;
	}
</script>

<div class="flex flex-col h-full overflow-hidden">
	<div class="flex-1 overflow-y-auto" bind:this={scrollContainer}>
		{#if chapterData.pericopes.length === 0}
			<div class="p-lg text-center text-subtle text-[14px]">
				<p>Aucune référence de concordance pour ce chapitre.</p>
			</div>
		{:else}
			{#each chapterData.pericopes as pericope, i (i)}
				<div
					class="border-b border-border/50 last:border-b-0 p-3"
					data-pericope-ref={pericope.verseRef}
					data-pericope-idx={i}
				>
					<ConcordancePericopeCard {pericope} highlighted={pericopeHighlighted(pericope)} />
				</div>
			{/each}
		{/if}
	</div>
</div>
