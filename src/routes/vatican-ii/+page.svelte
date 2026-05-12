<script lang="ts">
	import MetaTags from '$lib/components/ui/MetaTags.svelte';
	import type { PageData } from './$types';
	import type { VatIIDocKind } from '$lib/data/types';

	let { data }: { data: PageData } = $props();

	const KIND_LABEL: Record<VatIIDocKind, string> = {
		constitution: 'Constitutions',
		decree: 'Décrets',
		declaration: 'Déclarations'
	};
	const KIND_ORDER: VatIIDocKind[] = ['constitution', 'decree', 'declaration'];

	const grouped = $derived.by(() => {
		const out: Record<VatIIDocKind, typeof data.structure.docs> = {
			constitution: [],
			decree: [],
			declaration: []
		};
		for (const d of data.structure.docs) out[d.kind].push(d);
		for (const k of KIND_ORDER) out[k].sort((a, b) => a.date.localeCompare(b.date));
		return out;
	});

	const totalParagraphs = $derived(data.structure.docs.reduce((s, d) => s + d.totalParagraphs, 0));
	const presentCount = $derived(data.structure.docs.filter((d) => d.present).length);
</script>

<MetaTags
	title="Concile Vatican II"
	description="Les seize documents du concile Vatican II (1962-1965) : 4 constitutions, 9 décrets et 3 déclarations."
	image="/img/bibliotheque/vatican-ii.webp"
	schema={{
		kind: 'book',
		name: 'Documents du concile Vatican II',
		datePublished: '1965',
		about:
			"Constitutions, décrets et déclarations du XXIᵉ concile œcuménique de l'Église catholique"
	}}
/>

<main class="vii-index">
	<header class="hero">
		<p class="hero-kicker">Concile œcuménique · 1962–1965</p>
		<h1 class="hero-title">Vatican II</h1>
		<p class="hero-lede">
			Les seize documents du XXI<sup>e</sup> concile œcuménique (quatre constitutions, neuf décrets
			et trois déclarations) promulgués entre 1963 et 1965 sous Jean XXIII et Paul VI.
			{presentCount} documents disponibles ({totalParagraphs} paragraphes).
		</p>
	</header>

	{#each KIND_ORDER as kind (kind)}
		<section class="group">
			<header class="group-head">
				<h2 class="group-title">{KIND_LABEL[kind]}</h2>
				<span class="group-count">
					{grouped[kind].filter((d) => d.present).length} / {grouped[kind].length}
				</span>
			</header>
			<ul class="docs">
				{#each grouped[kind] as doc (doc.slug)}
					<li>
						{#if doc.present}
							<a class="doc-row" href={`/vatican-ii/${doc.slug}`}>
								<span class="doc-eyebrow">
									<span class="doc-abbr">{doc.abbr}</span>
									<span class="doc-date">{doc.date.slice(0, 4)}</span>
								</span>
								<span class="doc-title">{doc.title}</span>
								<span class="doc-subtitle">{doc.subtitle}</span>
								<span class="doc-arrow" aria-hidden="true">→</span>
							</a>
						{:else}
							<div class="doc-row doc-row-missing">
								<span class="doc-eyebrow">
									<span class="doc-abbr">{doc.abbr}</span>
									<span class="doc-date">{doc.date.slice(0, 4)}</span>
								</span>
								<span class="doc-title">{doc.title}</span>
								<span class="doc-subtitle">{doc.subtitle}</span>
								<span class="doc-missing">à venir</span>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</main>

<style>
	.vii-index {
		max-width: 900px;
		margin: 0 auto;
		padding: clamp(0.75rem, 3vw, 2rem) clamp(1.25rem, 4vw, 2.5rem);
		color: var(--color-fg);
		font-family: var(--font-body);
	}
	.hero {
		text-align: center;
		margin-bottom: clamp(2rem, 5vw, 3.5rem);
	}
	.hero-kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 0.85rem;
	}
	.hero-title {
		font-family: var(--font-heading);
		font-size: clamp(2.4rem, 6vw, 3.8rem);
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: -0.01em;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.hero-lede {
		max-width: 56ch;
		margin: 1.25rem auto 0;
		font-style: italic;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--color-subtle);
	}

	.group {
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		padding-top: 1.5rem;
		margin-top: 2.5rem;
	}
	.group-head {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.group-title {
		font-family: var(--font-heading);
		font-size: 1.35rem;
		font-weight: 700;
		margin: 0;
	}
	.group-count {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin-left: auto;
		font-variant-numeric: tabular-nums;
	}

	.docs {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.doc-row {
		display: grid;
		grid-template-columns: 5rem 1fr auto;
		grid-template-rows: auto auto;
		row-gap: 0.1rem;
		align-items: baseline;
		gap: 0.85rem;
		padding: 0.7rem 0.85rem;
		text-decoration: none;
		color: var(--color-fg);
		border-radius: 4px;
		transition:
			background-color 120ms ease,
			color 120ms ease;
	}
	.doc-row:hover {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		color: var(--color-accent);
	}
	.doc-row-missing {
		opacity: 0.5;
		cursor: default;
	}
	.doc-eyebrow {
		grid-row: 1 / 3;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15rem;
		font-family: var(--font-ui);
		font-variant-numeric: tabular-nums;
	}
	.doc-abbr {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: var(--color-accent);
	}
	.doc-row:hover .doc-abbr {
		color: var(--color-accent);
	}
	.doc-date {
		font-size: 0.68rem;
		color: var(--color-muted);
	}
	.doc-title {
		grid-column: 2;
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 1.05rem;
		font-weight: 600;
		line-height: 1.2;
	}
	.doc-subtitle {
		grid-column: 2;
		font-family: var(--font-body);
		font-size: 0.85rem;
		line-height: 1.4;
		color: var(--color-subtle);
	}
	.doc-arrow {
		grid-row: 1 / 3;
		grid-column: 3;
		color: var(--color-muted);
		font-size: 0.85rem;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.doc-row:hover .doc-arrow {
		transform: translateX(3px);
		color: var(--color-accent);
	}
	.doc-missing {
		grid-row: 1 / 3;
		grid-column: 3;
		font-family: var(--font-ui);
		font-size: 0.65rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
</style>
