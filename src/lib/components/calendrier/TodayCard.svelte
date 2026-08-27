<!-- src/lib/components/calendrier/TodayCard.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import type {
		CalendrierDatesIndexFile,
		CalendrierFeast,
		CalendrierFixedFeast
	} from '$lib/data/types';
	import {
		resolveToday,
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

	let resolved: ResolvedDay | null = $state(null);
	let feast: CalendrierFeast | CalendrierFixedFeast | null = $state(null);

	onMount(async () => {
		const r = resolveToday(datesIndex);
		resolved = r;
		if (r.status === 'match') {
			feast = await resolveFeastForRow(r.row, fixedFeasts);
		}
	});
</script>

<div
	class="today-card"
	style:border-left-color={feast ? LITURGICAL_COLOR_HEX[feast.liturgicalColor] : undefined}
>
	{#if resolved === null}
		<p class="status">Chargement…</p>
	{:else if resolved.status === 'match' && feast}
		<p class="kicker">{resolved.label === 'today' ? 'Aujourd’hui' : 'Dimanche dernier'}</p>
		<FeastBlock {feast} />
	{:else}
		<p class="status">Pas de dimanche ni de grande fête à afficher aujourd’hui.</p>
	{/if}
</div>

<style>
	.today-card {
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
	.status {
		font-family: var(--font-body);
		font-size: 0.92rem;
		color: var(--color-subtle);
		font-style: italic;
		margin: 0;
	}
</style>
