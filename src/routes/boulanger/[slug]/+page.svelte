<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { activeHeading } from '$lib/stores/scrollSpy';
	import { frenchPunct } from '$lib/utils/typography';
	import { linkifyVerseRefs } from '$lib/utils/bibleBookSlug';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const lesson = $derived(data.lesson);

	// Track the currently-visible Roman/sub heading so the mini-TOC can
	// highlight which part the reader is in.
	const activeAnchor = $derived($activeHeading?.id ?? null);

	const SECTION_LABELS: Record<string, string> = {
		mots: 'Mots',
		developpement: 'Développement',
		conclusion: 'Conclusion pratique',
		lectures: 'Lectures',
		questionnaire: 'Questionnaire',
		devoirs: 'Devoirs'
	};

	type Block = (typeof lesson.blocks)[number];

	function groupBySections(blocks: Block[]): { section: string; label: string; blocks: Block[] }[] {
		const groups: { section: string; label: string; blocks: Block[] }[] = [];
		for (const block of blocks) {
			const last = groups[groups.length - 1];
			if (!last || last.section !== block.section) {
				groups.push({
					section: block.section,
					label: SECTION_LABELS[block.section] ?? block.section,
					blocks: [block]
				});
			} else {
				last.blocks.push(block);
			}
		}
		return groups;
	}

	function renderBlock(html: string): string {
		return frenchPunct(linkifyVerseRefs(html));
	}

	const sections = $derived(groupBySections(lesson.blocks));
</script>

<svelte:head>
	<title>{lesson.title} · Catéchisme Boulanger</title>
	<meta
		name="description"
		content={`Leçon ${lesson.n} — ${lesson.title} · La Doctrine catholique, Abbé Boulenger (1927), Tome ${lesson.tome} : ${lesson.tome_title}.`}
	/>
</svelte:head>

