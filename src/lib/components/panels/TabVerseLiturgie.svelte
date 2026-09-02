<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import {
		loadVerseLiturgyBook,
		loadVerseLiturgyDays,
		loadBibleVerseIndex,
		loadCecLiturgy
	} from '$lib/data/loaders';
	import type { VerseLiturgyDay, CecLiturgyOccasion } from '$lib/data/types';
	import { BOOKS } from '$lib/utils/bibleBookSlug';
	import LiturgyDayCards, { toCards, bySeason, type Card } from './LiturgyDayCards.svelte';

	const SECTIONS: { kind: VerseLiturgyDay['kind']; label: string }[] = [
		{ kind: 'year', label: 'Dimanches et solennités' },
		{ kind: 'fixed', label: 'Fêtes fixes' },
		{ kind: 'proper', label: 'Autres jours du calendrier' },
		{ kind: 'weekday', label: 'Jours de semaine' }
	];

	let proclaimed: VerseLiturgyDay[] = $state([]);
	let meditated: CecLiturgyOccasion[] = $state([]);
	let citing: number[] = $state([]);
	let loaded = $state(false);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (ctx?.kind !== 'verse') {
			proclaimed = [];
			meditated = [];
			citing = [];
			loaded = false;
			return;
		}
		(async () => {
			loaded = false;
			const slug = BOOKS.find((b) => b.usfx === ctx.verseUsfx)?.slug;
			// The shard alone answers "is this verse ever read at Mass". The day
			// table is far larger and only worth fetching once we know it is.
			const shard = slug ? await loadVerseLiturgyBook(slug) : {};
			const dayIdx = shard[String(ctx.verseChapter)]?.[String(ctx.verseVerse)] ?? [];
			const days = dayIdx.length > 0 ? await loadVerseLiturgyDays() : [];
			proclaimed = dayIdx.map((i) => days[i]).filter((d): d is VerseLiturgyDay => d != null);

			const verseIdx = await loadBibleVerseIndex();
			citing = verseIdx[ctx.verseUsfx]?.[String(ctx.verseChapter)]?.[String(ctx.verseVerse)] ?? [];
			// Shards are cached per paragraph hundred, so ten paragraphs is
			// typically two or three requests.
			const perParagraph = await Promise.all(citing.map((p) => loadCecLiturgy(p)));
			// The same day is reached through several paragraphs; keep the first.
			// A plain object, not a Set: this is a transient local inside the
			// effect's closure and needs no Svelte reactivity.
			const seen: Record<string, true> = {};
			meditated = perParagraph.flat().filter((o) => {
				const id = `${o.cycle ?? ''}:${o.slug}`;
				if (seen[id]) return false;
				seen[id] = true;
				return true;
			});
			loaded = true;
		})();
	});

	/**
	 * One card per day. Unlike the CEC tab there is no grouping across années:
	 * a verse read on the same Sunday in A and B is genuinely two occurrences,
	 * and the ferial cycles I and II are two distinct days sharing a title.
	 */
	function toProclaimedCards(days: VerseLiturgyDay[]): Card[] {
		return days.map((d) => ({
			key: `${d.weekdayCycle ?? d.cycle ?? ''}:${d.slug}`,
			years: [
				{
					slug: d.slug,
					title: d.title,
					season: d.season,
					color: d.color,
					...(d.cycle ? { cycle: d.cycle } : {}),
					// Carried through so feastHref can build the /feries/ route.
					...(d.weekdayCycle ? { weekdayCycle: d.weekdayCycle } : {}),
					...(d.date ? { date: d.date, monthIndex: d.monthIndex } : {}),
					clusters: [],
					...(d.readingsKey ? { readingsKey: d.readingsKey } : {}),
					readings: d.readings
				}
			]
		}));
	}

	const proclaimedSections = $derived(
		SECTIONS.map((s) => ({
			...s,
			cards: toProclaimedCards(proclaimed.filter((d) => d.kind === s.kind))
		})).filter((s) => s.cards.length > 0)
	);
	const meditatedCards = $derived(bySeason(toCards(meditated)));
	const highlightSet = $derived(new Set(citing));
</script>

{#if !loaded}
	<p class="text-muted italic font-ui text-sm">Chargement…</p>
{:else if proclaimed.length === 0 && meditatedCards.length === 0}
	<p class="text-muted italic font-ui text-sm">
		Ce verset n'est proclamé aucun jour du calendrier liturgique.
	</p>
{:else}
	{#if proclaimed.length > 0}
		<h3 class="section-head">Proclamé à la messe</h3>
		<p class="text-muted text-xs mb-3 font-ui">
			Ce verset est proclamé {proclaimed.length === 1 ? 'un jour' : `${proclaimed.length} jours`} :
		</p>
		{#each proclaimedSections as section (section.kind)}
			<h4 class="section-sub">{section.label}</h4>
			<LiturgyDayCards cards={section.cards} showParagraphs={false} />
		{/each}
	{/if}
	{#if meditatedCards.length > 0}
		<h3 class="section-head" class:with-gap={proclaimed.length > 0}>Paragraphes à méditer</h3>
		<p class="text-muted text-xs mb-3 font-ui">
			Les paragraphes du Catéchisme qui citent ce verset sont proposés à la méditation ces jours-là
			:
		</p>
		<LiturgyDayCards cards={meditatedCards} highlight={highlightSet} />
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
	/* One step quieter than .section-head: these label the kinds of day inside
	   the proclamation section, not the section itself. */
	.section-sub {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-subtle);
		margin: 14px 0 8px;
	}
	.section-sub:first-of-type {
		margin-top: 0;
	}
</style>
