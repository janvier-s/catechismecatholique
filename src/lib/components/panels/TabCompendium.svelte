<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import {
		loadBibleVerseIndex,
		loadCompendiumCitedBy,
		loadCompendiumPart,
		loadCompendiumQRanges
	} from '$lib/data/loaders';
	import type { CompendiumQuestion, CompendiumQRange } from '$lib/data/types';
	import { frenchPunct } from '$lib/utils/typography';

	type Hit = {
		number: number;
		partSlug: string;
		question: string;
		answer_html: string;
		cccRange: string | null;
	};

	function formatRange(refs: number[]): string | null {
		if (!refs.length) return null;
		const sorted = [...refs].sort((a, b) => a - b);
		const min = sorted[0]!;
		const max = sorted[sorted.length - 1]!;
		return min === max ? `${min}` : `${min}-${max}`;
	}

	let hits: Hit[] = $state([]);
	let loaded = $state(false);
	let fromVerse = $state(false);
	/**
	 * Discards a run whose context is no longer current. The component is not
	 * remounted between contexts, so a slower earlier run would otherwise
	 * overwrite a later one's questions.
	 */
	let request = 0;

	$effect(() => {
		const ctx = $studyPanel.context;
		request++;
		if (ctx?.kind !== 'paragraph' && ctx?.kind !== 'verse') {
			hits = [];
			loaded = false;
			return;
		}
		fromVerse = ctx.kind === 'verse';
		const mine = request;
		(async () => {
			loaded = false;
			// A paragraph context asks about one paragraph. A verse context asks
			// about every paragraph citing that verse, so its questions are the
			// union over them.
			let paragraphs: number[];
			if (ctx.kind === 'paragraph') {
				paragraphs = [ctx.paragraph];
			} else {
				const verseIdx = await loadBibleVerseIndex();
				paragraphs =
					verseIdx[ctx.verseUsfx]?.[String(ctx.verseChapter)]?.[String(ctx.verseVerse)] ?? [];
			}

			const [citedBy, ranges] = await Promise.all([
				loadCompendiumCitedBy(),
				loadCompendiumQRanges()
			]);
			const qNumbers = [...new Set(paragraphs.flatMap((p) => citedBy[p] ?? []))].sort(
				(a, b) => a - b
			);
			if (qNumbers.length === 0) {
				if (mine !== request) return;
				hits = [];
				loaded = true;
				return;
			}

			// Group Q numbers by part so we load each part bundle at most once.
			// Plain objects (not Maps) · these are transient inside the effect
			// closure and don't need Svelte reactivity.
			const numbersByPart: Record<string, number[]> = {};
			for (const n of qNumbers) {
				const range = ranges.find((r: CompendiumQRange) => n >= r.from && n <= r.to);
				if (!range) continue;
				(numbersByPart[range.part] = numbersByPart[range.part] ?? []).push(n);
			}

			// Fetch each needed part bundle and pull out the matching questions.
			const parts = await Promise.all(
				Object.keys(numbersByPart).map((slug) =>
					loadCompendiumPart(slug).then((p) => ({ slug, part: p }))
				)
			);
			const byNumber: Record<number, { partSlug: string; q: CompendiumQuestion }> = {};
			for (const { slug, part } of parts) {
				for (const node of part.flow) {
					if (node.kind === 'question')
						byNumber[node.data.number] = { partSlug: slug, q: node.data };
				}
			}

			if (mine !== request) return;
			hits = qNumbers
				.map((n) => {
					const entry = byNumber[n];
					if (!entry) return null;
					return {
						number: n,
						partSlug: entry.partSlug,
						question: entry.q.question,
						answer_html: entry.q.answer_html,
						cccRange: formatRange(entry.q.ccc_refs ?? [])
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
		{fromVerse
			? "Aucune question du Compendium n'est liée à ce verset."
			: 'Aucune question du Compendium ne cite ce paragraphe.'}
	</p>
{:else}
	{#if fromVerse}
		<p class="font-ui text-xs text-muted mb-3">
			Questions liées aux paragraphes du Catéchisme qui citent ce verset.
		</p>
	{/if}
	<ul class="space-y-4">
		{#each hits as h (h.number)}
			<li>
				<a
					href={`/compendium/${h.partSlug}#q-${h.number}`}
					target="_blank"
					rel="noopener noreferrer"
					class="block hover:bg-accent/5 rounded -mx-2 px-2 py-2 transition-colors"
				>
					<div class="flex items-baseline gap-2 mb-1">
						<span
							class="font-ui text-xs font-semibold tabular-nums text-accent uppercase tracking-wider"
						>
							Q. {h.number}
						</span>
						{#if h.cccRange}
							<span class="font-ui text-[11px] tabular-nums text-muted">
								· {h.cccRange}
							</span>
						{/if}
					</div>
					<p class="font-heading italic text-[15px] font-semibold text-fg leading-snug mb-1">
						{frenchPunct(h.question)}
					</p>
					<div class="answer font-body text-[15px] leading-relaxed">
						{@html frenchPunct(h.answer_html)}
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.answer :global(p) {
		margin: 0;
	}
	.answer :global(p + p) {
		margin-top: 0.5rem;
	}
</style>
