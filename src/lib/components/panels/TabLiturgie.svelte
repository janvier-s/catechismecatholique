<script lang="ts">
	import { studyPanel, openPanel } from '$lib/stores/studyPanel';
	import { loadCecLiturgy, loadCalendrierReading } from '$lib/data/loaders';
	import type {
		CalendrierSeason,
		CecLiturgyOccasion,
		CalendrierReadingsEntry
	} from '$lib/data/types';
	import { LITURGICAL_COLOR_VAR } from '$lib/components/calendrier/liturgicalColor';
	import { bibleRefUrl } from '$lib/utils/linkifyRefs';

	const SEASON_LABELS: Record<CalendrierSeason, string> = {
		avent: "Temps de l'Avent",
		noel: 'Temps de Noël',
		careme: 'Temps du Carême',
		pascal: 'Triduum & Temps Pascal',
		solennite: 'Solennités du Seigneur',
		ordinaire: 'Temps Ordinaire'
	};

	const READING_LABELS: Record<string, string> = {
		lecture_1: '1re lecture',
		lecture_2: '2e lecture',
		lecture_3: '3e lecture',
		lecture_4: '4e lecture',
		lecture_5: '5e lecture',
		lecture_6: '6e lecture',
		lecture_7: '7e lecture',
		psaume: 'Psaume',
		cantique: 'Cantique',
		epitre: 'Épître',
		evangile: 'Évangile',
		sequence: 'Séquence',
		entree_messianique: 'Entrée messianique'
	};

	// One card: a feast, with every theme it cites the current paragraph under.
	type Card = {
		key: string;
		occasion: CecLiturgyOccasion;
		blocks: { theme: string; paragraphs: number[] }[];
	};

	let occasions: CecLiturgyOccasion[] = $state([]);
	let loaded = $state(false);
	let current = $state(0);
	let expanded: string | null = $state(null);
	let readingText: CalendrierReadingsEntry | null = $state(null);
	let readingBusy = $state(false);

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
			expanded = null;
			readingText = null;
			const found = await loadCecLiturgy(paragraph);
			current = paragraph;
			occasions = found;
			loaded = true;
		})();
	});

	/** Collapses consecutive occasions of the same feast into one card. */
	function toCards(list: CecLiturgyOccasion[]): Card[] {
		const cards: Card[] = [];
		for (const o of list) {
			const key = `${o.cycle ?? 'fixe'}:${o.slug}`;
			const last = cards[cards.length - 1];
			// A cluster may list the same paragraph twice (a range overlapping a
			// loose number); dedupe so the keyed each below stays unique.
			const paragraphs = [...new Set(o.paragraphs)];
			if (last && last.key === key) {
				last.blocks.push({ theme: o.theme, paragraphs });
			} else {
				cards.push({ key, occasion: o, blocks: [{ theme: o.theme, paragraphs }] });
			}
		}
		return cards;
	}

	const sundayCards = $derived(toCards(occasions.filter((o) => o.cycle)));
	const fixedCards = $derived(
		toCards(
			occasions.filter((o) => !o.cycle).sort((a, b) => (a.monthIndex ?? 99) - (b.monthIndex ?? 99))
		)
	);

	// Days, not occasions: one feast citing the paragraph under three themes is
	// still one day of the calendar.
	const dayCount = $derived(sundayCards.length + fixedCards.length);

	function meta(o: CecLiturgyOccasion): string {
		const season = SEASON_LABELS[o.season];
		if (o.date) return `${season} · ${o.date}`;
		if (o.cycle) return `${season} · Année ${o.cycle.toUpperCase()}`;
		return season;
	}

	function refLabel(r: { type: string }): string {
		return READING_LABELS[r.type] ?? r.type;
	}

	async function toggle(card: Card): Promise<void> {
		if (expanded === card.key) {
			expanded = null;
			readingText = null;
			return;
		}
		expanded = card.key;
		readingText = null;
		if (!card.occasion.readingsKey) return;
		readingBusy = true;
		try {
			readingText = await loadCalendrierReading(card.occasion.slug, card.occasion.cycle);
		} finally {
			readingBusy = false;
		}
	}
