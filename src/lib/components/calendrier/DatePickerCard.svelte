<!-- src/lib/components/calendrier/DatePickerCard.svelte -->
<script lang="ts">
	import type {
		CalendrierDateRow,
		CalendrierDatesIndexFile,
		CalendrierFeast,
		CalendrierFixedFeast
	} from '$lib/data/types';
	import { resolveFeastForRow } from '$lib/utils/calendrierDateLookup';
	import { LITURGICAL_COLOR_VAR } from './liturgicalColor';
	import CalendrierPicker from './CalendrierPicker.svelte';
	import FeastBlock from './FeastBlock.svelte';

	let {
		datesIndex,
		fixedFeasts
	}: {
		datesIndex: CalendrierDatesIndexFile;
		fixedFeasts: CalendrierFixedFeast[];
	} = $props();

	let pickedRow: CalendrierDateRow | null = $state(null);
	let feast: CalendrierFeast | CalendrierFixedFeast | null = $state(null);
	let loading: boolean = $state(false);

	async function pick(row: CalendrierDateRow) {
		pickedRow = row;
		loading = true;
		feast = await resolveFeastForRow(row, fixedFeasts);
		loading = false;
	}

	function reset() {
		pickedRow = null;
		feast = null;
	}
</script>

<div
	class="picker-card"
	style:border-left-color={feast
		? `var(${LITURGICAL_COLOR_VAR[feast.liturgicalColor]})`
		: undefined}
>
	{#if pickedRow}
		<div class="result-head">
			<p class="kicker">Résultat</p>
			<button type="button" class="reset-btn" onclick={reset}>Chercher une autre date</button>
		</div>
		<!-- The live region has to outlive the message so the message counts as
		     an insertion into it, hence a wrapper that renders unconditionally. -->
		<div aria-live="polite">
			{#if loading}
				<p class="status">Chargement…</p>
			{:else if feast}
				<FeastBlock {feast} yearKey={pickedRow.yearKey} />
			{/if}
		</div>
	{:else}
		<p class="kicker">Chercher une date</p>
		<CalendrierPicker {datesIndex} onPick={pick} />
	{/if}
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
	.result-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.reset-btn {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--color-muted);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.3rem 0.6rem;
		cursor: pointer;
		transition:
			color 150ms ease,
			border-color 150ms ease;
	}
	.reset-btn:hover {
		color: var(--color-accent);
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}
	.status {
		margin: 0.75rem 0 0;
		font-family: var(--font-body);
		font-size: 0.9rem;
		color: var(--color-subtle);
		font-style: italic;
	}

	@media (max-width: 640px) {
		.result-head {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.4rem;
		}
	}
</style>
