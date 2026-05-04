<script lang="ts">
	import ChapterFilterBar from './ChapterFilterBar.svelte';
	import VerseMarker from './VerseMarker.svelte';
	import BookNavLink from './BookNavLink.svelte';
	import ChapterNavLink from './ChapterNavLink.svelte';
	import FloatingNav from './FloatingNav.svelte';
	import type { BibleVerseIndex, NclSection } from '$lib/data/types';
	import {
		type BookInfo,
		getPrevBook,
		getNextBook
	} from '$lib/utils/bibleBookSlug';
	import { studyPanel, openPanel } from '$lib/stores/studyPanel';

	let {
		book,
		chapter,
		verses,
		verseIdx,
		totalChapters,
		hasConcordance = false,
		sections = [],
		chapterCounts = {}
	}: {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		verseIdx: BibleVerseIndex;
		totalChapters: number;
		hasConcordance?: boolean;
		sections?: NclSection[];
		chapterCounts?: Record<string, number>;
	} = $props();

	const sectionByVerse = $derived.by(() => {
		const m = new Map<number, NclSection>();
		for (const s of sections) m.set(s.startV, s);
		return m;
	});

	let dimNonCited = $state(false);

	const prevHref = $derived(chapter > 1 ? `/bible/${book.slug}/${chapter - 1}` : null);
	const nextHref = $derived(chapter < totalChapters ? `/bible/${book.slug}/${chapter + 1}` : null);

	const prevBook = $derived(getPrevBook(book.slug) ?? null);
	const nextBook = $derived(getNextBook(book.slug) ?? null);

	let navOpen = $state(false);

	function buildHref(slug: string, ch: number): string {
		return `/bible/${slug}/${ch}`;
	}

	function citedCount(v: number): number {
		const arr = verseIdx[book.usfx]?.[String(chapter)]?.[String(v)];
		return arr ? arr.length : 0;
	}

	const totalCited = $derived(verses.reduce((t, v) => t + (citedCount(v.v) > 0 ? 1 : 0), 0));

	function isVerseActive(v: number): boolean {
		const ctx = $studyPanel.context;
		if (!ctx?.verseUsfx) return false;
		return (
			$studyPanel.open &&
			ctx.verseUsfx === book.usfx &&
			ctx.verseChapter === chapter &&
			ctx.verseVerse === v
		);
	}

	function openVerse(v: number) {
		openPanel(
			{ paragraph: 0, verseUsfx: book.usfx, verseChapter: chapter, verseVerse: v },
			'bible-verse'
		);
	}

	function onVerseKeydown(e: KeyboardEvent, v: number) {
		// Preserve native text selection — only Enter/Space activate.
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			openVerse(v);
		}
	}
</script>

<!-- Chapter navigation bar — sticky below the global TopBar (80px). -->
<div
	class="sticky top-[80px] z-40 bg-glass backdrop-blur-sm border-b border-border px-6 max-md:px-2 flex items-center gap-[10px] font-ui"
	style="height: 50px;"
