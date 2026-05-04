<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadConcordanceByParagraph } from '$lib/data/loaders';
	import type { ConcordanceByParagraphEntry } from '$lib/data/types';
	import CccRangeChip from '$lib/components/CccRangeChip.svelte';

	let entries = $state<ConcordanceByParagraphEntry[]>([]);
	let nclData = $state<Record<string, Record<string, Record<string, string>>>>({});

	$effect(() => {
		const ctx = $studyPanel.context;
		const num = ctx?.paragraph;
		if (!num) {
			entries = [];
			return;
		}
		(async () => {
			const [idx, nclRes] = await Promise.all([
				loadConcordanceByParagraph(),
				fetch('/data/bible/ncl.json')
			]);
			entries = idx[String(num)] ?? [];
			if (nclRes.ok) nclData = await nclRes.json();
		})();
	});

	function isMultiChapter(e: ConcordanceByParagraphEntry): boolean {
		return e.startCh !== e.endCh;
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
	{entries.length} renvoi(s) de la concordance
</div>

{#if entries.length === 0}
	<p class="font-ui text-xs italic text-subtle">Aucun renvoi pour ce paragraphe.</p>
{:else}
	<ul class="space-y-3 list-none">
		{#each entries as entry, i (i)}
			<li class="rounded border border-border bg-panel p-3">
				<div class="flex items-baseline gap-2 flex-wrap mb-2">
					<span
						class="font-ui text-[12px] font-semibold uppercase tracking-[0.1em] text-accent"
					>
						{entry.verseRef}
					</span>
					{#if entry.pericopeTitle}
						<span class="font-ui text-[11px] text-foreground/70">— {entry.pericopeTitle}</span>
					{/if}
				</div>

				{#if isMultiChapter(entry)}
					<a
						href="/bible/{entry.slug}/{entry.startCh}"
						class="font-ui text-[12px] text-accent hover:underline"
					>
						→ Lire dans la Bible
					</a>
				{:else}
					{@const verses = getVerses(entry)}
					{#if verses.length > 0}
						<div
							class="font-body text-[14px] leading-relaxed text-foreground space-y-1 mb-3"
						>
							{#each verses as { v, text } (v)}
								<p>
									<sup class="font-ui text-[10px] text-subtle align-baseline mr-1">{v}</sup
									>{text}
								</p>
							{/each}
						</div>
					{/if}
				{/if}

				{#if entry.cccRanges.length > 0}
					<div class="flex flex-wrap gap-[4px] mt-2">
						{#each entry.cccRanges as r (`${r.from}-${r.to}`)}
							<CccRangeChip range={r} />
						{/each}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
