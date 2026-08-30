<script lang="ts">
	import type {
		CalendrierFeast,
		CalendrierFixedFeast,
		CalendrierReadingsEntry,
		CalendrierYearKey,
		Paragraph
	} from '$lib/data/types';
	import { loadParagraph, loadCalendrierReading } from '$lib/data/loaders';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';

	let {
		feast,
		yearKey,
		showDates = false
	}: {
		feast: CalendrierFeast | CalendrierFixedFeast;
		yearKey?: CalendrierYearKey;
		showDates?: boolean;
	} = $props();

	let readingsExpanded = $state(false);
	let readingsState: 'idle' | 'loading' | 'unavailable' | 'error' | CalendrierReadingsEntry =
		$state('idle');

	const READING_LABELS: Record<string, string> = {
		lecture_1: 'Première lecture',
		lecture_2: 'Deuxième lecture',
		psaume: 'Psaume',
		cantique: 'Cantique',
		sequence: 'Séquence',
		evangile: 'Évangile'
	};

	async function toggleReadings() {
		readingsExpanded = !readingsExpanded;
		if (!readingsExpanded || (readingsState !== 'idle' && readingsState !== 'error')) return;
		readingsState = 'loading';
		try {
			const entry = await loadCalendrierReading(feast.slug, yearKey);
			readingsState = entry ?? 'unavailable';
		} catch {
			readingsState = 'error';
		}
	}

	const expanded = new SvelteSet<number>();
	const paragraphs = new SvelteMap<number, Paragraph[] | null>();

	async function fetchParagraphs(i: number, paragraphNumbers: number[]) {
		if (paragraphs.has(i)) return;
		paragraphs.set(i, null); // loading
		try {
			const loaded = await Promise.all(paragraphNumbers.map((n) => loadParagraph(n)));
			paragraphs.set(i, loaded);
		} catch {
			paragraphs.set(i, []);
		}
	}

	async function toggleCluster(cluster: { i: number; paragraphs: number[] }) {
		if (expanded.has(cluster.i)) {
			expanded.delete(cluster.i);
			return;
		}
		expanded.add(cluster.i);
		await fetchParagraphs(cluster.i, cluster.paragraphs);
	}

	function capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	function stripNotes(html: string): string {
		return html.replace(/\s*<sup[^>]*>[\s\S]*?<\/sup>/g, '');
	}

	async function toggleAllInFeast() {
		const allOpen = feast.clusters.length > 0 && feast.clusters.every((c) => expanded.has(c.i));
		if (allOpen) {
			for (const c of feast.clusters) expanded.delete(c.i);
		} else {
			const toFetch: { i: number; ns: number[] }[] = [];
			for (const c of feast.clusters) {
				if (!expanded.has(c.i)) {
					expanded.add(c.i);
					if (!paragraphs.has(c.i)) toFetch.push({ i: c.i, ns: c.paragraphs });
				}
			}
			await Promise.all(toFetch.map((t) => fetchParagraphs(t.i, t.ns)));
		}
	}
</script>

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
				onclick={toggleAllInFeast}
				aria-label="Ouvrir ou fermer toutes les sections"
			>
				{feast.clusters.every((c) => expanded.has(c.i)) ? 'Tout fermer' : 'Tout ouvrir'}
			</button>
		{/if}
	</header>

	<section class="readings">
		<h3 class="cluster-heading">
			<button
				type="button"
				class="readings-toggle"
				class:is-open={readingsExpanded}
				onclick={toggleReadings}
				aria-expanded={readingsExpanded}
			>
				<span class="caret" aria-hidden="true">{readingsExpanded ? '▾' : '▸'}</span>
				<span class="readings-label">Lectures du jour</span>
			</button>
		</h3>
		{#if readingsExpanded}
			<div class="readings-body">
				{#if readingsState === 'loading'}
					<p class="loading">Chargement…</p>
				{:else if readingsState === 'unavailable'}
					<p class="status">Lectures indisponibles pour cette fête.</p>
				{:else if readingsState === 'error'}
					<p class="status">Impossible de charger les lectures. Réessayez.</p>
				{:else if readingsState !== 'idle'}
					{#each readingsState.lectures as lecture, i (i)}
						<article class="reading">
							<p class="reading-head">
								<span class="reading-type">{READING_LABELS[lecture.type] ?? lecture.type}</span>
								<span class="reading-ref">{lecture.ref}</span>
							</p>
							{#if lecture.intro_lue}
								<p class="reading-intro">{lecture.intro_lue}</p>
							{:else if lecture.titre}
								<p class="reading-intro">{lecture.titre}</p>
							{/if}
							{#if lecture.type === 'psaume' && lecture.refrain_psalmique}
								<div class="reading-refrain reader-prose">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html lecture.refrain_psalmique}
								</div>
							{/if}
							{#if lecture.type === 'evangile' && lecture.verset_evangile}
								<div class="reading-verset reader-prose">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html lecture.verset_evangile}
									{#if lecture.ref_verset}<span class="verset-ref">{lecture.ref_verset}</span>{/if}
								</div>
							{/if}
							<div class="reading-contenu reader-prose">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html lecture.contenu}
							</div>
						</article>
					{/each}
				{/if}
			</div>
		{/if}
	</section>

	<ul class="clusters">
		{#each feast.clusters as cluster (cluster.i)}
			{@const isOpen = expanded.has(cluster.i)}
			{@const loaded = paragraphs.get(cluster.i)}
			<li class="cluster">
				<h3 class="cluster-heading" id="c-{feast.slug}-{cluster.i}">
					<button
						type="button"
						class="cluster-head"
						class:is-open={isOpen}
						onclick={() => toggleCluster(cluster)}
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

<style>
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

	.readings {
		margin-bottom: 1.25rem;
	}
	.readings-toggle {
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
		font-family: var(--font-ui);
		transition: background-color 120ms ease;
	}
	.readings-toggle:hover {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
	}
	.readings-toggle.is-open {
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}
	.readings-toggle .caret {
		flex: none;
		font-size: 0.85rem;
		color: var(--color-muted);
		width: 0.9rem;
		text-align: center;
	}
	.readings-toggle.is-open .caret {
		color: var(--color-accent);
	}
	.readings-label {
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-subtle);
	}
	.readings-toggle.is-open .readings-label {
		color: var(--color-fg);
	}
	.readings-body {
		padding: 0.5rem 0.4rem 0.25rem 1.6rem;
	}
	.reading {
		padding: 0.75rem 0;
		border-top: 1px dashed color-mix(in srgb, var(--color-border) 70%, transparent);
	}
	.reading:first-child {
		border-top: 0;
	}
	.reading-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.6rem;
		margin: 0 0 0.3rem;
	}
	.reading-type {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-subtle);
	}
	.reading-ref {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums lining-nums;
		color: var(--color-accent);
		white-space: nowrap;
	}
	.reading-intro {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.88rem;
		color: var(--color-muted);
		margin: 0 0 0.5rem;
	}
	.reading-refrain,
	.reading-verset {
		font-style: italic;
		font-size: var(--reader-font-size, 17px);
		color: var(--color-muted);
		margin: 0 0 0.5rem;
	}
	.verset-ref {
		margin-left: 0.4rem;
		font-family: var(--font-ui);
		font-style: normal;
		font-size: 0.78rem;
		color: var(--color-accent);
	}
	.reading-contenu {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.6);
		color: var(--color-fg);
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
