<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadCecLiturgy } from '$lib/data/loaders';
	import type { CecLiturgyOccasion } from '$lib/data/types';
	import LiturgyDayCards, { toCards, bySeason } from './LiturgyDayCards.svelte';

	let occasions: CecLiturgyOccasion[] = $state([]);
	let loaded = $state(false);
	let current = $state(0);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (ctx?.kind !== 'paragraph') {
			occasions = [];
			loaded = false;
			return;
		}
		const paragraph = ctx.paragraph;
		(async () => {
			loaded = false;
			const found = await loadCecLiturgy(paragraph);
			current = paragraph;
			occasions = found;
			loaded = true;
		})();
	});

	// Three sections, three kinds of day: the Sundays and solemnities of the
	// three-year cycle, the fixed-date feasts, and the days proper to a season
	// (the O antiphons, the octave of Christmas, Easter week...).
	const sundayCards = $derived(bySeason(toCards(occasions.filter((o) => o.cycle))));
	const fixedCards = $derived(
		toCards(occasions.filter((o) => o.date)).sort(
			(a, b) => (a.years[0]!.monthIndex ?? 99) - (b.years[0]!.monthIndex ?? 99)
		)
	);
	const properCards = $derived(bySeason(toCards(occasions.filter((o) => !o.cycle && !o.date))));

	// Days, not occasions: a Sunday kept in all three années is one day.
	const dayCount = $derived(sundayCards.length + fixedCards.length + properCards.length);

	const highlightSet = $derived(new Set([current]));
</script>

{#if !loaded}
	<p class="text-muted italic font-ui text-sm">Chargement…</p>
{:else if occasions.length === 0}
	<p class="text-muted italic font-ui text-sm">
		Aucun jour du calendrier liturgique ne propose ce paragraphe à la méditation.
	</p>
{:else}
	<p class="text-muted text-xs mb-3 font-ui">
		Ce paragraphe est à méditer avec les lectures de la messe de {dayCount === 1
			? 'un jour'
			: `${dayCount} jours`} :
	</p>
	{#if sundayCards.length > 0}
		<h3 class="section-head">Dimanches et solennités</h3>
		<LiturgyDayCards cards={sundayCards} highlight={highlightSet} />
	{/if}
	{#if fixedCards.length > 0}
		<h3 class="section-head with-gap">Fêtes fixes</h3>
		<LiturgyDayCards cards={fixedCards} highlight={highlightSet} />
	{/if}
	{#if properCards.length > 0}
		<h3 class="section-head with-gap">Autres jours du calendrier</h3>
		<LiturgyDayCards cards={properCards} highlight={highlightSet} />
		<p class="source-note">Références tirées de la Didache Study Bible</p>
	{/if}
{/if}

<style>
	.section-head {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 8px;
	}
	.section-head.with-gap {
		margin-top: 20px;
	}
	.source-note {
		font-family: var(--font-ui);
		font-size: 11px;
		font-style: italic;
		color: var(--color-muted);
		margin: 10px 0 0;
	}
</style>