>
	<!-- Center: chapter button with chevrons -->
	<div
		class="md:absolute md:left-1/2 md:-translate-x-1/2 flex-1 md:flex-none flex justify-center relative items-center"
	>
		<!-- Left chevrons -->
		<div
			class="hidden md:flex absolute right-full top-1/2 -translate-y-1/2 items-center gap-[8px] pr-[8px]"
		>
			{#if prevBook}
				<BookNavLink
					href="/bible/{prevBook.slug}/1"
					direction="prev"
					label={prevBook.frenchName}
				/>
			{:else}
				<div class="w-[15px]" aria-hidden="true"></div>
			{/if}
			{#if prevHref}
				<ChapterNavLink href={prevHref} direction="prev" chapter={chapter - 1} />
			{:else}
				<div class="w-[15px]" aria-hidden="true"></div>
			{/if}
		</div>

		<button
			type="button"
			class="flex items-center gap-[5px] px-[12px] md:px-[17px] py-[8px] md:py-[10px] rounded-[3px] transition-colors
				{navOpen ? 'bg-accent text-white' : 'text-accent hover:bg-accent hover:text-white'}"
			aria-expanded={navOpen}
			aria-haspopup="dialog"
			onclick={() => (navOpen = !navOpen)}
		>
			<span class="text-[14px] md:text-[16px] font-medium">{book.frenchName} {chapter}</span>
			<span class="text-[10px] md:text-[11px] opacity-80 leading-none" aria-hidden="true"
				>{navOpen ? '▲' : '▼'}</span
			>
		</button>

		<!-- Right chevrons -->
		<div
			class="hidden md:flex absolute left-full top-1/2 -translate-y-1/2 items-center gap-[8px] pl-[8px]"
		>
			{#if nextHref}
				<ChapterNavLink href={nextHref} direction="next" chapter={chapter + 1} />
			{:else}
				<div class="w-[15px]" aria-hidden="true"></div>
			{/if}
			{#if nextBook}
				<BookNavLink
					href="/bible/{nextBook.slug}/1"
					direction="next"
					label={nextBook.frenchName}
				/>
			{:else}
				<div class="w-[15px]" aria-hidden="true"></div>
			{/if}
		</div>
	</div>
</div>

{#if navOpen}
	<FloatingNav
		bookSlug={book.slug}
		chapterNum={chapter}
		{chapterCounts}
		{buildHref}
		onClose={() => (navOpen = false)}
		topOffset="130px"
	/>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="fixed inset-0 z-[57]" role="presentation" onclick={() => (navOpen = false)}></div>
{/if}

<main class="mx-auto max-w-reader px-6 pt-8 pb-16">
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

		{#if totalCited > 0}
			<ChapterFilterBar bind:dimNonCited citedCount={totalCited} />
		{/if}

		<ol class="list-none space-y-3">
			{#each verses as v (v.v)}
				{@const c = citedCount(v.v)}
				{@const section = sectionByVerse.get(v.v)}

				{#if section}
					<li class="list-none mt-8 mb-3 first:mt-0">
						<h2 class="font-heading text-[18px] font-semibold text-foreground/80 leading-snug">
							{section.title}
						</h2>
						{#if section.crossRefs}
							<p class="mt-1 font-body text-[13px] text-subtle leading-snug">
								{section.crossRefs}
							</p>
						{/if}
					</li>
				{/if}

				{@const active = isVerseActive(v.v)}
				<li id="v{v.v}" class="transition-opacity" class:dim={dimNonCited && c === 0}>
					<div
						class="verse-row flex gap-3 max-md:gap-2 rounded-md px-2 -mx-2 py-1 cursor-pointer"
						class:is-active={active}
						role="button"
						tabindex="0"
						aria-pressed={active}
						aria-label="Ouvrir le panneau d'étude pour le verset {v.v}"
						onclick={() => openVerse(v.v)}
						onkeydown={(e) => onVerseKeydown(e, v.v)}
					>
						<span
							class="font-ui text-[13px] max-md:text-[11px] font-thin w-6 max-md:w-5 shrink-0 text-right tabular-nums leading-[1.7] pt-[0.15em] text-subtle select-none"
						>
							{v.v}
						</span>
						<p class="font-body text-[18px] leading-[1.7] flex-1">
							{v.text}{#if c > 0}<VerseMarker
									bookSlug={book.slug}
									bookUsfx={book.usfx}
									{chapter}
									verse={v.v}
									count={c}
								/>{/if}
						</p>
					</div>
				</li>
			{/each}
		</ol>
	</article>

	<nav class="mt-16 pt-8 border-t border-border flex justify-between font-ui text-sm">
		{#if prevHref}
			<a href={prevHref} class="text-accent hover:underline">← Chapitre {chapter - 1}</a>
		{:else}<span></span>{/if}
		{#if nextHref}
			<a href={nextHref} class="text-accent hover:underline">Chapitre {chapter + 1} →</a>
		{:else}<span></span>{/if}
	</nav>
</main>

<style>
	.dim {
		opacity: 0.35;
	}
	.verse-row {
		transition-duration: 150ms;
	}
	.verse-row:hover {
		background-color: color-mix(in srgb, var(--color-accent) 5%, transparent);
	}
	.verse-row.is-active {
		background-color: color-mix(in srgb, var(--color-accent) 10%, transparent);
	}
	/* When the parent <li> is dimmed, hover should still feel responsive. */
	:global(.dim) .verse-row:hover {
		background-color: color-mix(in srgb, var(--color-accent) 4%, transparent);
	}
	.verse-row:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
</style>
