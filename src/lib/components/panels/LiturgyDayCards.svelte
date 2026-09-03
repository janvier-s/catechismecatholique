<script lang="ts" module>
	import type { CalendrierSeason, CecLiturgyCluster, CecLiturgyOccasion } from '$lib/data/types';

	const SEASON_LABELS: Record<CalendrierSeason, string> = {
		avent: "Temps de l'Avent",
		noel: 'Temps de Noël',
		careme: 'Temps du Carême',
		pascal: 'Triduum & Temps Pascal',
		solennite: 'Solennités du Seigneur',
		ordinaire: 'Temps Ordinaire'
	};

	// Cards are grouped by section, then ordered by season so the list reads in
	// the order of the year rather than in the order of the source file (which
	// runs through année A whole, then B, then C).
	const SEASON_ORDER: CalendrierSeason[] = [
		'avent',
		'noel',
		'careme',
		'pascal',
		'solennite',
		'ordinaire'
	];

	// Spelled out rather than abbreviated: the labels render uppercase, the way
	// the feast pages set them.
	const READING_LABELS: Record<string, string> = {
		lecture_1: 'Première lecture',
		lecture_2: 'Deuxième lecture',
		lecture_3: 'Troisième lecture',
		lecture_4: 'Quatrième lecture',
		lecture_5: 'Cinquième lecture',
		lecture_6: 'Sixième lecture',
		lecture_7: 'Septième lecture',
		psaume: 'Psaume',
		cantique: 'Cantique',
		epitre: 'Épître',
		evangile: 'Évangile',
		sequence: 'Séquence',
		entree_messianique: 'Entrée messianique'
	};

	/**
	 * A liturgical day as the cards render it. Widens `CecLiturgyOccasion` with
	 * the ferial cycle, which the CEC index never carries (it covers no
	 * weekdays) but the verse index does · `feastHref` needs it to build the
	 * /feries/ route.
	 */
	export type LiturgyCardOccasion = CecLiturgyOccasion & { weekdayCycle?: 'I' | 'II' };

	/**
	 * One card is one day of the calendar. A Sunday kept in all three années
	 * yields one card carrying its three occasions, not three near-identical
	 * ones · the année pills switch between them.
	 */
	export type Card = { key: string; years: LiturgyCardOccasion[] };

	/**
	 * The same day is titled "Solennité de l'Ascension du Seigneur" in année A
	 * and "La Solennité de l'Ascension du Seigneur" in B and C, with slugs to
	 * match, so cards are grouped on a normalised title rather than the slug.
	 */
	function dayKey(o: LiturgyCardOccasion): string {
		return o.title
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.trim()
			.replace(/^(?:la|le|les|l) /, '');
	}

	export function toCards(list: LiturgyCardOccasion[]): Card[] {
		const cards: Card[] = [];
		const byKey: Record<string, Card> = {};
		for (const o of list) {
			const key = dayKey(o);
			let card = byKey[key];
			if (!card) {
				card = { key, years: [] };
				byKey[key] = card;
				cards.push(card);
			}
			card.years.push(o);
		}
		return cards;
	}

	export function bySeason(cards: Card[]): Card[] {
		return [...cards].sort(
			(a, b) => SEASON_ORDER.indexOf(a.years[0]!.season) - SEASON_ORDER.indexOf(b.years[0]!.season)
		);
	}
</script>

