<!-- src/lib/components/calendrier/CalendrierPicker.svelte -->
<script lang="ts">
	import type { CalendrierDateRow, CalendrierDatesIndexFile } from '$lib/data/types';
	import { resolveToday, toIsoDate } from '$lib/utils/calendrierDateLookup';
	import { buildMonthGrid } from '$lib/utils/calendrierMonthGrid';
	import { LITURGICAL_COLOR_VAR } from './liturgicalColor';

	let {
		datesIndex,
		selectedIso = null,
		onPick
	}: {
		datesIndex: CalendrierDatesIndexFile;
		selectedIso?: string | null;
		onPick: (row: CalendrierDateRow) => void;
	} = $props();

	const MONTH_NAMES = [
		'Janvier',
		'Février',
		'Mars',
		'Avril',
		'Mai',
		'Juin',
		'Juillet',
		'Août',
		'Septembre',
		'Octobre',
		'Novembre',
		'Décembre'
	];
	const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
	const DAY_LABEL_FORMAT = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	function formatIsoDate(iso: string): string {
		const [y, m, d] = iso.split('-').map(Number);
		return DAY_LABEL_FORMAT.format(new Date(y!, m! - 1, d!));
	}

	const rangeStartYear = $derived(Number(datesIndex.rangeStart.slice(0, 4)));
	const rangeStartMonth = $derived(Number(datesIndex.rangeStart.slice(5, 7)));
	const rangeEndYear = $derived(Number(datesIndex.rangeEnd.slice(0, 4)));
	const rangeEndMonth = $derived(Number(datesIndex.rangeEnd.slice(5, 7)));
	const YEAR_OPTIONS = $derived(
		Array.from({ length: rangeEndYear - rangeStartYear + 1 }, (_, i) => rangeStartYear + i)
	);

	// Resolved once at construction to seed the initial visible month; the
	// picker only needs this on open, not reactively as datesIndex is static
	// for the component's lifetime in every context it's used.
	// svelte-ignore state_referenced_locally
	const todayResolved = resolveToday(datesIndex);
	const initialDate =
		todayResolved.status === 'match' ? todayResolved.row.date : toIsoDate(new Date());
	const todayIso = toIsoDate(new Date());

	let visibleYear = $state(Number(initialDate.slice(0, 4)));
	let visibleMonth = $state(Number(initialDate.slice(5, 7)));

	// Jump the visible month to follow an externally-driven selection (e.g. the
	// Sunday quick-nav buttons), without fighting the visitor's own browsing —
	// this only re-runs when selectedIso itself changes.
	$effect(() => {
		if (!selectedIso) return;
		visibleYear = Number(selectedIso.slice(0, 4));
		visibleMonth = Number(selectedIso.slice(5, 7));
	});

	const grid = $derived(buildMonthGrid(visibleYear, visibleMonth, datesIndex));
	const atRangeStart = $derived(visibleYear === rangeStartYear && visibleMonth === rangeStartMonth);
	const atRangeEnd = $derived(visibleYear === rangeEndYear && visibleMonth === rangeEndMonth);

	function goPrev() {
		if (atRangeStart) return;
		if (visibleMonth === 1) {
			visibleMonth = 12;
			visibleYear -= 1;
		} else {
			visibleMonth -= 1;
		}
	}

	function goNext() {
		if (atRangeEnd) return;
		if (visibleMonth === 12) {
			visibleMonth = 1;
			visibleYear += 1;
		} else {
			visibleMonth += 1;
		}
	}
</script>

<div class="picker">
	<div class="nav">
		<button
			type="button"
			class="nav-btn"
			onclick={goPrev}
			disabled={atRangeStart}
			aria-label="Mois précédent"
		>
			‹
		</button>
		<select class="month-select" bind:value={visibleMonth} aria-label="Mois">
			{#each MONTH_NAMES as name, i (i)}
				<option value={i + 1}>{name}</option>
			{/each}
		</select>
		<select class="year-select" bind:value={visibleYear} aria-label="Année">
			{#each YEAR_OPTIONS as y (y)}
				<option value={y}>{y}</option>
			{/each}
		</select>
		<button
			type="button"
			class="nav-btn"
			onclick={goNext}
			disabled={atRangeEnd}
			aria-label="Mois suivant"
		>
			›
		</button>
	</div>

	<div class="weekdays" aria-hidden="true">
		{#each WEEKDAY_LABELS as label, i (i)}
			<span class:is-sunday={i === 6}>{label}</span>
		{/each}
	</div>

	<div class="grid">
		{#each grid as week, wi (wi)}
			{#each week as cell, di (cell.date)}
				{#if cell.inMonth && cell.inRange && cell.row}
					<button
						type="button"
						class="day matched"
						class:is-today={cell.date === todayIso}
						class:is-selected={cell.date === selectedIso}
						class:is-sunday={di === 6}
						onclick={() => onPick(cell.row!)}
						aria-label={formatIsoDate(cell.date)}
					>
						<span class="day-number">{cell.day}</span>
						<span
							class="color-dot"
							aria-hidden="true"
							style:background-color={`var(${LITURGICAL_COLOR_VAR[cell.row.liturgicalColor]})`}
						></span>
					</button>
				{:else}
					<span
						class="day"
						class:is-today={cell.date === todayIso}
						class:out-of-month={!cell.inMonth}
						class:is-sunday={di === 6}
					>
						<span class="day-number">{cell.day}</span>
					</span>
				{/if}
			{/each}
		{/each}
	</div>
</div>

<style>
	.picker {
		font-family: var(--font-ui);
	}
	.nav {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.75rem;
	}
	.nav-btn {
		flex: none;
		width: 1.8rem;
		height: 1.8rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		line-height: 1;
		color: var(--color-muted);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		cursor: pointer;
		transition:
			color 150ms ease,
			border-color 150ms ease;
	}
	.nav-btn:hover:not(:disabled) {
		color: var(--color-accent);
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}
	.nav-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.month-select,
	.year-select {
		font-family: var(--font-ui);
		font-size: 0.85rem;
		color: var(--color-fg);
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.35rem 0.5rem;
	}
	.month-select {
		flex: 1 1 auto;
	}
	.weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		margin-bottom: 0.25rem;
	}
	.weekdays span {
		text-align: center;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: var(--color-subtle);
	}
	.weekdays span.is-sunday {
		color: var(--color-accent);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
	}
	.day {
		position: relative;
		aspect-ratio: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		border-radius: 4px;
		font-size: 0.85rem;
		color: var(--color-subtle);
	}
	.day.out-of-month {
		color: var(--color-subtle);
		opacity: 0.35;
	}
	.day.is-sunday {
		background: color-mix(in srgb, var(--color-accent) 7%, transparent);
	}
	button.day.matched {
		color: var(--color-fg);
		background: none;
		border: 0;
		cursor: pointer;
		font-family: inherit;
		transition: background-color 120ms ease;
	}
	button.day.matched.is-sunday {
		background: color-mix(in srgb, var(--color-accent) 7%, transparent);
	}
	button.day.matched:hover {
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
	}
	button.day.matched:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
	}
	.day.is-today {
		box-shadow: inset 0 0 0 1.5px var(--color-accent);
	}
	.day.is-selected {
		background: color-mix(in srgb, var(--color-accent) 22%, transparent);
	}
	.color-dot {
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 50%;
	}
</style>
