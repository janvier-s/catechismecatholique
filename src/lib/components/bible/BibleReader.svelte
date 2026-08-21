<script lang="ts">
	import ChapterFilterBar from './ChapterFilterBar.svelte';
	import ChapterNavBar from './ChapterNavBar.svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type { BibleVerseIndex, NclChapterBlocks, NclSection } from '$lib/data/types';
	import { type BookInfo } from '$lib/utils/bibleBookSlug';
	import { studyPanel, openPanel } from '$lib/stores/studyPanel';
	import { prefs } from '$lib/stores/prefs';

	let {
		book,
		chapter,
		verses,
		verseIdx,
		totalChapters,
		hasConcordance = false,
		sections = [],
		chapterCounts = {},
		paragraphs = null
	}: {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		verseIdx: BibleVerseIndex;
		totalChapters: number;
		hasConcordance?: boolean;
		sections?: NclSection[];
		chapterCounts?: Record<string, number>;
		paragraphs?: NclChapterBlocks | null;
	} = $props();

	const richHtmlByVerse = $derived.by(() => {
		const m = new SvelteMap<number, string>();
		if (paragraphs) {
			for (const block of paragraphs.blocks) {
				for (const rv of block.verses) {
					const prev = m.get(rv.v);
					m.set(rv.v, prev ? `${prev} ${rv.html}` : rv.html);
				}
			}
		}
		return m;
	});

	function verseHtml(v: { v: number; text: string }): string {
		return richHtmlByVerse.get(v.v) ?? v.text;
	}

	// Multiple headings (e.g. a major-section + a section) can share the same
	// startV. Group them so all of them render before that verse.
	const sectionsByVerse = $derived.by(() => {
		const m = new SvelteMap<number, NclSection[]>();
		for (const s of sections) {
			const arr = m.get(s.startV);
			if (arr) arr.push(s);
			else m.set(s.startV, [s]);
		}
		return m;
	});

	/**
	 * Paragraph mode has no per-verse rows to hang a heading on — headings
	 * anchor to a block instead. Safe because a heading's startV always
	 * lands on some block's first verse: confirmed against the source XML
	 * that none of the Bible's 1,074 headings ever fall inside an
	 * already-open prose or poetry block, so there's never a block to split.
	 */
	const headingsByBlock = $derived.by(() => {
		const m = new SvelteMap<number, NclSection[]>();
		if (!paragraphs) return m;
		const chapterSections = sections.filter((s) => s.ch === chapter);
		for (const s of chapterSections) {
			const idx = paragraphs.blocks.findIndex((b) => b.verses[0] && b.verses[0].v >= s.startV);
			if (idx === -1) continue;
			const arr = m.get(idx);
			if (arr) arr.push(s);
			else m.set(idx, [s]);
		}
		return m;
	});

	let studyMode = $state(true);

	const prevHref = $derived(chapter > 1 ? `/bible/${book.slug}/${chapter - 1}` : null);
	const nextHref = $derived(chapter < totalChapters ? `/bible/${book.slug}/${chapter + 1}` : null);

	function citedCount(v: number): number {
		const arr = verseIdx[book.usfx]?.[String(chapter)]?.[String(v)];
		return arr ? arr.length : 0;
	}

	const totalCited = $derived(verses.reduce((t, v) => t + (citedCount(v.v) > 0 ? 1 : 0), 0));

	/**
	 * Open the study panel for a verse · unless the reader was selecting text.
	 * Cited verses render as <button> for keyboard access, and a drag-select
	 * inside a button still fires click on mouseup, which would otherwise
	 * hijack every attempt to copy a verse into opening the panel.
	 */
	function openVerse(v: number): void {
		const sel = window.getSelection();
		if (sel && !sel.isCollapsed && sel.toString().trim() !== '') return;
		openPanel(
			{ kind: 'verse', verseUsfx: book.usfx, verseChapter: chapter, verseVerse: v },
			'bible-verse'
		);
	}

	function isVerseActive(v: number): boolean {
		const ctx = $studyPanel.context;
		if (ctx?.kind !== 'verse') return false;
		return (
			$studyPanel.open &&
			ctx.verseUsfx === book.usfx &&
			ctx.verseChapter === chapter &&
			ctx.verseVerse === v
		);
	}
