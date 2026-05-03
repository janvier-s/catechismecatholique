<script lang="ts">
	import VerseMarker from './VerseMarker.svelte';
	import type { BibleVerseIndex } from '$lib/data/types';

	let {
		bookSlug,
		bookUsfx,
		chapter,
		verses,
		verseIdx,
		dimNonCited = false
	}: {
		bookSlug: string;
		bookUsfx: string;
		chapter: number;
		verses: { v: number; text: string }[];
		verseIdx: BibleVerseIndex;
		dimNonCited?: boolean;
	} = $props();

	function citedCount(v: number): number {
		const arr = verseIdx[bookUsfx]?.[String(chapter)]?.[String(v)];
		return arr ? arr.length : 0;
	}
</script>

<p class="chapter-prose font-body text-[19px] leading-[1.7]">
	{#each verses as v (v.v)}{@const c = citedCount(v.v)}<span
			class="verse-run"
			class:dim={dimNonCited && c === 0}
			id="v{v.v}"
			><sup
				class="verse-num font-ui text-[0.65em] font-semibold text-accent tabular-nums mr-1 align-baseline"
				>{v.v}</sup
			>{v.text}{#if c > 0}<VerseMarker
					{bookSlug}
					{bookUsfx}
					{chapter}
					verse={v.v}
					count={c}
				/>{/if}{' '}</span
		>{/each}
</p>

<style>
	.chapter-prose {
		text-align: justify;
		text-justify: inter-word;
		hyphens: auto;
	}
	.verse-run.dim {
		opacity: 0.35;
		transition: opacity 150ms ease;
	}
</style>
