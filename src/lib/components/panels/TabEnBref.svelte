<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraphContexts, loadChapter, loadParagraph } from '$lib/data/loaders';
	import type { ParagraphContext, Paragraph, Chapter } from '$lib/data/types';
	import ParagraphRenderer from '../ccc/ParagraphRenderer.svelte';

	type Block = { paragraphs: Paragraph[]; firstNumber: number };

	let context: ParagraphContext | null = $state(null);
	let chapter: Chapter | null = $state(null);
	let blocks: Block[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) {
			context = null;
			chapter = null;
			blocks = [];
			return;
		}
		(async () => {
			const ctxs = await loadParagraphContexts();
			context = ctxs[ctx.paragraph] ?? null;
			if (!context?.chapter) {
				chapter = null;
				blocks = [];
				return;
			}
			chapter = await loadChapter(context.chapter.slug);
			const result: Block[] = [];
			for (const block of chapter.en_brefs ?? []) {
				if (block.paragraphs.length === 0) continue;
				const records = await Promise.all(block.paragraphs.map((n) => loadParagraph(n)));
				result.push({ paragraphs: records, firstNumber: block.paragraphs[0]! });
			}
			blocks = result;
		})();
	});
</script>

<div class="font-ui text-sm">
	{#if blocks.length === 0}
		<p class="text-muted italic">Pas d'En Bref disponible.</p>
	{:else}
		{#if context?.chapter}
			<p class="text-xs text-muted mb-3">
				Chapitre :
				<a
					href={`/ccc/${context.part.slug}/${context.section!.slug}/${context.chapter.slug}`}
					class="text-accent hover:underline"
				>
					{context.chapter.title}
				</a>
			</p>
		{/if}
		<div class="space-y-6">
			{#each blocks as block (block.firstNumber)}
				<div class="rounded-lg p-3 en-bref-block">
					<p class="text-[10px] uppercase tracking-[0.2em] text-muted font-bold mb-2">En Bref</p>
					{#each block.paragraphs as p (p.number)}
						<div class="flex gap-3 mb-2 last:mb-0">
							<a
								href="/ccc/{p.number}"
								class="flex-none w-10 text-right pt-0.5 text-xs font-semibold text-accent tabular-nums hover:underline"
							>
								{p.number}
							</a>
							<div class="flex-1 text-[13px] leading-relaxed">
								<ParagraphRenderer html={p.text_html} paragraphNumber={p.number} />
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
