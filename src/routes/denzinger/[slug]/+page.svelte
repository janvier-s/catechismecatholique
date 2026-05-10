<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { frenchPunct } from '$lib/utils/typography';
	import { linkifyVerseRefs } from '$lib/utils/bibleBookSlug';
	import { openPanel } from '$lib/stores/studyPanel';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const unit = $derived(data.unit);

	function onEntryClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		// Click on the prominent DH number opens the study panel.
		const numLink = target.closest<HTMLElement>('a.entry-num');
		if (numLink) {
			e.preventDefault();
			const article = numLink.closest<HTMLElement>('article.entry');
			const id = article?.id ?? '';
			const m = id.match(/^dh-(\d+)$/);
			if (m) {
				openPanel({ kind: 'denzinger-entry', n: parseInt(m[1]!, 10) }, 'denzinger-cross-refs');
			}
		}
	}

	// Set of valid DH numbers across the whole corpus, used to validate
	// candidate cross-references (avoids treating dates / footnote numerals
	// as DH refs when they happen to fall in the right range).
	const validNs = $derived(new Set(data.structure.all_numbers));

	function linkifyDhRefs(html: string): string {
		// Bare 2-4 digit numbers in body prose that match a known DH number.
		// Skip numbers inside HTML tags by splitting on tags first.
		return html
			.split(/(<[^>]*>)/)
			.map((part, i) => {
				if (i % 2 !== 0) return part; // tag pass-through
				return part.replace(/(?<![\w/-])(\d{2,4})(?![\w/-])/g, (m, num: string) => {
					const n = parseInt(num, 10);
					if (!validNs.has(n)) return m;
					return `<a class="ref-dh" href="/denzinger/n/${n}" data-dh="${n}">${m}</a>`;
				});
			})
			.join('');
	}

	function renderEntry(html: string): string {
		// Apply Bible-ref linkification, then DH cross-ref linkification,
		// then French-punct NBSP normalization.
		return frenchPunct(linkifyDhRefs(linkifyVerseRefs(html)));
	}
</script>

<svelte:head>
	<title>{unit.title} · Denzinger</title>
	<meta
		name="description"
		content={`${unit.title} — ${unit.entries.length} entrées du Denzinger (DH ${unit.entries[0]?.n}–${unit.entries[unit.entries.length - 1]?.n}).`}
	/>
</svelte:head>

