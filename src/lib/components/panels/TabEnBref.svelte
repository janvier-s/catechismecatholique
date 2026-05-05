<script lang="ts">
	import { get } from 'svelte/store';
	import { page } from '$app/state';
	import { studyPanel, openPanel } from '$lib/stores/studyPanel';
	import { loadParagraphContexts, loadChapter, loadParagraph } from '$lib/data/loaders';
	import type { ParagraphContext, Paragraph, Chapter } from '$lib/data/types';
	import ParagraphRenderer from '../ccc/ParagraphRenderer.svelte';
	import CitationBlock from '../ccc/CitationBlock.svelte';

	function onNumberClick(n: number) {
		const s = get(studyPanel);
		openPanel({ kind: 'paragraph', paragraph: n }, s.activeTab ?? 'cross-refs');
	}

	type Block = { paragraphs: Paragraph[]; firstNumber: number };

	let context: ParagraphContext | null = $state(null);
	let blocks: Block[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (ctx?.kind !== 'paragraph') {
			context = null;
			blocks = [];
			return;
		}
		const paragraphNum = ctx.paragraph;
		(async () => {
			const ctxs = await loadParagraphContexts();
			context = ctxs[paragraphNum] ?? null;
			if (!context?.chapter) {
				blocks = [];
				return;
			}
			const chapter: Chapter = await loadChapter(context.chapter.slug);

			// Show every en_bref in the article (or chapter, when there's no
			// active article — chapters like "L'homme est capable de Dieu"
			// have headings + en_brefs without article wrappers). Sorted by
			// proximity to the paragraph that opened the panel so the most
			// relevant block lands at the top.
			//
			// An earlier version scoped to the active heading section, but
			// the catechism's article-level en_brefs (e.g. the 7 blocks in
			// «Je crois en Dieu le Père» Article 1) are organised by
			// `Paragraphe` subdivision, not by Roman heading. The scope
			// often missed the relevant block entirely and showed "Pas d'En
			// Bref disponible" on sections that have plenty.
			const article = chapter.articles.find((a) => a.slug === context!.article?.slug);
			const candidates = chapter.en_brefs ?? [];

			const rangeMatch = page.url.pathname.match(/^\/ccc\/(\d+)(?:-(\d+))?$/);
			const viewFrom = rangeMatch ? parseInt(rangeMatch[1]!, 10) : paragraphNum;
			const viewTo = rangeMatch?.[2] ? parseInt(rangeMatch[2], 10) : viewFrom;
			const focal = (viewFrom + viewTo) / 2;

			const articleMin = article?.paragraphs[0];
			const articleMax = article?.paragraphs.at(-1);
			const inScope = (block: { paragraphs: number[] }) => {
				if (block.paragraphs.length === 0) return false;
				if (articleMin === undefined || articleMax === undefined) return true;
				const first = block.paragraphs[0]!;
				return first >= articleMin && first <= articleMax;
			};

			const filtered = candidates.filter(inScope).sort((a, b) => {
				const da = Math.abs(a.paragraphs[0]! - focal);
				const db = Math.abs(b.paragraphs[0]! - focal);
				return da - db;
			});
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
