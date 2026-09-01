<script lang="ts">
	import { get } from 'svelte/store';
	import { studyPanel, openPanel } from '$lib/stores/studyPanel';
	import { loadParagraph, loadEnBrefsIndex } from '$lib/data/loaders';
	import type { Paragraph } from '$lib/data/types';
	import ParagraphRenderer from '../cec/ParagraphRenderer.svelte';
	import CitationBlock from '../cec/CitationBlock.svelte';

	function onNumberClick(n: number) {
		const s = get(studyPanel);
		openPanel({ kind: 'paragraph', paragraph: n }, s.activeTab);
	}

	type Block = { paragraphs: Paragraph[]; firstNumber: number };

	let blocks: Block[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (ctx?.kind !== 'paragraph') {
			blocks = [];
			return;
		}
		const paragraphNum = ctx.paragraph;
		(async () => {
			// Find the "following" en_bref: the one containing this paragraph
			// (if any), otherwise the next one in the corpus. This guarantees
			// every paragraph surfaces an en_bref · including section-intro
			// paragraphs like §26 that sit outside any chapter.
			const index = await loadEnBrefsIndex();
			const following = index.find((b) => b.last >= paragraphNum);
			if (!following || following.paragraphs.length === 0) {
				blocks = [];
				return;
			}
			const records = await Promise.all(following.paragraphs.map((n) => loadParagraph(n)));
			blocks = [{ paragraphs: records, firstNumber: following.paragraphs[0]! }];
		})();
	});
</script>

<div class="font-ui text-sm">
	{#if blocks.length === 0}
		<p class="text-muted italic">Pas d'En Bref disponible.</p>
	{:else}
		<div class="space-y-6">
			{#each blocks as block (block.firstNumber)}
				<div class="rounded-lg p-3 en-bref-block">
					<p class="text-[10px] uppercase tracking-[0.2em] text-muted font-bold mb-2">En Bref</p>
					{#each block.paragraphs as p (p.number)}
						<div class="mb-3 last:mb-0">
							<a
								href="/cec/{p.number}"
								onclick={() => onNumberClick(p.number)}
								class="block mb-1 text-sm font-semibold text-accent tabular-nums hover:underline font-ui"
							>
								CEC {p.number}
							</a>
							<div class="font-body text-[15px] leading-relaxed">
								<ParagraphRenderer
									html={p.text_html}
									bibleRefs={p.magisterial_refs}
									paragraphNumber={p.number}
									inPanel
								/>
								{#each p.citations as cite, i (i)}
									<CitationBlock html={cite.text_html} />
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.en-bref-block {
		background: color-mix(in srgb, var(--color-fg) 5%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-fg) 8%, transparent);
	}
</style>
