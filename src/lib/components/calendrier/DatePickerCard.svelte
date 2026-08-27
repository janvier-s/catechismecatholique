<!-- src/lib/components/calendrier/DatePickerCard.svelte -->
<script lang="ts">
	import type {
		CalendrierDatesIndexFile,
		CalendrierFeast,
		CalendrierFixedFeast
	} from '$lib/data/types';
	import {
		resolvePickedDate,
		resolveFeastForRow,
		type ResolvedDay
	} from '$lib/utils/calendrierDateLookup';
	import { LITURGICAL_COLOR_HEX } from './liturgicalColor';
	import FeastBlock from './FeastBlock.svelte';

	let {
		datesIndex,
		fixedFeasts
	}: {
		datesIndex: CalendrierDatesIndexFile;
		fixedFeasts: CalendrierFixedFeast[];
	} = $props();

	let pickedValue: string = $state('');
	let resolved: ResolvedDay | null = $state(null);
	let feast: CalendrierFeast | CalendrierFixedFeast | null = $state(null);
	let loading: boolean = $state(false);

	async function search() {
		if (!pickedValue) return;
		loading = true;
		feast = null;
		const [y, m, d] = pickedValue.split('-').map(Number);
		const picked = new Date(y!, m! - 1, d!);
		const r = resolvePickedDate(datesIndex, picked);
		resolved = r;
		if (r.status === 'match') {
			feast = await resolveFeastForRow(r.row, fixedFeasts);
		}
		loading = false;
	}

	function reset() {
		resolved = null;
		feast = null;
		pickedValue = '';
	}
</script>

<div
	class="picker-card"
	style:border-left-color={feast ? LITURGICAL_COLOR_HEX[feast.liturgicalColor] : undefined}
>
	{#if resolved?.status === 'match' && feast}
		<div class="result-head">
			<p class="kicker">Résultat</p>
			<button type="button" class="reset-btn" onclick={reset}>Chercher une autre date</button>
		</div>
		<FeastBlock {feast} />
	{:else}
		<p class="kicker">Chercher une date</p>
		<form
			class="picker-form"
			onsubmit={(e) => {
				e.preventDefault();
				search();
			}}
		>
			<input
				type="date"
				aria-label="Chercher une date"
				bind:value={pickedValue}
				min={datesIndex.rangeStart}
				max={datesIndex.rangeEnd}
			/>
			<button type="submit" class="search-btn" disabled={loading}>
				{loading ? 'Recherche…' : 'Chercher'}
			</button>
		</form>
		<!-- The live region has to outlive the message so the message counts as
		     an insertion into it, hence a wrapper that renders unconditionally. -->
		<div aria-live="polite">
			{#if resolved?.status === 'no-match'}
				<p class="status">
					Aucun dimanche ou grande fête du Catéchisme ne correspond à cette date.
				</p>
			{:else if resolved?.status === 'out-of-range'}
				<p class="status">
					Cette date sort de la période couverte ({datesIndex.rangeStart} à {datesIndex.rangeEnd}).
				</p>
			{/if}
		</div>
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
	.picker-form {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.picker-form input[type='date'] {
		flex: 1 1 auto;
		min-width: 0;
		font-family: var(--font-ui);
		font-size: 0.92rem;
		color: var(--color-fg);
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.5rem 0.65rem;
	}
	.picker-form input[type='date']:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
	}
	.search-btn {
		font-family: var(--font-ui);
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-bg);
		background: var(--color-accent);
		border: 0;
		border-radius: 4px;
		padding: 0.5rem 1rem;
		cursor: pointer;
	}
	.search-btn:disabled {
		opacity: 0.6;
		cursor: default;
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
