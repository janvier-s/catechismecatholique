<script lang="ts">
	import type { CalendrierFeast, CalendrierFixedFeast, CalendrierSeason } from '$lib/data/types';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { prefs } from '$lib/stores/prefs';
	import { getFontById } from '$lib/data/fonts';
	import FeastBlock from './FeastBlock.svelte';

	let {
		feasts,
		title,
		kicker,
		showSeasonGroups = false,
		showDates = false
	}: {
		feasts: (CalendrierFeast | CalendrierFixedFeast)[];
		title: string;
		kicker?: string;
		showSeasonGroups?: boolean;
		showDates?: boolean;
	} = $props();

	const readerFont = $derived(getFontById($prefs.fontFamily));

	const SEASON_LABELS: Record<CalendrierSeason, string> = {
		avent: "Temps de l'Avent",
		noel: 'Temps de Noël',
		careme: 'Temps du Carême',
		pascal: 'Triduum & Temps Pascal',
		solennite: 'Solennités du Seigneur',
		ordinaire: 'Temps Ordinaire'
	};
	const SEASON_ORDER: CalendrierSeason[] = [
		'avent',
		'noel',
		'careme',
		'pascal',
		'solennite',
		'ordinaire'
	];

	const seasonGroups = $derived.by(() => {
		if (!showSeasonGroups) return null;
		const groups: Partial<Record<CalendrierSeason, (CalendrierFeast | CalendrierFixedFeast)[]>> =
			{};
		for (const f of feasts) {
			(groups[f.season] ??= []).push(f);
		}
		return SEASON_ORDER.filter((s) => groups[s]).map((s) => ({
			key: s,
			label: SEASON_LABELS[s],
			feasts: groups[s]!
		}));
	});
</script>

<main
	class="mx-auto max-w-reader px-6 max-md:px-4 py-10"
	data-corpus="calendrier"
	style:font-family={readerFont?.stack ?? undefined}
	use:scrollSpy
>
	<header class="head">
		{#if kicker}<p class="page-kicker">{kicker}</p>{/if}
		<h1 class="page-title">{title}</h1>
	</header>

	{#if seasonGroups}
		{#each seasonGroups as group (group.key)}
			<section class="season" aria-labelledby="season-{group.key}">
				<h3 class="season-heading" id="season-{group.key}">{group.label}</h3>
				{#each group.feasts as feast (feast.slug)}
					<FeastBlock {feast} {showDates} />
				{/each}
			</section>
		{/each}
	{:else}
		{#each feasts as feast (feast.slug)}
			<FeastBlock {feast} {showDates} />
		{/each}
	{/if}
</main>

<style>
	.head {
		margin-bottom: 2.5rem;
	}
	.page-kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.5rem;
	}
	.page-title {
		font-family: var(--font-heading);
		font-size: clamp(1.6rem, 4vw, 2.4rem);
		font-weight: 600;
		line-height: 1.15;
		color: var(--color-fg);
		margin: 0;
	}

	.season {
		margin-bottom: 3rem;
	}
	.season-heading {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--color-accent);
		margin: 2rem 0 1.25rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
	}
</style>
