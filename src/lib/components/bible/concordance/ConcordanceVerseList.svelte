<script lang="ts">
	import type { ConcordanceChapter } from '$lib/data/types';
	import type { BookInfo } from '$lib/utils/bibleBookSlug';

	let {
		verses,
		chapterData,
		chapter,
		book,
		selectedPericopeRef,
		onSelectPericope
	}: {
		verses: { v: number; text: string }[];
		chapterData: ConcordanceChapter;
		chapter: number;
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

	function handleKeydown(e: KeyboardEvent, verseRef: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onSelectPericope(verseRef);
		}
	}
</script>

<div class="h-full flex flex-col">
	<div class="shrink-0 border-b border-border px-sm py-[8px] bg-panel font-ui">
		<span class="text-[11px] text-subtle font-medium">
			Chapitre {chapter}
		</span>
	</div>
	<div class="flex-1 overflow-y-auto px-sm py-md styled-scroll">
		{#if cardsWithTitleVisibility.length === 0}
			<div class="p-lg text-center text-subtle text-[14px]">
				<p>Aucune péricope pour ce chapitre.</p>
			</div>
		{:else}
			<div class="space-y-[10px]">
				{#each cardsWithTitleVisibility as p (p.verseRef)}
					{@const isSelected = selectedPericopeRef === p.verseRef}
					{@const isMultiChapter = p.startCh !== p.endCh}
					<div
						role="button"
						tabindex="0"
						aria-pressed={isSelected}
						class="rounded-sm border px-[10px] py-[8px] cursor-pointer transition-colors
							{isSelected
								? 'border-accent/60 bg-accent/5'
								: 'border-border bg-panel hover:border-accent/30 hover:bg-accent/5'}"
						onclick={() => onSelectPericope(p.verseRef)}
						onkeydown={(e) => handleKeydown(e, p.verseRef)}
					>
						<div class="flex items-baseline gap-2 flex-wrap">
							<span class="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">
								{p.verseRef}
							</span>
							{#if p.showTitle && p.pericopeTitle}
								<span class="text-[12px] text-foreground/80">— {p.pericopeTitle}</span>
							{/if}
						</div>
						{#if p.showTitle && p.pericopeCrossRefs}
							<p class="text-[12px] italic text-subtle mt-1">{p.pericopeCrossRefs}</p>
						{/if}

						{#if isMultiChapter}
							<div class="mt-[6px]">
								<a
									href="/bible/{book.slug}/{p.startCh}"
									class="inline-block text-[12px] text-accent hover:underline"
									onclick={(e) => e.stopPropagation()}
								>
									→ Lire dans la Bible
								</a>
							</div>
						{:else}
							<div class="mt-[6px] space-y-[4px]">
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
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