</script>

<!-- Chapter navigation bar · sticky below the global TopBar (80px). -->
<ChapterNavBar {book} {chapter} {totalChapters} {chapterCounts} variant="reader" />

<main class="mx-auto max-w-reader px-6 max-md:px-4 pt-8 max-md:pt-5 pb-16" data-corpus="bible">
	<article>
		<header class="mb-10 text-center">
			<h1 class="font-heading text-[2.5rem] leading-[1.2] tracking-[-0.01em] text-foreground mb-3">
				Chapitre {chapter}
			</h1>
			<div class="w-10 h-px bg-accent opacity-70 mx-auto"></div>
		</header>

		{#if hasConcordance}
			<div class="mb-6 text-center">
				<a
					href="/bible/{book.slug}/{chapter}/concordance"
					class="font-ui text-[12px] uppercase tracking-[0.15em] text-accent hover:underline"
				>
					Voir la concordance →
				</a>
			</div>
		{/if}

		{#if totalCited > 0 && $prefs.bibleLayout !== 'paragraph'}
			<ChapterFilterBar bind:studyMode citedCount={totalCited} />
		{/if}

		{#if $prefs.bibleLayout === 'paragraph' && paragraphs}
			<div class="bible-paragraphs">
				{#if paragraphs.superscription}
					<p class="bible-superscription">{paragraphs.superscription}</p>
				{/if}
				{#each paragraphs.blocks as block, i (i)}
					{@const headingsHere = $prefs.hideBibleHeadings ? [] : (headingsByBlock.get(i) ?? [])}
					{#each headingsHere as section, si (section.level + ':' + si)}
						{#if section.level === 'major'}
							<div class="mt-16 mb-8 first:mt-2">
								<div class="w-16 h-px bg-accent/70 mx-auto mb-4"></div>
								<h2
									class="font-heading text-[34px] font-bold leading-tight tracking-[0.04em] text-foreground text-center"
								>
									{@html section.titleHtml}
								</h2>
							</div>
						{:else if section.level === 'section'}
							<h2
								class="mt-10 mb-4 first:mt-0 font-heading text-[26px] font-semibold text-foreground leading-tight text-center"
							>
								{@html section.titleHtml}
							</h2>
						{:else}
							<p
								class="mt-6 mb-2 font-body text-[15px] italic text-subtle leading-snug text-center"
							>
								{@html section.titleHtml}
							</p>
						{/if}
					{/each}
					{#if block.kind === 'prose'}
						<p class="bible-prose">
							{#each block.verses as rv (rv.v)}{#if !$prefs.hideVerseNumbers}<sup
										class="vn"
										class:vn-subtle={$prefs.verseNumberColor === 'subtle'}>{rv.v}</sup
									>{/if}{@html rv.html}
							{/each}
						</p>
					{:else}
						<div
							class="bible-poetry-line"
							class:stanza-break={block.stanzaBreak}
							style="--level: {block.level}"
						>
							{#each block.verses as rv (rv.v)}{#if !$prefs.hideVerseNumbers}<sup
										class="vn"
										class:vn-subtle={$prefs.verseNumberColor === 'subtle'}>{rv.v}</sup
									>{/if}{@html rv.html}
							{/each}
						</div>
					{/if}
				{/each}
			</div>
		{:else}
			<ol class="verse-list list-none">
				{#each verses as v (v.v)}
					{@const c = citedCount(v.v)}
					{@const headingsHere = $prefs.hideBibleHeadings ? [] : (sectionsByVerse.get(v.v) ?? [])}

					{#each headingsHere as section, i (section.level + ':' + i)}
						{#if section.level === 'major'}
							<li class="list-none mt-16 mb-8 first:mt-2">
								<div class="w-16 h-px bg-accent/70 mx-auto mb-4"></div>
								<h2
									class="font-heading text-[34px] font-bold leading-tight tracking-[0.04em] text-foreground text-center"
								>
									{@html section.titleHtml}
								</h2>
							</li>
						{:else if section.level === 'section'}
							<li class="list-none mt-10 mb-4 first:mt-0">
								<h2
									class="font-heading text-[26px] font-semibold text-foreground leading-tight text-center"
								>
									{@html section.titleHtml}
								</h2>
							</li>
						{:else}
							<li class="list-none mt-6 mb-2">
								<p class="font-body text-[15px] italic text-subtle leading-snug text-center">
									{@html section.titleHtml}
								</p>
							</li>
						{/if}
					{/each}

					{@const active = isVerseActive(v.v)}
					{@const isClickable = c > 0 && studyMode}
					<li id="v{v.v}" class="transition-opacity">
						<svelte:element
							this={isClickable ? 'button' : 'div'}
							class="verse-row flex gap-3 rounded-md px-2 -mx-2 py-1"
							class:is-active={active}
							type={isClickable ? 'button' : undefined}
							role={isClickable ? 'button' : 'presentation'}
							onclick={isClickable ? () => openVerse(v.v) : undefined}
							aria-label={isClickable
								? `Verset ${v.v} — ${c} ${c === 1 ? 'paragraphe' : 'paragraphes'} du Catéchisme`
								: undefined}
						>
							<span
								class="verse-num font-ui text-[13px] max-md:text-[11px] font-thin w-6 max-md:w-auto shrink-0 text-right tabular-nums leading-[1.7] pt-[0.15em] select-none"
								class:count-hidden={$prefs.hideVerseNumbers}
								class:verse-num-accent={$prefs.verseNumberColor === 'accent'}
							>
								{v.v}
							</span>
							<p class="verse-text font-body flex-1" class:verse-text--cited={isClickable}>
								{@html verseHtml(v)}
							</p>
							{#if studyMode}
								<span
									class="verse-cec-count max-md:hidden"
									class:count-hidden={c === 0}
									aria-hidden="true"
								>
									{c}&nbsp;{c === 1 ? 'paragraphe' : 'paragraphes'}
								</span>
							{/if}
						</svelte:element>
					</li>
				{/each}
			</ol>
		{/if}
	</article>

	<nav
		class="mt-16 pt-8 border-t border-border flex justify-between font-ui text-sm"
		aria-label="Chapitre précédent ou suivant"
	>
		{#if prevHref}
			<a href={prevHref} class="text-accent hover:underline whitespace-nowrap"
				>← Chapitre {chapter - 1}</a
			>
		{:else}<span></span>{/if}
		{#if nextHref}
			<a href={nextHref} class="text-accent hover:underline whitespace-nowrap"
				>Chapitre {chapter + 1} →</a
			>
		{:else}<span></span>{/if}
	</nav>
</main>

<style>
	.bible-superscription {
		font-style: italic;
		color: var(--color-muted);
		margin-bottom: 1rem;
	}
	.bible-prose {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.7);
		margin-bottom: 1rem;
	}
	.bible-poetry-line {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.7);
		margin-left: calc((var(--level, 1) - 1) * 1.5rem);
	}
	.bible-poetry-line.stanza-break {
		margin-top: 1rem;
	}
	.vn {
		font-family: var(--font-ui);
		font-size: 0.65em;
		font-weight: 600;
		color: var(--color-accent);
		margin-right: 0.15em;
	}
	.vn.vn-subtle {
		color: var(--color-subtle);
	}
	.verse-text {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.7);
	}
	/* Inter-verse gap tracks the line-height slider · a fixed space-y left the
	   verses just as far apart at 1.2 as at 2.0, so tightening the leading did
	   nothing to the page's overall density. At the 1.7 default this lands on
	   0.7rem, matching the space-y-3 it replaces. */
	.verse-list > li + li {
		margin-top: calc((var(--reader-line-height, 1.7) - 1) * 1rem);
	}
	@media (max-width: 767.98px) {
		.verse-text {
			font-size: calc(var(--reader-font-size, 17px) - 3px);
		}
	}
	.verse-text--cited {
		text-decoration: underline dotted;
		text-decoration-color: var(--color-accent);
		text-underline-offset: 4px;
		text-decoration-thickness: 1px;
	}
	.verse-text :global(.dn),
	.bible-prose :global(.dn),
	.bible-poetry-line :global(.dn) {
		font-variant: small-caps;
		letter-spacing: 0.02em;
	}
	.verse-text :global(.add),
	.bible-prose :global(.add),
	.bible-poetry-line :global(.add) {
		font-style: italic;
	}
	.verse-text :global(.selah),
	.bible-prose :global(.selah),
	.bible-poetry-line :global(.selah) {
		font-style: italic;
		color: var(--color-muted);
	}
	.verse-text :global(.qt),
	.bible-prose :global(.qt),
	.bible-poetry-line :global(.qt) {
		font-variant: small-caps;
		letter-spacing: 0.02em;
	}
	.verse-text :global(.it),
	.bible-prose :global(.it),
	.bible-poetry-line :global(.it) {
		font-style: italic;
	}
	/* Unscoped, unlike the verse-text spans above: a heading's <sc> markup
	   renders inside its own <h2>/<p>, not inside .verse-text/.bible-prose/
	   .bible-poetry-line. */
	:global(.sc) {
		font-variant: small-caps;
		letter-spacing: 0.02em;
	}
	.verse-cec-count {
		font-family: var(--font-ui);
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-accent);
		white-space: nowrap;
		align-self: center;
		flex-shrink: 0;
		width: 6.5rem;
		text-align: right;
	}
	.count-hidden {
		visibility: hidden;
	}
	.verse-num {
		color: var(--color-subtle);
	}
	.verse-num.verse-num-accent {
		color: var(--color-accent);
	}
	.verse-row {
		transition-duration: 150ms;
	}
	button.verse-row {
		appearance: none;
		border: none;
		font: inherit;
		cursor: pointer;
		align-items: baseline;
		width: 100%;
		text-align: left;
		/* Buttons are unselectable by UA default · a cited verse must still be
		   selectable and copyable like any other. The verse number keeps its
		   own select-none so it stays out of the copied text. */
		-webkit-user-select: text;
		user-select: text;
	}
	.verse-row:hover {
		background-color: color-mix(in srgb, var(--color-accent) 5%, transparent);
	}
	.verse-row.is-active {
		background-color: color-mix(in srgb, var(--color-accent) 10%, transparent);
	}
	.verse-row:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
	/* Mobile: hang the verse number in a left gutter so verse text starts
	   near the content edge, aligned with section headings. A 2-column grid
	   (number gutter | text) shifted left by the row's own negative margin
	   gives clean, predictable alignment without the "wrap around" that
	   absolute/float approaches can produce.

	   The margin only pulls back by half of <main>'s actual mobile padding
	   (max-md:px-4 = 1rem), not the full 1rem — pulling back the full
	   amount (or the old 1.5rem, sized for the desktop px-6 gutter) leaves
	   the number glued to, or past, the true viewport edge. The column
	   width stays a full 1.5rem regardless of the margin so double- and
	   triple-digit verse numbers (long chapters run past 100) have room to
	   render without clipping against the number's own right-aligned edge. */
	@media (max-width: 767.98px) {
		/* Mobile keeps the continuous single-column flow it had under
		   space-y-0 · line-height alone sets density there. */
		.verse-list > li + li {
			margin-top: 0;
		}
		.verse-row {
			display: grid !important;
			grid-template-columns: 1.5rem minmax(0, 1fr);
			column-gap: 0;
			align-items: baseline;
			margin-left: -0.5rem;
			padding-left: 0;
			padding-right: 0;
		}
		.verse-row .verse-num {
			width: auto;
			padding: 0 0.35rem 0 0;
			text-align: right;
			line-height: 1.7;
			font-size: 11px;
		}
		.verse-row .verse-text {
			margin: 0;
			padding: 0;
			min-width: 0;
		}
	}
</style>
