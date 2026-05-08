<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import {
		loadCompendiumCitedBy,
		loadCompendiumPart,
		loadCompendiumQRanges
	} from '$lib/data/loaders';
	import type { CompendiumQuestion, CompendiumQRange } from '$lib/data/types';
	import { pluralFr } from '$lib/utils/i18n';

	type Hit = {
		number: number;
		partSlug: string;
		question: string;
		answer_html: string;
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
			const [citedBy, ranges] = await Promise.all([
				loadCompendiumCitedBy(),
				loadCompendiumQRanges()
			]);
			const qNumbers = citedBy[paragraph] ?? [];
			if (qNumbers.length === 0) {
				hits = [];
				loaded = true;
				return;
			}

			// Group Q numbers by part so we load each part bundle at most once.
			const numbersByPart = new Map<string, number[]>();
			for (const n of qNumbers) {
				const range = ranges.find((r: CompendiumQRange) => n >= r.from && n <= r.to);
				if (!range) continue;
				const arr = numbersByPart.get(range.part) ?? [];
				arr.push(n);
				numbersByPart.set(range.part, arr);
			}

			// Fetch each needed part bundle and pull out the matching questions.
			const parts = await Promise.all(
				[...numbersByPart.keys()].map((slug) =>
					loadCompendiumPart(slug).then((p) => ({ slug, part: p }))
				)
			);
			const byNumber = new Map<number, { partSlug: string; q: CompendiumQuestion }>();
			for (const { slug, part } of parts) {
				for (const node of part.flow) {
					if (node.kind === 'question')
						byNumber.set(node.data.number, { partSlug: slug, q: node.data });
				}
			}

			hits = qNumbers
				.map((n) => {
					const entry = byNumber.get(n);
					if (!entry) return null;
					return {
						number: n,
						partSlug: entry.partSlug,
						question: entry.q.question,
						answer_html: entry.q.answer_html
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
		Aucune question du Compendium ne cite ce paragraphe.
	</p>
{:else}
	<p class="text-muted text-xs mb-3 font-ui">
		{hits.length}
		{pluralFr(hits.length, 'question')} du Compendium {hits.length === 1 ? 'cite' : 'citent'} ce paragraphe
		:
	</p>
	<ul class="space-y-4">
		{#each hits as h (h.number)}
			<li>
				<a
					href={`/compendium/${h.partSlug}#q-${h.number}`}
					class="block hover:bg-accent/5 rounded -mx-2 px-2 py-2 transition-colors"
				>
					<div class="flex items-baseline gap-2 mb-1">
						<span
							class="font-ui text-xs font-semibold tabular-nums text-accent uppercase tracking-wider"
						>
							Q. {h.number}
						</span>
					</div>
					<p class="font-heading italic text-[15px] font-semibold text-fg leading-snug mb-1">
						{h.question}
					</p>
					<div class="font-body text-[13.5px] leading-relaxed text-subtle line-clamp-3">
						{@html h.answer_html}
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	/* Truncate the answer preview to 3 lines so the tab fits multiple Q cards
	   without scrolling each into a wall of text. */
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
	}
	/* Strip the answer's <p> margin since the line-clamp container expects
	   inline-ish content for the ellipsis to land cleanly. */
	.line-clamp-3 :global(p) {
		margin: 0;
		display: inline;
	}
</style>