<main class="dz-unit" use:scrollSpy>
	<header class="head">
		<BreadcrumbRail
			crumbs={[
				{ href: '/denzinger', title: 'Denzinger' },
				{ href: `/denzinger/${unit.slug}`, title: unit.title }
			]}
		/>
		{#if unit.breadcrumb.length > 1}
			<nav class="trail" aria-label="Position dans la hiérarchie">
				{#each unit.breadcrumb.slice(0, -1) as crumb (crumb)}
					<span class="trail-item">{crumb}</span>
					<span class="trail-sep" aria-hidden="true">›</span>
				{/each}
				<span class="trail-item is-current">{unit.breadcrumb[unit.breadcrumb.length - 1]}</span>
			</nav>
		{/if}
		<h1 class="title">{frenchPunct(unit.title)}</h1>
		<p class="meta">
			{unit.entries.length} entrée{unit.entries.length > 1 ? 's' : ''}
			{#if unit.entries.length > 0}
				· DH {unit.entries[0]!.n}{unit.entries.length > 1
					? `–${unit.entries[unit.entries.length - 1]!.n}`
					: ''}
			{/if}
		</p>
	</header>

	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<section class="body" aria-label="Texte de la section" onclick={onEntryClick}>
		{#each unit.entries as entry, ei (entry.n)}
			{@const prev = unit.entries[ei - 1]}
			{@const showSection = entry.section && (ei === 0 || prev?.section !== entry.section)}
			{@const showChapter = entry.chapter && (ei === 0 || prev?.chapter !== entry.chapter)}
			{#if showSection}
				<h2 class="section-h2" id="dh-{entry.n}-section">{frenchPunct(entry.section!)}</h2>
			{/if}
			{#if showChapter}
				<h3 class="chapter-h3">{frenchPunct(entry.chapter!)}</h3>
			{/if}
			<article class="entry" id="dh-{entry.n}">
				<a class="entry-num" href="#dh-{entry.n}" aria-label="Permalink DH {entry.n}">
					<span class="entry-num-value">{entry.n}</span>
				</a>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="entry-body">{@html renderEntry(entry.html)}</div>
			</article>
		{/each}
	</section>

	<nav class="pager" aria-label="Sections adjacentes dans la même partie">
		{#if unit.prev}
			<NavCard
				href="/denzinger/{unit.prev.slug}"
				title={unit.prev.title}
				eyebrow="Section précédente"
				direction="prev"
			/>
		{:else}
			<span></span>
		{/if}
		{#if unit.next}
			<NavCard
				href="/denzinger/{unit.next.slug}"
				title={unit.next.title}
				eyebrow="Section suivante"
				direction="next"
			/>
		{:else}
			<span></span>
		{/if}
	</nav>
</main>

<style>
	.dz-unit {
		max-width: 800px;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1.25rem, 4vw, 2.5rem) 4rem;
		color: var(--color-fg);
		font-family: var(--font-body);
	}
	.head {
		text-align: center;
		margin-bottom: 2.5rem;
	}
	.trail {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 1rem 0 0.5rem;
		display: inline-flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		justify-content: center;
		max-width: 60ch;
	}
	.trail-item.is-current {
		color: var(--color-accent);
		font-weight: 600;
	}
	.trail-sep {
		color: var(--color-border);
	}
	.title {
		font-family: var(--font-heading);
		font-size: clamp(1.75rem, 4vw, 2.5rem);
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.005em;
		margin: 0.6rem 0 0.5rem;
		color: var(--color-heading, var(--color-fg));
	}
	.meta {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 500;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0;
	}

	.body {
		margin-top: 2rem;
	}

	.entry {
		margin: 1.25rem 0 1.5rem;
		scroll-margin-top: 5rem;
	}
	.entry-num {
		display: inline-block;
		text-decoration: none;
		color: var(--color-accent);
		font-family: var(--font-ui);
		font-size: 0.85rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums lining-nums;
		margin: 0 0 0.4rem;
	}
	.entry-num-value {
		font-family: var(--font-heading);
		font-size: 1.5rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums lining-nums;
		line-height: 1;
	}
	.entry-num:hover .entry-num-value {
		text-decoration: underline;
	}

	/* Section h2 — top-level decree/doctrine heading
	   ("Doctrine sur le sacrement de la pénitence", "Décret sur la
	   justification") — clearly delineates a major sub-division. */
	.section-h2 {
		font-family: var(--font-heading);
		font-size: 1.45rem;
		font-weight: 700;
		line-height: 1.3;
		color: var(--color-heading, var(--color-fg));
		margin: 3rem 0 1.5rem;
		padding-bottom: 0.65rem;
		border-bottom: 2px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
		scroll-margin-top: 5rem;
	}
	.section-h2:first-of-type {
		margin-top: 1rem;
	}
	/* Chapter h3 — subdivision under a section ("Chap. 5. Le culte…",
	   "Canons sur le sacrement de baptême"). Quieter than section-h2. */
	.chapter-h3 {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 1.05rem;
		font-weight: 600;
		line-height: 1.45;
		color: var(--color-heading, var(--color-fg));
		margin: 2rem 0 0.75rem;
	}
	.entry-body {
		min-width: 0;
		font-size: 1rem;
		line-height: 1.8;
	}
	.entry-body :global(p) {
		margin: 0 0 1em;
	}
	.entry-body :global(a.verse-ref),
	.entry-body :global(a.ref-dh) {
		color: inherit;
		text-decoration: underline dotted var(--color-muted);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.18em;
		transition: color 120ms ease;
	}
	.entry-body :global(a.verse-ref:hover),
	.entry-body :global(a.ref-dh:hover) {
		color: var(--color-accent);
		text-decoration: underline solid var(--color-accent);
	}
	.entry-body :global(a.ref-dh) {
		font-family: var(--font-ui);
		font-weight: 600;
		font-size: 0.9em;
	}
	.entry-body :global(p:last-child) {
		margin-bottom: 0;
	}

	.pager {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 3rem;
	}
	@media (max-width: 640px) {
		.pager {
			grid-template-columns: 1fr;
		}
	}
</style>
