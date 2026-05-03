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

			// Scope candidates to the heading section(s) the user is reading. Each
			// en_bref summarises the heading section immediately preceding it, so
			// showing every en_bref in the article (which can span hundreds of
			// paragraphs) buries the relevant one. A heading's range runs from
			// its paragraph_start to one before the next heading's start (or to
			// the end of the article if it's the last heading).
			//
			// For range URLs (/ccc/N-M) every heading overlapping [N, M] is in
			// scope, so a reader on /ccc/218-223 — which spans both heading III
			// (214–221) and heading IV (222–231) — sees IV's en_bref (228–231)
			// regardless of which paragraph opened the panel.
			const article = chapter.articles.find((a) => a.slug === context!.article?.slug);
			const candidates = chapter.en_brefs ?? [];

			const rangeMatch = page.url.pathname.match(/^\/ccc\/(\d+)(?:-(\d+))?$/);
			const viewFrom = rangeMatch ? parseInt(rangeMatch[1]!, 10) : ctx.paragraph;
			const viewTo = rangeMatch?.[2] ? parseInt(rangeMatch[2], 10) : viewFrom;

			const headings = (article?.headings ?? chapter.headings ?? [])
				.slice()
				.sort((a, b) => a.paragraph_start - b.paragraph_start);
			const articleMax = article?.paragraphs.at(-1) ?? chapter.paragraphs.at(-1) ?? Infinity;

			const headingRanges: { from: number; to: number }[] = [];
			for (let i = 0; i < headings.length; i++) {
				const start = headings[i]!.paragraph_start;
				const end = headings[i + 1] ? headings[i + 1]!.paragraph_start - 1 : articleMax;
				if (start <= viewTo && end >= viewFrom) headingRanges.push({ from: start, to: end });
			}

			const inScope = (block: { paragraphs: number[] }) => {
				if (block.paragraphs.length === 0) return false;
				const first = block.paragraphs[0]!;
				if (headingRanges.length > 0) {
					return headingRanges.some((r) => first >= r.from && first <= r.to);
				}
				// No heading context — fall back to article range so we still
				// avoid leaking en_brefs from other articles.
				if (!article) return true;
				const articleMin = article.paragraphs[0] ?? 0;
				return first >= articleMin && first <= articleMax;
			};

			const filtered = candidates.filter(inScope);
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
