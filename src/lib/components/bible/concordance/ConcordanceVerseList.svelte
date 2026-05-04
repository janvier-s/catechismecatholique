<script lang="ts">
	import type { ConcordanceChapter } from '$lib/data/types';
	import type { BookInfo } from '$lib/utils/bibleBookSlug';
	import { pluralFr } from '$lib/utils/i18n';

	let {
		verses,
		chapterData,
		book,
		selectedPericopeRef,
		onSelectPericope
	}: {
		verses: { v: number; text: string }[];
		chapterData: ConcordanceChapter;
		book: BookInfo;
		selectedPericopeRef: string | null;
		onSelectPericope: (verseRef: string) => void;
	} = $props();

	// Build a quick lookup: verse number → verse text (for inline rendering).
	const verseByNum = $derived.by(() => {
		const m = new Map<number, string>();
		for (const v of verses) m.set(v.v, v.text);
		return m;
	});

	// Title deduplication: walk pericopes in order; show title only on the first
	// card of each NCL-section run. A null title doesn't reset the tracker because
	// the next pericope might still genuinely share a previous title.
	const cardsWithTitleVisibility = $derived.by(() => {
		let lastTitle: string | null = '___none___';
		return chapterData.pericopes.map((p) => {
			const showTitle = p.pericopeTitle !== null && p.pericopeTitle !== lastTitle;
			if (p.pericopeTitle !== null) lastTitle = p.pericopeTitle;
			return { ...p, showTitle };
		});
	});

	function paragraphCount(ranges: { from: number; to: number }[]): number {
		return ranges.reduce((t, r) => t + (r.to - r.from + 1), 0);
	}

	function handleKeydown(e: KeyboardEvent, verseRef: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onSelectPericope(verseRef);
		}
	}
</script>

<div class="h-full flex flex-col">
	<div class="flex-1 overflow-y-auto px-4 py-5 styled-scroll">
		{#if cardsWithTitleVisibility.length === 0}
			<div class="p-6 text-center text-subtle text-[14px]">
				<p>Aucune péricope pour ce chapitre.</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each cardsWithTitleVisibility as p (p.verseRef)}
					{@const isSelected = selectedPericopeRef === p.verseRef}
					{@const isMultiChapter = p.startCh !== p.endCh}
					{@const cccCount = paragraphCount(p.cccRanges)}
					<div
						role="button"
						tabindex="0"
						aria-pressed={isSelected}
						class="pericope-card group relative rounded-md cursor-pointer transition-[background-color,box-shadow] duration-200 px-5 pt-4 pb-5
							{isSelected ? 'is-selected' : ''}"
						onclick={() => onSelectPericope(p.verseRef)}
						onkeydown={(e) => handleKeydown(e, p.verseRef)}
					>
						<!-- Header row: verseRef left, CCC count right -->
						<div class="flex items-baseline justify-between gap-3">
							<span
								class="font-ui text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent"
							>
								{p.verseRef}
							</span>
							{#if cccCount > 0}
								<span
									class="font-heading text-[22px] font-semibold leading-none text-accent tabular-nums whitespace-nowrap"
									aria-label="{cccCount} {pluralFr(cccCount, 'paragraphe')} du Catéchisme"
								>
									{cccCount}<span
										class="ml-0.5 text-[13px] font-normal text-accent/70 align-baseline"
										aria-hidden="true">§</span
									>
								</span>
							{/if}
						</div>

						{#if p.showTitle && p.pericopeTitle}
							<h3
								class="font-heading text-[17px] leading-snug text-foreground text-center mt-2 px-2"
							>
								{p.pericopeTitle}
							</h3>
							{#if p.pericopeCrossRefs}
								<p
									class="font-body text-[12px] text-subtle text-center mt-1.5 leading-snug"
								>
									{p.pericopeCrossRefs}
								</p>
							{/if}
							<div class="flex justify-center mt-3 mb-1">
								<span class="block w-12 h-px bg-accent/30"></span>
							</div>
						{/if}

						{#if isMultiChapter}
							<div class="mt-3 text-center">
								<a
									href="/bible/{book.slug}/{p.startCh}"
									class="inline-block font-ui text-[12px] text-accent hover:underline"
									onclick={(e) => e.stopPropagation()}
								>
									→ Lire dans la Bible
								</a>
							</div>
						{:else}
							<div class="mt-3 space-y-1.5">
								{#each Array.from({ length: p.endVerse - p.startVerse + 1 }, (_, i) => p.startVerse + i) as vNum (vNum)}
									{@const text = verseByNum.get(vNum)}
									{#if text}
										<p class="font-body text-[15px] leading-relaxed text-foreground">
											<sup
												class="top-0 align-baseline text-[10px] font-semibold text-subtle mr-[3px]"
												>{vNum}</sup
											>{text}
										</p>
									{/if}
								{/each}
							</div>
						{/if}

						<!-- Chevron affordance, bottom-right -->
						{#if cccCount > 0}
							<span
								class="chevron pointer-events-none absolute right-3 bottom-3 font-ui text-[14px] text-subtle/60 transition-[color,transform] duration-200"
								aria-hidden="true">›</span
							>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.pericope-card {
		background-color: var(--color-panel);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-border) 60%, transparent);
		outline: none;
	}

	.pericope-card:hover {
		background-color: color-mix(in srgb, var(--color-accent) 4%, var(--color-panel));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 25%, transparent);
	}

	.pericope-card:focus-visible {
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 35%, transparent),
			0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent);
	}

	.pericope-card.is-selected {
		background-color: color-mix(in srgb, var(--color-accent) 7%, var(--color-panel));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 35%, transparent);
	}

	.pericope-card:hover .chevron {
		color: var(--color-accent);
		transform: translateX(2px);
	}

	.pericope-card.is-selected .chevron {
		color: var(--color-accent);
	}
</style>