</script>

{#snippet cardList(cards: Card[])}
	<ul class="space-y-4 list-none">
		{#each cards as card (card.key)}
			{@const o = card.occasion}
			<li class="border-l-2 pl-3" style:border-color={`var(${LITURGICAL_COLOR_VAR[o.color]})`}>
				<a
					href={`/calendrier-liturgique/propre/${o.slug}`}
					class="font-ui text-sm font-semibold text-fg hover:text-accent transition-colors"
				>
					{o.title}
				</a>
				<p class="font-ui text-[11px] text-muted mt-[2px]">{meta(o)}</p>

				{#each card.blocks as block, bi (bi)}
					<p class="font-body text-[13px] text-fg/90 mt-2 leading-snug">{block.theme}</p>
					<p class="mt-1 flex flex-wrap gap-1">
						{#each block.paragraphs as n (n)}
							{#if n === current}
								<span
									aria-current="true"
									class="font-ui text-[11px] tabular-nums rounded-[3px] px-[6px] py-[1px] bg-accent/15 text-accent font-semibold"
								>
									{n}
								</span>
							{:else}
								<button
									type="button"
									onclick={() => openPanel({ kind: 'paragraph', paragraph: n }, 'liturgie')}
									class="font-ui text-[11px] tabular-nums text-accent border border-accent/30 rounded-[3px] px-[6px] py-[1px] hover:bg-accent/10 transition-colors"
								>
									{n}
								</button>
							{/if}
						{/each}
					</p>
				{/each}

				{#if o.readings && o.readings.length > 0}
					<p class="font-ui text-[10px] uppercase tracking-wider text-muted mt-3">
						Lectures de la messe
					</p>
					<p class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
						{#each o.readings as r, ri (ri)}
							{@const url = bibleRefUrl(r.ref)}
							<span class="font-ui text-[11px] text-muted">
								<span class="sr-only">{refLabel(r)} : </span>
								{#if url}
									<a href={url} class="text-accent hover:underline">{r.ref}</a>
								{:else}
									{r.ref}
								{/if}
							</span>
						{/each}
					</p>
					{#if o.readingsKey}
						<button
							type="button"
							onclick={() => toggle(card)}
							aria-expanded={expanded === card.key}
							class="font-ui text-[11px] text-muted hover:text-accent transition-colors mt-1 underline underline-offset-2"
						>
							{expanded === card.key ? 'Masquer les textes' : 'Lire les textes'}
						</button>
					{/if}
				{/if}

				{#if expanded === card.key}
					{#if readingBusy}
						<p class="text-muted italic font-ui text-xs mt-2">Chargement…</p>
					{:else if readingText}
						<div class="mt-2 space-y-3">
							{#each readingText.lectures as l, li (li)}
								<div>
									<p class="font-ui text-[10px] uppercase tracking-wider text-muted">
										{refLabel(l)}{l.ref ? ` · ${l.ref}` : ''}
									</p>
									<div class="reading-text font-body text-[13px] leading-relaxed text-fg">
										{@html l.contenu}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-muted italic font-ui text-xs mt-2">
							Les textes de ce jour ne sont pas disponibles.
						</p>
					{/if}
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

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
		<h3 class="font-ui text-[11px] uppercase tracking-wider text-muted mb-2">
			Dimanches et solennités
		</h3>
		{@render cardList(sundayCards)}
	{/if}
	{#if fixedCards.length > 0}
		<h3 class="font-ui text-[11px] uppercase tracking-wider text-muted mb-2 mt-5">Fêtes fixes</h3>
		{@render cardList(fixedCards)}
	{/if}
{/if}

<style>
	.reading-text :global(p) {
		margin: 0 0 0.5em;
	}
	.reading-text :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
