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
	import { LITURGICAL_COLOR_VAR } from './liturgicalColor';
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

	const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	// Split rather than `new Date(iso)`, which parses a bare ISO date as UTC and
	// shifts the day backwards for viewers west of Greenwich.
	function formatIsoDate(iso: string): string {
		const [y, m, d] = iso.split('-').map(Number);
		return DATE_FORMAT.format(new Date(y!, m! - 1, d!));
	}

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
	style:border-left-color={feast
		? `var(${LITURGICAL_COLOR_VAR[feast.liturgicalColor]})`
		: undefined}
>
	<!-- Announcing only the kicker line, not the whole FeastBlock, keeps the
	     live region from reading out every cluster on resolution. The wrapper
	     renders unconditionally so the message counts as an insertion. -->
	<div aria-live="polite">
		{#if resolved === null}
			<p class="status">Chargement…</p>
		{:else if resolved.status === 'match' && feast}
			<p class="kicker">
				{resolved.label === 'today' ? 'Aujourd’hui' : 'Dimanche dernier'}
				<span class="kicker-date">{formatIsoDate(resolved.row.date)}</span>
			</p>
		{:else}
			<p class="status">Pas de dimanche ni de grande fête à afficher aujourd’hui.</p>
		{/if}
	</div>
	{#if resolved?.status === 'match' && feast}
		<FeastBlock {feast} />
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
	.kicker-date {
		color: var(--color-muted);
		font-weight: 500;
	}
	.kicker-date::before {
		content: ' · ';
	}
	.status {
		font-family: var(--font-body);
		font-size: 0.92rem;
		color: var(--color-subtle);
		font-style: italic;
		margin: 0;
	}
</style>
