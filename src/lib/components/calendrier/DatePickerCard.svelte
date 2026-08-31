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
</script>

<div class="picker-card">
	<p class="kicker">Chercher une date</p>
	<CalendrierPicker {datesIndex} {selectedIso} {onPick} />
</div>

<style>
	.picker-card {
		border: 1px solid var(--color-border);
		border-left-width: 4px;
		border-radius: 6px;
		padding: 1.25rem 1.5rem;
		background: color-mix(in srgb, var(--color-border) 12%, transparent);
	}
	.kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 0.75rem;
	}
</style>