<script lang="ts">
	import { openPanel } from '$lib/stores/studyPanel';
	import { loadCalendrierReading } from '$lib/data/loaders';
	import type { CalendrierReadingsEntry } from '$lib/data/types';
	import { LITURGICAL_COLOR_VAR } from '$lib/components/calendrier/liturgicalColor';
	import { bibleRefUrl } from '$lib/utils/linkifyRefs';
	import { SvelteMap } from 'svelte/reactivity';

	let {
		cards,
		highlight = new Set<number>(),
		showParagraphs = true
	}: {
		cards: Card[];
		highlight?: Set<number>;
		showParagraphs?: boolean;
	} = $props();

	/** Card key to index into its `years`. */
	const picked = new SvelteMap<string, number>();
	let expanded: string | null = $state(null);
	let readingText: CalendrierReadingsEntry | null = $state(null);
	let readingBusy = $state(false);
	/** Guards against an earlier reading fetch landing after a later one. */
	let readingRequest = 0;

	function shown(card: Card): LiturgyCardOccasion {
		return card.years[picked.get(card.key) ?? 0] ?? card.years[0]!;
	}

	function meta(card: Card): string {
		const o = card.years[0]!;
		const season = SEASON_LABELS[o.season];
		if (o.weekdayCycle) return `${season} · Semaine ${o.weekdayCycle}`;
		if (o.date) return `${season} · ${o.date}`;
		if (!o.cycle) return season;
		const years = card.years.flatMap((y) => (y.cycle ? [y.cycle.toUpperCase()] : []));
		return `${season} · ${years.length > 1 ? 'Années' : 'Année'} ${years.join(', ')}`;
	}

	/** Each kind of day lives at its own route · see /calendrier-liturgique. */
	function feastHref(o: LiturgyCardOccasion): string {
		if (o.weekdayCycle)
			return `/calendrier-liturgique/feries/${o.weekdayCycle.toLowerCase()}/${o.slug}`;
		if (o.cycle) return `/calendrier-liturgique/${o.cycle}/${o.slug}`;
		if (o.date) return `/calendrier-liturgique/solennites/${o.slug}`;
		return `/calendrier-liturgique/propre/${o.slug}`;
	}

	function refLabel(r: { type: string }): string {
		return READING_LABELS[r.type] ?? r.type;
	}

	// The first letter, not the first character: a good third of the themes open
	// on a quotation mark ("“l'obéissance de la foi”").
	function capitalize(s: string): string {
		return s.replace(/\p{L}/u, (c) => c.toUpperCase());
	}

	// Days of the propre carry raw CEC heading titles ("IV. La portée de la foi
	// en Dieu Unique"): the numbering means something in the Catechism's own
	// outline but is noise once lifted out into a list of themes.
	const NUMBERING_PREFIX_RE = /^\s*(?:[IVXLCDM]{1,8}|\d{1,4})[.)]\s*/;
	function themeLabel(o: LiturgyCardOccasion, cluster: CecLiturgyCluster): string {
		const raw = o.cycle || o.date ? cluster.theme : cluster.theme.replace(NUMBERING_PREFIX_RE, '');
		return capitalize(raw);
	}

	type Token = { label: string; target: number; highlighted: boolean };

	/**
	 * Folds a cluster's paragraphs back into the source's own notation
	 * (484-494, 2087), breaking whichever run holds a highlighted paragraph so it
	 * shows as a number of its own · a run links to its first paragraph.
	 */
	function tokens(paragraphs: number[]): Token[] {
		const sorted = [...new Set(paragraphs)].sort((a, b) => a - b);
		const out: Token[] = [];
		let i = 0;
		while (i < sorted.length) {
			const start = sorted[i]!;
			if (highlight.has(start)) {
				out.push({ label: String(start), target: start, highlighted: true });
				i++;
				continue;
			}
			let end = start;
			while (i + 1 < sorted.length && sorted[i + 1] === end + 1 && !highlight.has(sorted[i + 1]!)) {
				end = sorted[++i]!;
			}
			i++;
			out.push({
				label: start === end ? String(start) : `${start}-${end}`,
				target: start,
				highlighted: false
			});
		}
		return out;
	}

	async function loadText(o: LiturgyCardOccasion): Promise<void> {
		const request = ++readingRequest;
		readingText = null;
		if (!o.readingsKey) return;
		readingBusy = true;
		try {
			// Ferial days carry their cycle in `weekdayCycle`, not `cycle`, and
			// their reading files are keyed on it (`I--avent-1-jeudi.json`).
			// Passing `cycle` alone degrades the key to the bare slug, which no
			// weekday reading file uses.
			const entry = await loadCalendrierReading(o.slug, o.weekdayCycle ?? o.cycle);
			if (request === readingRequest) readingText = entry;
		} finally {
			if (request === readingRequest) readingBusy = false;
		}
	}

	async function toggle(card: Card): Promise<void> {
		if (expanded === card.key) {
			expanded = null;
			readingRequest++;
			readingText = null;
			return;
		}
		expanded = card.key;
		await loadText(shown(card));
	}

	async function pickYear(card: Card, i: number): Promise<void> {
		picked.set(card.key, i);
		if (expanded === card.key) await loadText(shown(card));
	}
</script>