<main class="bl-reader" use:scrollSpy>
	<header class="head">
		<BreadcrumbRail
			crumbs={[
				{ href: '/boulanger', title: 'Catéchisme Boulanger' },
				{ href: `/boulanger/${lesson.slug}`, kicker: `Leçon ${lesson.n}`, title: lesson.title }
			]}
		/>
		<p class="kicker">
			Tome {lesson.tome} · {lesson.tome_title} · Leçon {lesson.n}
		</p>
		<h1 class="title">{lesson.title}</h1>
	</header>

	{#if lesson.mini_toc.length > 0}
		<details class="mini-toc" open>
			<summary>
				<span class="mini-toc-label">Plan de la leçon</span>
				<span class="mini-toc-count">{lesson.mini_toc.length} parties</span>
			</summary>
			<ol class="mini-toc-list">
				{#each lesson.mini_toc as item (item.anchor)}
					<li class="mini-toc-item">
						<a
							class="mini-toc-link mini-toc-link-roman"
							class:is-active={activeAnchor === item.anchor}
							href="#{item.anchor}"
						>
							<span class="mini-toc-roman">{item.roman}.</span>
							<span class="mini-toc-text">{frenchPunct(item.label)}</span>
						</a>
						{#if item.children.length > 0}
							<ol class="mini-toc-sublist">
								{#each item.children as child (child.anchor)}
									<li>
										<a
											class="mini-toc-link mini-toc-link-sub"
											class:is-active={activeAnchor === child.anchor}
											href="#{child.anchor}"
										>
											<span class="mini-toc-subnum">{child.n}°</span>
											<span class="mini-toc-text">{frenchPunct(child.label)}</span>
										</a>
									</li>
								{/each}
							</ol>
						{/if}
					</li>
				{/each}
			</ol>
		</details>
	{/if}

	<div class="body reader-prose">
		{#each sections as group (group.section)}
			<section class="section section-{group.section}" aria-label={group.label} id={group.section}>
				<header class="section-eyebrow">{group.label}</header>
				{#each group.blocks as block, i (i)}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					<div class="block block-{block.kind}">{@html renderBlock(block.html)}</div>
				{/each}
			</section>
		{/each}
	</div>

	<nav class="pager" aria-label="Leçons adjacentes">
		{#if data.prev}
			<NavCard
				href="/boulanger/{data.prev.slug}"
				title={`${data.prev.n}. ${data.prev.title}`}
				eyebrow="Leçon précédente"
				direction="prev"
			/>
		{:else}
			<span></span>
		{/if}
		{#if data.next}
			<NavCard
				href="/boulanger/{data.next.slug}"
				title={`${data.next.n}. ${data.next.title}`}
				eyebrow="Leçon suivante"
				direction="next"
			/>
		{:else}
			<span></span>
		{/if}
	</nav>
</main>

<style>
	.bl-reader {
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
	.kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 1rem 0 0.5rem;
	}
	.title {
		font-family: var(--font-heading);
		font-size: clamp(1.75rem, 4vw, 2.5rem);
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.005em;
		margin: 0.4rem 0 0;
		color: var(--color-heading, var(--color-fg));
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	/* ── Mini-TOC — clickable lesson outline ────────────────────────────────── */
	.mini-toc {
		max-width: 720px;
		margin: 0 auto 3rem;
		/* Halve the border tint so the box recedes behind the lesson heading
		   on large lessons with 11 parts. */
		border: 1px solid color-mix(in srgb, var(--color-accent) 14%, transparent);
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-accent) 1.5%, transparent);
		overflow: hidden;
	}
	.mini-toc > summary {
		list-style: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1.1rem;
		cursor: pointer;
		user-select: none;
	}
	.mini-toc > summary::-webkit-details-marker {
		display: none;
	}
	.mini-toc > summary::after {
		content: '▾';
		font-size: 0.8rem;
		color: var(--color-accent);
		transition: transform 200ms ease;
	}
	.mini-toc:not([open]) > summary::after {
		transform: rotate(-90deg);
	}
	.mini-toc-label {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
	}
	.mini-toc-count {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--color-muted);
		margin-left: auto;
		margin-right: 0.4rem;
	}
	.mini-toc-list {
		list-style: none;
		margin: 0;
		padding: 0.25rem 0 0.85rem;
		border-top: 1px solid color-mix(in srgb, var(--color-accent) 18%, transparent);
		display: flex;
		flex-direction: column;
	}
	.mini-toc-sublist {
		list-style: none;
		margin: 0 0 0.25rem 1.6rem;
		padding: 0;
	}
	.mini-toc-link {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		padding: 0.45rem 1.1rem;
		text-decoration: none;
		color: var(--color-fg);
		border-left: 2px solid transparent;
		transition:
			background-color 120ms ease,
			border-color 120ms ease,
			color 120ms ease;
	}
	.mini-toc-link:hover {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		border-left-color: var(--color-accent);
		color: var(--color-accent);
	}
	.mini-toc-link.is-active {
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		border-left-color: var(--color-accent);
		color: var(--color-accent);
	}
	.mini-toc-link.is-active .mini-toc-roman,
	.mini-toc-link.is-active .mini-toc-subnum,
	.mini-toc-link.is-active .mini-toc-text {
		color: var(--color-accent);
	}
	.mini-toc-link-sub {
		padding: 0.28rem 1.1rem;
	}
	.mini-toc-roman {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: var(--color-accent);
		min-width: 2.4rem;
	}
	.mini-toc-subnum {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--color-muted);
		min-width: 1.6rem;
	}
	.mini-toc-text {
		font-family: var(--font-body);
		font-size: 0.95rem;
		line-height: 1.45;
	}
	.mini-toc-link-sub .mini-toc-text {
		font-size: 0.88rem;
		color: var(--color-subtle);
	}
	.mini-toc-link-sub:hover .mini-toc-text {
		color: inherit;
	}

	/* ── Section chrome — minimal: eyebrow label + content ─────────────────── */
	.section {
		padding: 0;
	}
	.section-eyebrow {
		display: block;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
		/* No border-bottom here — the first h2.dev-roman provides its own rule.
		   Having both produced a double-rule stacked 1.5rem apart. */
		padding-bottom: 0;
		margin-bottom: 1.25rem;
	}

	/* Each block is its own structural unit (one <p>, one <h2>, one <ol>, …).
	   Spacing lives on the .block container — the inner elements all carry
	   margin: 0 — because Tailwind preflight zeroes <p> margins AND we
	   wrap each <p> as the sole child of its .block, which causes a
	   `:last-child { margin: 0 }` rule to defeat any margin we'd put on <p>.
	   Moving spacing to the container is robust against that. */
	.block {
		min-width: 0;
		margin: 0 0 1.4em;
	}
	.block :global(p),
	.block :global(h2),
	.block :global(h3),
	.block :global(ol) {
		margin: 0;
	}
	.block :global(p) {
		font-size: 1.02rem;
		line-height: 1.7;
	}
	/* Inside a sub-heading block (h3 + p body), keep the body close to the
	   heading. */
	.block :global(h3 + p) {
		margin-top: 0.4rem;
	}

	/* ── Roman-heading block — extra space before, tighter space after ─────── */
	.block-roman-heading {
		margin-top: 3.75rem;
		margin-bottom: 1.5rem;
	}
	.block-roman-heading:first-of-type {
		margin-top: 0;
	}
	.block :global(h2.dev-roman) {
		font-family: var(--font-heading);
		font-size: clamp(1.35rem, 2.4vw, 1.7rem);
		font-weight: 700;
		line-height: 1.25;
		letter-spacing: -0.005em;
		color: var(--color-heading, var(--color-fg));
		padding-bottom: 0.55rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 28%, transparent);
		scroll-margin-top: 5rem;
		display: flex;
		align-items: baseline;
		gap: 0.65rem;
	}
	.block :global(h2.dev-roman .dev-roman-num) {
		font-family: var(--font-ui);
		font-size: 0.85em;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--color-accent);
		flex-shrink: 0;
	}

	/* ── Sub-heading block — generous top margin separates sub-sections ─────── */
	.block-sub-heading {
		margin-top: 2.5rem;
		margin-bottom: 1.75em;
	}
	.block :global(h3.dev-sub) {
		font-family: var(--font-heading);
		font-size: 1.05rem;
		font-weight: 600;
		/* Body text uses italic for Latin terms/citations, so an italic
		   sub-heading would be indistinguishable from emphasized prose. */
		font-style: normal;
		line-height: 1.4;
		color: var(--color-heading, var(--color-fg));
		scroll-margin-top: 5rem;
		display: flex;
		align-items: baseline;
		gap: 0.55rem;
	}
	.block :global(h3.dev-sub .dev-sub-num) {
		font-family: var(--font-ui);
		font-style: normal;
		font-size: 0.78em;
		font-weight: 700;
		color: var(--color-accent);
		flex-shrink: 0;
		min-width: 1.6rem;
	}

	/* ── Conclusion — visually distinct callout ────────────────────────────── */
	.section-conclusion {
		padding: 1.25rem 1.5rem;
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-accent) 3.5%, transparent);
		border-left: 3px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
	}
	.section-conclusion .section-eyebrow {
		margin-bottom: 1rem;
		/* Restore a subtle rule inside the callout box — no h2 follows here. */
		padding-bottom: 0.45rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
	}

	/* Sections that start with plain prose (no h2.dev-roman follows the eyebrow)
	   need their own separator rule re-applied. Développement sections have an
	   h2 that provides the rule, so they correctly get none. */
	.section-mots .section-eyebrow,
	.section-lectures .section-eyebrow,
	.section-questionnaire .section-eyebrow,
	.section-devoirs .section-eyebrow {
		padding-bottom: 0.45rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 22%, transparent);
	}

	/* ── Mots / Lectures / Questionnaire / Devoirs — quieter prose ─────────── */
	.section-mots .block :global(p),
	.section-lectures .block :global(p),
	.section-questionnaire .block :global(p) {
		font-size: 0.96rem;
		line-height: 1.7;
	}
	.section-mots .block :global(p > b:first-child),
	.section-mots .block :global(p > strong:first-child) {
		color: var(--color-heading, var(--color-fg));
	}

	/* ── Devoirs OL ─────────────────────────────────────────────────────────── */
	.block :global(ol.devoirs-list) {
		list-style: none;
		counter-reset: devoir;
		padding: 0;
		margin: 0;
	}
	.block :global(ol.devoirs-list li) {
		counter-increment: devoir;
		/* Switch from absolute-positioned counter to inline-flex so the number
		   stays optically attached to the text on narrow mobile columns. */
		display: flex;
		align-items: baseline;
		gap: 0.65rem;
		padding: 0.4rem 0;
		font-size: 0.97rem;
		line-height: 1.65;
	}
	.block :global(ol.devoirs-list li::before) {
		content: counter(devoir, decimal) '°';
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--color-accent);
		flex-shrink: 0;
		min-width: 1.8rem;
		padding-top: 0.05em;
	}
	.block :global(ol.devoirs-list li + li) {
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 8%, transparent);
	}
	/* The <li> body is wrapped in a single <span> at build time so the
	   flex layout stays as exactly two children (counter + content). */
	.block :global(ol.devoirs-list li > span) {
		flex: 1 1 auto;
		min-width: 0;
	}

	/* ── Alpha list (a) b) c)…) inside développement body ──────────────────── */
	.block :global(ol.alpha-list) {
		list-style: none;
		counter-reset: alpha;
		padding: 0;
		margin: 0.4em 0 1.6em;
		border-left: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		padding-left: 1.1rem;
	}
	.block :global(ol.alpha-list li) {
		counter-increment: alpha;
		display: flex;
		align-items: baseline;
		gap: 0.55rem;
		padding: 0.35rem 0;
		font-size: 1rem;
		line-height: 1.65;
	}
	.block :global(ol.alpha-list li::before) {
		content: counter(alpha, lower-alpha) ')';
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 700;
		font-style: italic;
		color: var(--color-accent);
		flex-shrink: 0;
		min-width: 1.4rem;
		padding-top: 0.1em;
	}
	.block :global(ol.alpha-list li > span) {
		flex: 1 1 auto;
		min-width: 0;
	}

	/* ── Bible verse refs (rendered by linkifyVerseRefs) ───────────────────── */
	.block :global(a.verse-ref) {
		color: inherit;
		text-decoration: underline dotted var(--color-muted);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.18em;
		transition: color 120ms ease;
	}
	.block :global(a.verse-ref:hover) {
		color: var(--color-accent);
		text-decoration: underline solid var(--color-accent);
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
