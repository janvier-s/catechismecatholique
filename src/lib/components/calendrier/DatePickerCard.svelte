<!-- src/lib/components/calendrier/DatePickerCard.svelte -->
<script lang="ts">
	import type { CalendrierDateRow, CalendrierDatesIndexFile } from '$lib/data/types';
	import CalendrierPicker from './CalendrierPicker.svelte';

	let {
		datesIndex,
		selectedIso = null,
		onPick
	}: {
		datesIndex: CalendrierDatesIndexFile;
		selectedIso?: string | null;
		onPick: (row: CalendrierDateRow) => void;
	} = $props();

	// Collapsed by default - reached for occasionally, not on every visit, so
	// it shouldn't compete with the feast card for space or attention. Stays
	// open across picks once opened, so browsing several dates in a row
	// doesn't mean re-opening it each time.
	let expanded = $state(false);
</script>

<div class="picker-card">
	<button
		type="button"
		class="kicker-toggle"
		class:is-open={expanded}
		onclick={() => (expanded = !expanded)}
		aria-expanded={expanded}
	>
		<span class="caret" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
		<span class="kicker">Chercher une date</span>
	</button>
	{#if expanded}
		<div class="picker-body">
			<CalendrierPicker {datesIndex} {selectedIso} {onPick} />
		</div>
	{/if}
</div>

<style>
	.picker-card {
		border: 1px solid var(--color-border);
		border-left-width: 4px;
		border-radius: 6px;
		padding: 0.4rem 0.9rem;
		background: color-mix(in srgb, var(--color-border) 12%, transparent);
	}
	.kicker-toggle {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		width: 100%;
		text-align: left;
		background: none;
		border: 0;
		padding: 0.6rem 0.4rem;
		border-radius: 3px;
		cursor: pointer;
		font-family: var(--font-ui);
		transition: background-color 120ms ease;
	}
	.kicker-toggle:hover {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
	}
	.kicker-toggle.is-open {
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}
	.caret {
		flex: none;
		font-family: var(--font-body);
		font-size: 0.85rem;
		color: var(--color-muted);
		width: 0.9rem;
		text-align: center;
	}
	.kicker-toggle.is-open .caret {
		color: var(--color-accent);
	}
	.kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0;
	}
	.picker-body {
		padding: 0.25rem 0.4rem 1rem;
	}
</style>
