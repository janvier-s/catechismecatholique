<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadConcordanceByParagraph } from '$lib/data/loaders';
	import type { ConcordanceByParagraphEntry } from '$lib/data/types';

	let entries = $state<ConcordanceByParagraphEntry[]>([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		const num = ctx?.paragraph;
		if (!num) {
			entries = [];
			return;
		}
		(async () => {
			const idx = await loadConcordanceByParagraph();
			entries = idx[String(num)] ?? [];
		})();
	});
</script>

<div class="font-ui text-xs text-muted mb-3">
	{entries.length} renvoi(s) de la concordance
</div>

{#if entries.length === 0}
	<p class="font-ui text-xs italic text-subtle">Aucun renvoi pour ce paragraphe.</p>
{:else}
	<ul class="space-y-2">
		{#each entries as entry, i (i)}
			<li>
				<a
					href="/bible/{entry.slug}/{entry.chapter}/concordance"
					class="block px-2 py-1 rounded border border-border hover:border-accent hover:bg-accent/5 transition-colors"
				>
					<span class="font-ui text-[13px] font-semibold text-accent">
						{entry.verseRef}
					</span>
					{#if entry.pericopeTitle}
						<span class="block text-[11px] text-foreground/70 leading-snug">
							{entry.pericopeTitle}
						</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}
