<script lang="ts">
	import type { ConcordancePericope } from '$lib/data/types';
	import { pluralFr } from '$lib/utils/i18n';

	let { pericope }: { pericope: ConcordancePericope } = $props();

	const cccCount = $derived(pericope.cccRanges.reduce((t, r) => t + (r.to - r.from + 1), 0));

	function rangeLabel(from: number, to: number): string {
		return from === to ? String(from) : `${from}-${to}`;
	}
	function rangeHref(from: number, to: number): string {
		return from === to ? `/ccc/${from}` : `/ccc/${from}-${to}`;
	}
</script>

<div class="pericope-detail">
	<!-- Header: pericope range + optional title -->
	<header class="mb-4">
		<div class="font-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
			{pericope.verseRef}
		</div>
		{#if pericope.pericopeTitle}
			<h3 class="font-heading text-[18px] leading-snug text-foreground mt-1.5">
				{pericope.pericopeTitle}
			</h3>
		{/if}
		{#if pericope.pericopeCrossRefs}
			<p class="font-body text-[12px] text-subtle mt-1 leading-snug">
				{pericope.pericopeCrossRefs}
			</p>
		{/if}
	</header>

	<!-- Caption line: N paragraphes du Catéchisme cités par cette péricope -->
	{#if cccCount > 0}
		<div class="font-ui text-xs text-muted mb-3">
			{cccCount}
			{pluralFr(cccCount, 'paragraphe')} du Catéchisme cités par cette péricope
		</div>

		<!-- Plain inline list of paragraph numbers (no chips, no border) -->
		<div class="font-ui text-[15px] leading-relaxed flex flex-wrap gap-x-3 gap-y-1">
			{#each pericope.cccRanges as r (`${r.from}-${r.to}`)}
				<a
					href={rangeHref(r.from, r.to)}
					class="text-accent tabular-nums hover:underline whitespace-nowrap"
				>
					{rangeLabel(r.from, r.to)}
				</a>
			{/each}
		</div>
	{:else}
		<p class="font-ui text-xs italic text-subtle">
			Aucun paragraphe du Catéchisme pour cette péricope.
		</p>
	{/if}
</div>

<style>
	.pericope-detail {
		padding: 0.25rem 0.25rem 0.5rem;
	}
</style>
