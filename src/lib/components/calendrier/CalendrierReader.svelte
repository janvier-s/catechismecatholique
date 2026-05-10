<script lang="ts">
	import type {
		CalendrierFeast,
		CalendrierFixedFeast,
		CalendrierSeason,
		Paragraph
	} from '$lib/data/types';
	import { loadParagraph } from '$lib/data/loaders';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { prefs } from '$lib/stores/prefs';
	import { getFontById } from '$lib/data/fonts';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';

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

	const expanded = new SvelteSet<string>();
	const paragraphs = new SvelteMap<string, Paragraph[] | null>();

	function clusterKey(feastSlug: string, i: number): string {
		return `${feastSlug}-${i}`;
	}

	async function fetchParagraphs(key: string, paragraphNumbers: number[]) {
		if (paragraphs.has(key)) return;
		paragraphs.set(key, null); // loading
		try {
			const loaded = await Promise.all(paragraphNumbers.map((n) => loadParagraph(n)));
			paragraphs.set(key, loaded);
		} catch {
			paragraphs.set(key, []);
		}
	}

	async function toggleCluster(
		feast: CalendrierFeast | CalendrierFixedFeast,
		cluster: { i: number; paragraphs: number[] }
	) {
		const key = clusterKey(feast.slug, cluster.i);
		if (expanded.has(key)) {
			expanded.delete(key);
			return;
		}
		expanded.add(key);
		await fetchParagraphs(key, cluster.paragraphs);
	}

	function capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	function stripNotes(html: string): string {
		return html.replace(/\s*<sup[^>]*>[\s\S]*?<\/sup>/g, '');
	}

	async function toggleAllInFeast(feast: CalendrierFeast | CalendrierFixedFeast) {
		const allOpen =
			feast.clusters.length > 0 &&
			feast.clusters.every((c) => expanded.has(clusterKey(feast.slug, c.i)));
		if (allOpen) {
			for (const c of feast.clusters) expanded.delete(clusterKey(feast.slug, c.i));
		} else {
			const toFetch: { key: string; ns: number[] }[] = [];
			for (const c of feast.clusters) {
				const key = clusterKey(feast.slug, c.i);
				if (!expanded.has(key)) {
					expanded.add(key);
					if (!paragraphs.has(key)) toFetch.push({ key, ns: c.paragraphs });
				}
			}
			await Promise.all(toFetch.map((t) => fetchParagraphs(t.key, t.ns)));
		}
	}
</script>

