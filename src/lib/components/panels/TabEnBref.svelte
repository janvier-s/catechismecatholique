<script lang="ts">
	import { get } from 'svelte/store';
	import { studyPanel, openPanel } from '$lib/stores/studyPanel';
	import { loadParagraphContexts, loadChapter, loadParagraph } from '$lib/data/loaders';
	import type { ParagraphContext, Paragraph, Chapter } from '$lib/data/types';
	import ParagraphRenderer from '../ccc/ParagraphRenderer.svelte';

	function onNumberClick(n: number) {
		const s = get(studyPanel);
		openPanel({ paragraph: n }, s.activeTab ?? 'cross-refs');
	}

	type Block = { paragraphs: Paragraph[]; firstNumber: number };

	let context: ParagraphContext | null = $state(null);
	let blocks: Block[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) {
			context = null;
			blocks = [];
			return;
		}
		(async () => {
			const ctxs = await loadParagraphContexts();
			context = ctxs[ctx.paragraph] ?? null;
			if (!context?.chapter) {
				blocks = [];
				return;
			}
			const chapter: Chapter = await loadChapter(context.chapter.slug);

			// Filter to only the en_bref(s) belonging to the same article as the current paragraph,
			// when an article context is known. Match by paragraph-range overlap with the article.
			const article = chapter.articles.find((a) => a.slug === context!.article?.slug);
			const candidates = chapter.en_brefs ?? [];

			const inArticle = (block: { paragraphs: number[] }) => {
				if (!article) return true; // no article context — show all chapter en_brefs
				if (block.paragraphs.length === 0) return false;
				const first = block.paragraphs[0]!;
				const articleParas = article.paragraphs;
				if (articleParas.length === 0) return false;
				const articleMin = articleParas[0]!;
				const articleMax = articleParas[articleParas.length - 1]!;
				return first >= articleMin && first <= articleMax;
			};

			const filtered = candidates.filter(inArticle);
			const result: Block[] = [];
			for (const block of filtered) {
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
		<div class="space-y-6">
			{#each blocks as block (block.firstNumber)}
				<div class="rounded-lg p-3 en-bref-block">
					<p class="text-[10px] uppercase tracking-[0.2em] text-muted font-bold mb-2">En Bref</p>
					{#each block.paragraphs as p (p.number)}
						<div class="mb-3 last:mb-0">
							<a
								href="/ccc/{p.number}"
								onclick={() => onNumberClick(p.number)}
								class="block mb-1 text-sm font-semibold text-accent tabular-nums hover:underline font-ui"
							>
								CEC {p.number}
							</a>
							<div class="font-body text-[15px] leading-relaxed">
								<ParagraphRenderer html={p.text_html} paragraphNumber={p.number} inPanel />
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
