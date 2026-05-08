<script lang="ts">
	import type { ConcordancePericope } from '$lib/data/types';
	import { pluralFr } from '$lib/utils/i18n';

	let { pericope }: { pericope: ConcordancePericope } = $props();

	const cccCount = $derived(pericope.cccRanges.reduce((t, r) => t + (r.to - r.from + 1), 0));

	function rangeLabel(from: number, to: number): string {
		return from === to ? String(from) : `${from}-${to}`;
	}
	function rangeHref(from: number, to: number): string {
		return from === to ? `/cec/${from}` : `/cec/${from}-${to}`;
	}
</script>

<div class="pericope-detail" data-pericope-ref={pericope.verseRef}>
	<!-- Optional pericope title.
	     The verseRef is already shown in the sticky PanelShell header,
	     so we don't repeat it here. -->
	{#if pericope.pericopeTitle}
		<h3 class="font-heading text-[20px] font-semibold leading-snug text-foreground">
			{pericope.pericopeTitle}
		</h3>
	{/if}

	<!-- Caption line: N paragraphes du Catéchisme se rapport(e|ent) à ce passage -->
	{#if cccCount > 0}
		<div class="font-ui text-xs text-muted {pericope.pericopeTitle ? 'mt-5' : ''} mb-4">
			<span class="font-semibold text-accent tabular-nums">{cccCount}</span>
			{pluralFr(cccCount, 'paragraphe')} du Catéchisme {cccCount === 1
				? 'se rapporte'
				: 'se rapportent'} à ce passage
		</div>

		<!-- Plain inline list of paragraph numbers (no chips, no border).
		     UI font keeps it visually grouped with surrounding metadata. -->
		<div class="font-ui text-[15px] font-medium leading-relaxed flex flex-wrap gap-x-4 gap-y-1.5">
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
		<p class="font-ui text-sm italic text-subtle">
			Aucun paragraphe du Catéchisme pour ce passage.
		</p>
	{/if}
</div>