{#snippet feastBlock(feast: CalendrierFeast | CalendrierFixedFeast)}
	<article class="feast">
		<header class="feast-head">
			{#if showDates && 'date' in feast}
				<p class="feast-date">{feast.date}</p>
			{/if}
			<h2 class="feast-title" id="f-{feast.slug}">{feast.title}</h2>
			{#if feast.clusters.length > 1}
				<button
					type="button"
					class="open-all"
					onclick={() => toggleAllInFeast(feast)}
					aria-label="Ouvrir ou fermer toutes les sections"
				>
					{feast.clusters.every((c) => expanded.has(clusterKey(feast.slug, c.i)))
						? 'Tout fermer'
						: 'Tout ouvrir'}
				</button>
			{/if}
		</header>

		<ul class="clusters">
			{#each feast.clusters as cluster (cluster.i)}
				{@const key = clusterKey(feast.slug, cluster.i)}
				{@const isOpen = expanded.has(key)}
				{@const loaded = paragraphs.get(key)}
				<li class="cluster">
					<h3 class="cluster-heading" id="c-{feast.slug}-{cluster.i}">
						<button
							type="button"
							class="cluster-head"
							class:is-open={isOpen}
							onclick={() => toggleCluster(feast, cluster)}
							aria-expanded={isOpen}
						>
							<span class="caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
							<span class="cluster-theme">{capitalize(cluster.theme)}</span>
							<span class="cluster-refs">{cluster.refs}</span>
						</button>
					</h3>
					{#if isOpen}
						<div class="cluster-body">
							{#if loaded === null}
								<p class="loading">Chargement…</p>
							{:else if loaded && loaded.length > 0}
								{#each loaded as p (p.number)}
									<div class="par">
										<a class="par-num" href="/cec/{p.number}">§{p.number}</a>
										<div class="par-text">
											<!-- eslint-disable-next-line svelte/no-at-html-tags -->
											{@html stripNotes(p.text_html)}
										</div>
									</div>
								{/each}
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</article>
{/snippet}

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
					{@render feastBlock(feast)}
				{/each}
			</section>
		{/each}
	{:else}
		{#each feasts as feast (feast.slug)}
			{@render feastBlock(feast)}
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

	.feast {
		margin-bottom: 2.25rem;
	}
	.feast-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 0.85rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.feast-date {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0;
		flex: none;
	}
	.feast-title {
		font-family: var(--font-heading);
		font-size: 1.3rem;
		font-weight: 600;
		line-height: 1.25;
		color: var(--color-fg);
		margin: 0;
		flex: 1 1 auto;
		min-width: 0;
	}
	.open-all {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.3rem 0.6rem;
		cursor: pointer;
		transition:
			color 150ms ease,
			border-color 150ms ease;
		flex: none;
	}
	.open-all:hover {
		color: var(--color-accent);
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}

	.clusters {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.cluster {
		margin-bottom: 0.4rem;
	}
	.cluster-heading {
		margin: 0;
		font-size: inherit;
		font-weight: inherit;
	}
	.cluster-head {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		width: 100%;
		text-align: left;
		background: none;
		border: 0;
		padding: 0.5rem 0.4rem;
		border-radius: 3px;
		cursor: pointer;
		font-family: var(--font-body);
		color: inherit;
		transition: background-color 120ms ease;
	}
	.cluster-head:hover {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
	}
	.cluster-head.is-open {
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}
	.caret {
		flex: none;
		font-size: 0.85rem;
		color: var(--color-muted);
		width: 0.9rem;
		text-align: center;
	}
	.cluster-head.is-open .caret {
		color: var(--color-accent);
	}
	.cluster-theme {
		flex: 1;
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.97rem;
		line-height: 1.5;
		color: var(--color-subtle);
	}
	.cluster-head.is-open .cluster-theme {
		color: var(--color-fg);
	}
	.cluster-refs {
		flex: none;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums lining-nums;
		letter-spacing: 0.02em;
		color: var(--color-accent);
		white-space: nowrap;
	}

	.cluster-body {
		padding: 0.5rem 0.4rem 0.85rem 1.6rem;
	}
	.loading {
		font-family: var(--font-ui);
		font-size: 0.85rem;
		color: var(--color-muted);
		font-style: italic;
		margin: 0.5rem 0;
	}
	.par {
		display: flex;
		gap: 0.85rem;
		padding: 0.55rem 0;
		border-top: 1px dashed color-mix(in srgb, var(--color-border) 70%, transparent);
	}
	.par:first-child {
		border-top: 0;
	}
	.par-num {
		flex: none;
		width: 3rem;
		font-family: var(--font-ui);
		font-size: 0.8rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-accent);
		text-decoration: none;
		padding-top: 0.15rem;
	}
	.par-num:hover {
		text-decoration: underline;
	}
	.par-text {
		flex: 1;
		font-family: var(--font-body);
		font-size: 0.97rem;
		line-height: 1.65;
		color: var(--color-fg);
		min-width: 0;
	}
	.par-text :global(p) {
		margin: 0 0 0.65em;
	}
	.par-text :global(p:last-child) {
		margin-bottom: 0;
	}

	@media (max-width: 640px) {
		.feast-head {
			flex-direction: column;
			align-items: flex-start;
		}
		.cluster-head {
			flex-wrap: wrap;
		}
		.cluster-refs {
			margin-left: 1.6rem;
			color: var(--color-muted);
		}
		.par {
			flex-direction: column;
			gap: 0.25rem;
		}
		.par-num {
			width: auto;
			padding-top: 0;
		}
	}
</style>
