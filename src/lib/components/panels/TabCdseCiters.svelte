<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadCdseCitedByCcc, loadCdseParagraphs, loadCdseChapter } from '$lib/data/loaders';
	import type { CdseChapter } from '$lib/data/types';
	import { pluralFr } from '$lib/utils/i18n';

	type Hit = {
		number: number;
		chapterSlug: string;
		chapterTitle: string;
		html: string;
	};

	let hits: Hit[] = $state([]);
	let loaded = $state(false);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (ctx?.kind !== 'paragraph') {
			hits = [];
			loaded = false;
			return;
		}
		const paragraph = ctx.paragraph;
		(async () => {
			loaded = false;
			const [citedBy, locators] = await Promise.all([loadCdseCitedByCcc(), loadCdseParagraphs()]);
			const cdseNums = citedBy[String(paragraph)] ?? [];
			if (cdseNums.length === 0) {
				hits = [];
				loaded = true;
				return;
			}

			// Group CDSE paragraphs by chapter so each shard is fetched at most once.
			const numsByChapter: Record<string, number[]> = {};
			for (const n of cdseNums) {
				const loc = locators[String(n)];
				if (!loc) continue;
				(numsByChapter[loc.chapterSlug] = numsByChapter[loc.chapterSlug] ?? []).push(n);
			}

			const chapters = await Promise.all(
				Object.keys(numsByChapter).map((slug) =>
					loadCdseChapter(slug).then((c) => ({ slug, chapter: c }))
				)
			);
			const byNumber: Record<number, { chapterSlug: string; chapter: CdseChapter; html: string }> =
				{};
			for (const { slug, chapter } of chapters) {
				if (!chapter) continue;
				for (const b of chapter.blocks) {
					if (b.kind === 'paragraph') byNumber[b.n] = { chapterSlug: slug, chapter, html: b.html };
				}
			}

			hits = cdseNums
				.map((n): Hit | null => {
					const entry = byNumber[n];
					if (!entry) return null;
					return {
						number: n,
						chapterSlug: entry.chapterSlug,
						chapterTitle: entry.chapter.title,
						html: entry.html
					};
				})
				.filter((h): h is Hit => h !== null);
			loaded = true;
		})();
	});
</script>

{#if !loaded}
	<p class="text-muted italic font-ui text-sm">Chargement…</p>
{:else if hits.length === 0}
	<p class="text-muted italic font-ui text-sm">
		Aucun paragraphe de la Doctrine sociale ne cite ce paragraphe.
	</p>
{:else}
	<p class="text-muted text-xs mb-3 font-ui">
		{hits.length}
		{pluralFr(hits.length, 'paragraphe')} de la Doctrine sociale {hits.length === 1
			? 'cite'
			: 'citent'} ce paragraphe :
	</p>
	<ul class="space-y-4 list-none">
		{#each hits as h (h.number)}
			<li>
				<a
					href={`/doctrine-sociale/${h.chapterSlug}#p${h.number}`}
					class="block hover:bg-accent/5 rounded -mx-2 px-2 py-2 transition-colors"
				>
					<div class="flex items-baseline gap-2 mb-1">
						<span
							class="font-ui text-xs font-semibold tabular-nums text-accent uppercase tracking-wider"
						>
							§ {h.number}
						</span>
						<span class="font-ui text-[11px] text-muted truncate">
							{h.chapterTitle}
						</span>
					</div>
					<div class="cdse-snippet font-body text-[14px] leading-relaxed text-fg">
						{@html h.html}
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.cdse-snippet :global(p) {
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.cdse-snippet :global(.cdse-fn-ref) {
		display: none;
	}
	.cdse-snippet :global(.emphasis em),
	.cdse-snippet :global(em) {
		font-style: italic;
	}
</style>
