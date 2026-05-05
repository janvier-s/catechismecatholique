<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadConcordanceByParagraph, loadNclBible } from '$lib/data/loaders';
	import type { ConcordanceByParagraphEntry, NclBible } from '$lib/data/types';
	import { pluralFr } from '$lib/utils/i18n';

	let entries = $state<ConcordanceByParagraphEntry[]>([]);
	let nclData = $state<NclBible>({});

	$effect(() => {
		const ctx = $studyPanel.context;
		if (ctx?.kind !== 'paragraph') {
			entries = [];
			return;
		}
		const num = ctx.paragraph;
		(async () => {
			const [idx, ncl] = await Promise.all([loadConcordanceByParagraph(), loadNclBible()]);
			entries = idx[String(num)] ?? [];
			nclData = ncl;
		})();
	});

	function isMultiChapter(e: ConcordanceByParagraphEntry): boolean {
		return e.startCh !== e.endCh;
	}

	function paragraphCount(ranges: { from: number; to: number }[]): number {
		return ranges.reduce((t, r) => t + (r.to - r.from + 1), 0);
	}

	function getVerses(e: ConcordanceByParagraphEntry): { v: number; text: string }[] {
		if (isMultiChapter(e)) return [];
		const chData = nclData[e.usfx]?.[String(e.startCh)];
		if (!chData) return [];
		const out: { v: number; text: string }[] = [];
		for (let v = e.startVerse; v <= e.endVerse; v++) {
			const text = chData[String(v)];
			if (text) out.push({ v, text });
		}
		return out;
	}
</script>

<div class="font-ui text-xs text-muted mb-3">
	{entries.length}
	{pluralFr(entries.length, 'renvoi')} de la concordance
</div>

{#if entries.length === 0}
	<p class="font-ui text-xs italic text-subtle">Aucun renvoi pour ce paragraphe.</p>
{:else}
	<ul class="space-y-3 list-none">
		{#each entries as entry, i (i)}
			{@const cccCount = paragraphCount(entry.cccRanges)}
			<li class="concordance-entry rounded-md px-5 pt-4 pb-5">
				<!-- Header: verseRef left, count right -->
				<div class="flex items-center justify-between gap-3">
					<a
						href="/bible/{entry.slug}/{entry.startCh}/concordance"
						class="font-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-accent hover:underline"
					>
						{entry.verseRef}
					</a>
					{#if cccCount > 0}
						<span
							class="font-ui text-[10px] uppercase tracking-[0.08em] text-subtle whitespace-nowrap"
						>
							{cccCount} §
						</span>
					{/if}
				</div>

				{#if entry.pericopeTitle}
					<h4 class="font-heading text-[16px] leading-snug text-foreground text-center mt-2 px-2">
						{entry.pericopeTitle}
					</h4>
				{/if}
				{#if entry.pericopeCrossRefs}
					<p class="font-body text-[11.5px] text-subtle text-center mt-1.5 leading-snug">
						{entry.pericopeCrossRefs}
					</p>
				{/if}
				{#if entry.pericopeTitle || entry.pericopeCrossRefs}
					<div class="flex justify-center mt-3 mb-1">
						<span class="block w-12 h-px bg-accent/30"></span>
					</div>
				{/if}

				{#if isMultiChapter(entry)}
					<div class="mt-3 text-center">
						<a
							href="/bible/{entry.slug}/{entry.startCh}"
							class="font-ui text-[12px] text-accent hover:underline"
						>
							→ Lire dans la Bible
						</a>
					</div>
				{:else}
					{@const verses = getVerses(entry)}
					{#if verses.length > 0}
						<div class="font-body text-[14px] leading-relaxed text-foreground space-y-1 mt-3 mb-3">
							{#each verses as { v, text } (v)}
								<p>
									<sup class="font-ui text-[10px] text-subtle align-baseline mr-1">{v}</sup>{text}
								</p>
							{/each}
						</div>
					{/if}
				{/if}

				{#if entry.cccRanges.length > 0}
					<div class="mt-3 flex flex-wrap justify-center gap-x-2 gap-y-1">
						{#each entry.cccRanges as r (`${r.from}-${r.to}`)}
							<a
								href={r.from === r.to ? `/ccc/${r.from}` : `/ccc/${r.from}-${r.to}`}
								class="font-ui text-[12px] text-accent hover:underline whitespace-nowrap tabular-nums"
							>
								{r.from === r.to ? r.from : `${r.from}-${r.to}`}
							</a>
						{/each}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.concordance-entry {
		background-color: var(--color-panel);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-border) 60%, transparent);
	}
</style>
