<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import type { BibleVerseIndex, NclChapterBlocks, NclSection } from '$lib/data/types';
	import { type BookInfo } from '$lib/utils/bibleBookSlug';
	import { studyPanel, openPanel } from '$lib/stores/studyPanel';
	import { prefs } from '$lib/stores/prefs';
	import { vulgatePsalmLabel } from '$lib/utils/psalm-numbering';
	import ChapterPrevNext from './ChapterPrevNext.svelte';

	let {
		book,
		chapter,
		verses,
		verseIdx,
		totalChapters,
		sections = [],
		chapterCounts = {},
		paragraphs = null,
		studyMode,
		headingLevel = 'h1'
	}: {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		verseIdx: BibleVerseIndex;
		totalChapters: number;
		sections?: NclSection[];
		chapterCounts?: Record<string, number>;
		paragraphs?: NclChapterBlocks | null;
		studyMode: boolean;
		headingLevel?: 'h1' | 'h2';
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
		for (const s of sections.filter((s) => s.ch === chapter)) {
			const arr = m.get(s.startV);
			if (arr) arr.push(s);
			else m.set(s.startV, [s]);
		}
		return m;
	});

	/**
	 * Paragraph mode has no per-verse rows to hang a heading on · headings
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

	// The Néo-Crampon follows the Hebrew numbering; readers coming from the
	// Vulgate see a different number for most psalms. Off by default.
	const vulgateLabel = $derived(
		book.usfx === 'PSA' && $prefs.showVulgatePsalms ? vulgatePsalmLabel(chapter) : null
	);

	function citedCount(v: number): number {
		const arr = verseIdx[book.usfx]?.[String(chapter)]?.[String(v)];
		return arr ? arr.length : 0;
	}

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

<section data-chapter-section>
	<!-- Zero-height point the scroll observer measures, so the top-30% band is
	     unambiguous · the header itself has height and would straddle it. -->
	<div data-chapter-anchor data-book-slug={book.slug} data-chapter-num={chapter}></div>

	<article>
		<!-- Prev/next chapter strip · reading continuity, not book browsing (see
		     ChapterPrevNext for how this differs from the top bar's arrows).
		     This is what the "chapter navigation" reading pref toggles. Rendered
		     once per loaded chapter, same as the header below it, so the strip
		     stays correct at whichever chapter the infinite-scroll window has
		     grown to include. -->
		{#if !$prefs.hideChapterNav}
			<ChapterPrevNext {book} {chapter} {totalChapters} {chapterCounts} />
		{/if}
		<header class="mb-10">
			<p class="chapter-eyebrow font-ui text-[11px] uppercase tracking-[0.3em] text-subtle mb-2">
				{book.frenchName}
			</p>
			<svelte:element
				this={headingLevel}
				class="font-heading text-[2.5rem] leading-[1.2] tracking-[-0.01em] text-foreground mb-3"
			>
				Chapitre {chapter}{#if vulgateLabel}<span
						class="vulgate-psalm ml-[6px] font-ui text-[1.1rem] tracking-normal text-subtle"
						>(Vg {vulgateLabel})</span
					>{/if}
			</svelte:element>
			<div class="w-10 h-px bg-accent opacity-70"></div>
		</header>

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
							{#each block.verses as rv, vi (rv.v)}{#if !$prefs.hideVerseNumbers}<sup
										class="vn"
										class:vn-subtle={$prefs.verseNumberColor === 'subtle'}>{rv.v}</sup
									>{:else}{vi > 0 ? ' ' : ''}{/if}{@html rv.html}
							{/each}
						</p>
					{:else}
						<div
							class="bible-poetry-line"
							class:stanza-break={block.stanzaBreak}
							style="--level: {block.level}"
						>
							{#each block.verses as rv, vi (rv.v)}{#if !$prefs.hideVerseNumbers}<sup
										class="vn"
										class:vn-subtle={$prefs.verseNumberColor === 'subtle'}>{rv.v}</sup
									>{:else}{vi > 0 ? ' ' : ''}{/if}{@html rv.html}
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
								? `Verset ${v.v} · ${c} ${c === 1 ? 'paragraphe' : 'paragraphes'} du Catéchisme`
								: undefined}
						>
							<span
								class="verse-num font-ui text-[13px] max-md:text-[11px] font-extralight w-6 max-md:w-auto shrink-0 text-right tabular-nums leading-[1.7] pt-[0.15em] select-none"
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
</section>

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
		font-weight: 200;
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
		font-size: 0.85rem;
		letter-spacing: 0.4px;
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
	   (max-md:px-4 = 1rem), not the full 1rem · pulling back the full
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
