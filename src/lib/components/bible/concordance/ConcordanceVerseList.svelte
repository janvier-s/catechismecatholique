<script lang="ts">
	import type { ConcordancePericope, ConcordanceChapter } from '$lib/data/types';

	let {
		verses,
		chapterData,
		chapter,
		selectedVerse,
		onSelectVerse,
		onSelectPericope
	}: {
		verses: { v: number; text: string }[];
		chapterData: ConcordanceChapter;
		chapter: number;
		selectedVerse: number | null;
		onSelectVerse: (v: number) => void;
		onSelectPericope: (verseRef: string) => void;
	} = $props();

	// Map: startVerse → list of pericopes starting at that verse (broader first per chapterData ordering)
	const pericopesByStart = $derived.by(() => {
		const m = new Map<number, ConcordancePericope[]>();
		for (const p of chapterData.pericopes) {
			const arr = m.get(p.startVerse) ?? [];
			arr.push(p);
			m.set(p.startVerse, arr);
		}
		return m;
	});
</script>

<div class="h-full flex flex-col">
	<div class="shrink-0 border-b border-border px-sm py-[8px] bg-panel font-ui">
		<span class="text-[11px] text-subtle font-medium">
			Chapitre {chapter}
		</span>
	</div>
	<div class="flex-1 overflow-y-auto px-sm py-md">
		<div class="space-y-[2px]">
			{#each verses as verse (verse.v)}
				{@const headers = pericopesByStart.get(verse.v) ?? []}
				{@const totalCount = chapterData.verseEntryCounts[verse.v] ?? 0}
				{@const isSelected = selectedVerse === verse.v}
				{@const hasBadge = totalCount > 0}

				{#each headers as header (header.verseRef)}
					<button
						type="button"
						class="w-full text-left flex items-center gap-2 px-[6px] py-[6px] mt-[8px] mb-[2px] rounded-sm border-l-2 border-accent/40 hover:bg-accent/10 hover:border-accent transition-colors"
						onclick={() => onSelectPericope(header.verseRef)}
					>
						<div class="flex-1 min-w-0">
							<span class="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">
								{header.verseRef}
							</span>
							{#if header.pericopeTitle}
								<p class="text-[11px] text-foreground/70 leading-snug truncate">
									{header.pericopeTitle}
								</p>
							{/if}
						</div>
						<span class="shrink-0 text-[10px] text-subtle">
							{header.ccc.length} §
						</span>
					</button>
				{/each}

				<button
					type="button"
					class="w-full text-left flex items-start gap-2 rounded-sm px-[6px] py-[4px] transition-colors group
						{isSelected ? 'bg-accent/10' : ''}
						{hasBadge ? 'cursor-pointer hover:bg-border/20' : 'cursor-default'}"
					onclick={() => hasBadge && onSelectVerse(verse.v)}
					disabled={!hasBadge}
				>
					<span class="shrink-0 text-[11px] text-subtle font-medium w-[20px] text-right pt-[2px]">
						{verse.v}
					</span>
					<span
						class="flex-1 font-body text-[15px] leading-relaxed text-foreground"
						class:verse-annotated={hasBadge}
						class:verse-active={isSelected}>{verse.text}</span
					>
					{#if hasBadge}
						<span class="shrink-0 mt-[3px] text-[10px] font-medium text-subtle">
							{totalCount}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.verse-annotated {
		text-decoration: underline;
		text-decoration-style: dotted;
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
	}
	.verse-annotated:hover,
	.verse-active {
		text-decoration-style: solid;
		text-decoration-color: var(--color-accent);
	}
</style>
