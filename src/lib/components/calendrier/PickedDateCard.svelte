<!-- src/lib/components/calendrier/PickedDateCard.svelte -->
<script lang="ts">
	import type {
		CalendrierDateRow,
		CalendrierDatesIndexFile,
		CalendrierFeast,
		CalendrierFixedFeast
	} from '$lib/data/types';
	import {
		resolveFeastForRow,
		findRow,
		previousSunday,
		nextSunday,
		toIsoDate
	} from '$lib/utils/calendrierDateLookup';
	import { LITURGICAL_COLOR_VAR } from './liturgicalColor';
	import FeastBlock from './FeastBlock.svelte';
	import DateSearchDropdown from './DateSearchDropdown.svelte';

	let {
		row,
		datesIndex,
		fixedFeasts,
		dateSearchOpen,
		onDateSearchToggle,
		onDateSearchClose,
		onReset,
		onPick
	}: {
		row: CalendrierDateRow;
		datesIndex: CalendrierDatesIndexFile;
		fixedFeasts: CalendrierFixedFeast[];
		dateSearchOpen: boolean;
		onDateSearchToggle: () => void;
		onDateSearchClose: () => void;
		onReset: () => void;
		onPick: (row: CalendrierDateRow) => void;
	} = $props();

	// Split rather than `new Date(iso)`, which parses a bare ISO date as UTC
	// and shifts the day backwards for viewers west of Greenwich.
	function parseIsoDate(iso: string): Date {
		const [y, m, d] = iso.split('-').map(Number);
		return new Date(y!, m! - 1, d!);
	}

	function pickPreviousSunday() {
		const found = findRow(datesIndex, toIsoDate(previousSunday(parseIsoDate(row.date))));
		if (found) onPick(found);
	}

	function pickNextSunday() {
		const found = findRow(datesIndex, toIsoDate(nextSunday(parseIsoDate(row.date))));
		if (found) onPick(found);
	}

	let feast: CalendrierFeast | CalendrierFixedFeast | null = $state(null);
	let loading: boolean = $state(true);

	$effect(() => {
		loading = true;
		feast = null;
		resolveFeastForRow(row, fixedFeasts).then((f) => {
			feast = f;
			loading = false;
		});
	});
</script>

<div
	class="picked-card"
	style:border-left-color={feast
		? `var(${LITURGICAL_COLOR_VAR[feast.liturgicalColor]})`
		: undefined}
>
	<div class="result-head">
		<p class="kicker">Résultat</p>
		<div class="result-actions">
			{#if row.corpus === 'weekday'}
				<div class="sunday-nav">
					<button type="button" onclick={pickPreviousSunday}>← Dimanche précédent</button>
					<button type="button" onclick={pickNextSunday}>Dimanche suivant →</button>
				</div>
			{/if}
			<div class="result-actions-secondary">
				<DateSearchDropdown
					{datesIndex}
					selectedIso={row.date}
					open={dateSearchOpen}
					onToggle={onDateSearchToggle}
					onClose={onDateSearchClose}
					{onPick}
				/>
				<button type="button" class="reset-btn" onclick={onReset}>Revenir à aujourd’hui</button>
			</div>
		</div>
	</div>
	<!-- The live region has to outlive the message so the message counts as
	     an insertion into it, hence a wrapper that renders unconditionally. -->
	<div aria-live="polite">
		{#if loading}
			<p class="status">Chargement…</p>
		{:else if feast}
			<FeastBlock
				{feast}
				yearKey={row.yearKey ?? row.cycle}
				isWeekday={row.corpus === 'weekday'}
				isProper={row.corpus === 'proper'}
				sundayCycle={row.sundayCycle}
				weekdayCycle={row.cycle}
			/>
		{/if}
	</div>
</div>

<style>
	.picked-card {
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
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.result-actions {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
	}
	.result-actions-secondary {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.sunday-nav {
		display: flex;
		gap: 0.75rem;
	}
	.sunday-nav button {
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
	.sunday-nav button:hover {
		color: var(--color-accent);
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
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
		.picked-card {
			border-width: 0;
			border-radius: 0;
			background: none;
			padding: 1.25rem 0;
		}
		.result-head {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.4rem;
		}
	}
</style>
