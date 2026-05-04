<script lang="ts">
	import ChapterFilterBar from './ChapterFilterBar.svelte';
	import VerseMarker from './VerseMarker.svelte';
	import type { BibleVerseIndex, NclSection } from '$lib/data/types';
	import type { BookInfo } from '$lib/utils/bibleBookSlug';
	import { studyPanel, openPanel } from '$lib/stores/studyPanel';

	let {
		book,
		chapter,
		verses,
		verseIdx,
		totalChapters,
		hasConcordance = false,
		sections = []
	}: {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		verseIdx: BibleVerseIndex;
		totalChapters: number;
		hasConcordance?: boolean;
		sections?: NclSection[];
	} = $props();

	const sectionByVerse = $derived.by(() => {
		const m = new Map<number, NclSection>();
		for (const s of sections) m.set(s.startV, s);
		return m;
	});

	let dimNonCited = $state(false);

	const prevHref = $derived(chapter > 1 ? `/bible/${book.slug}/${chapter - 1}` : null);
	const nextHref = $derived(chapter < totalChapters ? `/bible/${book.slug}/${chapter + 1}` : null);

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

<main class="mx-auto max-w-reader px-6 pt-8 pb-16">
	<nav class="mb-8 flex justify-between items-center font-ui">
		{#if prevHref}
			<a
				href={prevHref}
				class="flex items-center gap-1 text-subtle hover:text-accent transition-colors text-[12px] uppercase tracking-[0.15em]"
			>
				<span class="text-[16px] leading-none">‹</span>
				<span>Ch. {chapter - 1}</span>
			</a>
		{:else}<span></span>{/if}
		<a
			href="/bible/{book.slug}"
			class="text-subtle hover:text-accent text-[12px] uppercase tracking-[0.15em]"
		>
			{book.frenchName}
		</a>
		{#if nextHref}
			<a
				href={nextHref}
				class="flex items-center gap-1 text-subtle hover:text-accent transition-colors text-[12px] uppercase tracking-[0.15em]"
			>
				<span>Ch. {chapter + 1}</span>
				<span class="text-[16px] leading-none">›</span>
			</a>
		{:else}<span></span>{/if}
	</nav>

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