<ul class="cards">
	{#each cards as card (card.key)}
		{@const o = shown(card)}
		<li class="card" style:border-color={`var(${LITURGICAL_COLOR_VAR[o.color]})`}>
			<a href={feastHref(o)} target="_blank" rel="noopener noreferrer" class="card-title"
				>{card.years[0]!.title}</a
			>
			<p class="card-meta">{meta(card)}</p>

			{#if card.years.length > 1}
				<div class="years" role="group" aria-label="Année liturgique">
					{#each card.years as y, i (i)}
						<button
							type="button"
							class="year"
							class:is-active={o === y}
							aria-pressed={o === y}
							aria-label={`Année ${y.cycle?.toUpperCase() ?? i + 1}`}
							onclick={() => pickYear(card, i)}
						>
							{y.cycle?.toUpperCase() ?? i + 1}
						</button>
					{/each}
				</div>
			{/if}

			{#if showParagraphs}
				{#each o.clusters as cluster, ci (ci)}
					{@const holds = cluster.paragraphs.some((p) => highlight.has(p))}
					<p class="theme" class:is-current={holds}>{themeLabel(o, cluster)}</p>
					<p class="nums">
						{#each tokens(cluster.paragraphs) as t, ti (ti)}
							{#if ti > 0}<span class="sep">, </span>{/if}
							{#if t.highlighted}
								<span class="num is-current" aria-current="true">{t.label}</span>
							{:else}
								<button
									type="button"
									class="num"
									onclick={() => openPanel({ kind: 'paragraph', paragraph: t.target }, 'liturgie')}
								>
									{t.label}
								</button>
							{/if}
						{/each}
					</p>
				{/each}
			{/if}

			{#if o.readings && o.readings.length > 0}
				<p class="section-label">Lectures de la messe</p>
				<dl class="refs">
					{#each o.readings as r, ri (ri)}
						{@const url = bibleRefUrl(r.ref)}
						<dt>{refLabel(r)}</dt>
						<dd>
							{#if url}
								<a href={url} target="_blank" rel="noopener noreferrer">{r.ref}</a>
							{:else}
								{r.ref}
							{/if}
						</dd>
					{/each}
				</dl>
				{#if o.readingsKey}
					<button
						type="button"
						class="expand"
						onclick={() => toggle(card)}
						aria-expanded={expanded === card.key}
					>
						{expanded === card.key ? 'Masquer les textes' : 'Lire les textes'}
					</button>
				{/if}
			{/if}

			{#if expanded === card.key}
				{#if readingBusy}
					<p class="status">Chargement…</p>
				{:else if readingText}
					<div class="texts">
						{#each readingText.lectures as l, li (li)}
							<div>
								<p class="section-label">
									{refLabel(l)}{#if l.ref}<span class="text-ref">{l.ref}</span>{/if}
								</p>
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								<div class="reading-text">{@html l.contenu}</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="status">Les textes de ce jour ne sont pas disponibles.</p>
				{/if}
			{/if}
		</li>
	{/each}
</ul>

<style>
	.cards {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.card {
		border-left: 2px solid var(--color-border);
		padding-left: 12px;
		margin-bottom: 18px;
	}
	.card:last-child {
		margin-bottom: 0;
	}
	.card-title {
		font-family: var(--font-ui);
		font-size: 14px;
		font-weight: 600;
		line-height: 1.3;
		color: var(--color-fg);
		text-decoration: none;
	}
	.card-title:hover {
		color: var(--color-accent);
		text-decoration: underline;
	}
	.card-meta {
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-muted);
		margin: 2px 0 0;
	}

	.years {
		display: flex;
		gap: 4px;
		margin-top: 6px;
	}
	.year {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		line-height: 1;
		color: var(--color-muted);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		padding: 4px 8px;
		cursor: pointer;
		transition:
			color 120ms ease,
			border-color 120ms ease,
			background-color 120ms ease;
	}
	.year:hover {
		color: var(--color-accent);
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}
	.year.is-active {
		color: var(--color-accent);
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
	}

	.theme {
		font-family: var(--font-body);
		font-size: 14px;
		font-style: italic;
		line-height: 1.4;
		color: var(--color-subtle);
		margin: 10px 0 0;
	}
	/* The theme that put this day on the list, told apart from the rest of the
	   day's programme. */
	.theme.is-current {
		color: var(--color-fg);
		font-style: normal;
	}

	.nums {
		margin: 2px 0 0;
		font-family: var(--font-ui);
		font-size: 13px;
		font-variant-numeric: tabular-nums lining-nums;
		line-height: 1.5;
		color: var(--color-muted);
	}
	.num {
		font: inherit;
		background: none;
		border: 0;
		padding: 0;
		color: var(--color-accent);
		cursor: pointer;
	}
	.num:hover {
		text-decoration: underline;
	}
	.num.is-current {
		color: var(--color-fg);
		font-weight: 700;
		cursor: default;
	}
	.sep {
		color: var(--color-muted);
	}

	.section-label {
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 12px 0 0;
	}

	/* A scripture reference is a name, not a label · it keeps its own case
	   inside the uppercased heading. */
	.text-ref {
		text-transform: none;
		font-size: 11px;
		font-weight: 500;
		font-variant-numeric: tabular-nums lining-nums;
		color: var(--color-accent);
		margin-left: 6px;
	}

	.refs {
		display: grid;
		grid-template-columns: auto 1fr;
		column-gap: 10px;
		row-gap: 2px;
		margin: 4px 0 0;
	}
	.refs dt {
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-muted);
		align-self: baseline;
		padding-top: 1px;
	}
	.refs dd {
		margin: 0;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		font-variant-numeric: tabular-nums lining-nums;
		color: var(--color-accent);
	}
	.refs dd a {
		color: inherit;
		text-decoration: none;
	}
	.refs dd a:hover {
		text-decoration: underline;
	}

	.expand {
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-muted);
		background: none;
		border: 0;
		padding: 0;
		margin-top: 8px;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.expand:hover {
		color: var(--color-accent);
	}

	.status {
		font-family: var(--font-ui);
		font-size: 12px;
		font-style: italic;
		color: var(--color-muted);
		margin: 8px 0 0;
	}
	.texts {
		margin-top: 8px;
	}
	.texts > div + div {
		margin-top: 12px;
	}
	.reading-text {
		font-family: var(--font-body);
		font-size: 13px;
		line-height: 1.6;
		color: var(--color-fg);
		margin-top: 2px;
	}
	.reading-text :global(p) {
		margin: 0 0 0.5em;
	}
	.reading-text :global(p:last-child) {
		margin-bottom: 0;
	}

	@media (max-width: 380px) {
		.refs {
			grid-template-columns: 1fr;
			row-gap: 0;
		}
		.refs dd {
			margin-bottom: 4px;
		}
	}
</style>
