<script lang="ts">
	import type { ConcordancePericope } from '$lib/data/types';
	import { pluralFr } from '$lib/utils/i18n';
	import { page } from '$app/state';

	let { pericope }: { pericope: ConcordancePericope } = $props();

	const cccCount = $derived(pericope.cccRanges.reduce((t, r) => t + (r.to - r.from + 1), 0));

	function rangeLabel(from: number, to: number): string {
		return from === to ? String(from) : `${from}-${to}`;
	}
	function rangeHref(from: number, to: number): string {
		return from === to ? `/cec/${from}` : `/cec/${from}-${to}`;
	}

	// The ranges are rarely contiguous (e.g. §268, §279-280, §290-295), so all
	// of them travel as one comma-separated ref that /cec expands into a single
	// reading view · `label` names the passage they answer to, and `from` sends
	// the return link back to this concordance rather than the CCC front door.
	const allHref = $derived(
		'/cec/' +
			pericope.cccRanges.map((r) => rangeLabel(r.from, r.to)).join(',') +
			`?label=${encodeURIComponent(pericope.verseRef)}` +
			`&from=${encodeURIComponent(page.url.pathname)}`
	);
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

		{#if pericope.cccRanges.length > 1}
			<a href={allHref} class="see-all">
				Voir tous
				<span aria-hidden="true">→</span>
			</a>
		{/if}
	{:else}
		<p class="font-ui text-sm italic text-subtle">
			Aucun paragraphe du Catéchisme pour ce passage.
		</p>
	{/if}
</div>

<style>
	/* Shaped after .cta-primary on the /cec landing page · same 6px radius and
	   solid accent fill, one size down. A pale outline read as an empty chip
	   next to the paragraph links rather than the action that gathers them. */
	.see-all {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 1.25rem;
		padding: 0.5rem 0.9rem;
		border-radius: 6px;
		background: var(--color-accent);
		color: #fff;
		font-family: var(--font-ui);
		font-size: 0.8125rem;
		font-weight: 600;
		text-decoration: none;
		transition: background 150ms ease;
	}
	.see-all:hover,
	.see-all:focus-visible {
		background: color-mix(in srgb, var(--color-accent) 85%, black);
	}
</style>
