<script lang="ts">
	import ChapterFilterBar from './ChapterFilterBar.svelte';
	import VerseMarker from './VerseMarker.svelte';
	import type { BibleVerseIndex } from '$lib/data/types';
	import type { BookInfo } from '$lib/utils/bibleBookSlug';

	let {
		book,
		chapter,
		verses,
		verseIdx,
		totalChapters,
		hasConcordance = false
	}: {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		verseIdx: BibleVerseIndex;
		totalChapters: number;
		hasConcordance?: boolean;
	} = $props();

	// hasConcordance is reserved for the upcoming pericope-view link (Task U7);
	// no rendering yet. Property is destructured above so consumers may pass it.

	let dimNonCited = $state(false);

	const prevHref = $derived(chapter > 1 ? `/bible/${book.slug}/${chapter - 1}` : null);
	const nextHref = $derived(chapter < totalChapters ? `/bible/${book.slug}/${chapter + 1}` : null);

	function citedCount(v: number): number {
		const arr = verseIdx[book.usfx]?.[String(chapter)]?.[String(v)];
		return arr ? arr.length : 0;
	}

	const totalCited = $derived(verses.reduce((t, v) => t + (citedCount(v.v) > 0 ? 1 : 0), 0));
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
			<p class="font-ui text-[11px] uppercase tracking-[0.3em] text-subtle mb-3">
				{book.frenchName}
			</p>
			<h1 class="font-heading text-[2.5rem] leading-[1.2] tracking-[-0.01em] text-foreground mb-3">
				Chapitre {chapter}
			</h1>
			<div class="w-10 h-px bg-accent opacity-70 mx-auto"></div>
		</header>

		{#if totalCited > 0}
			<ChapterFilterBar bind:dimNonCited citedCount={totalCited} />
		{/if}

		<ol class="list-none space-y-3">
			{#each verses as v (v.v)}
				{@const c = citedCount(v.v)}
				<li
					id="v{v.v}"
					class="flex gap-3 max-md:gap-2 transition-opacity"
					class:dim={dimNonCited && c === 0}
				>
					<span
						class="font-ui text-[13px] max-md:text-[11px] font-thin select-none w-6 max-md:w-5 shrink-0 text-right tabular-nums leading-[1.7] pt-[0.15em] text-subtle"
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
</style>
