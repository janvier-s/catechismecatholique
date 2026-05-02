<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraph } from '$lib/data/loaders';
	import { bookByAbbr, type BookInfo } from '$lib/utils/bibleBookSlug';
	import type { BibleRef } from '$lib/data/types';

	type ParsedRef = {
		raw: string;
		book: BookInfo;
		chapter: number;
		fromV: number;
		toV: number;
	};
	type RefWithVerses = ParsedRef & { verses: { v: number; text: string }[] };

	let refs: BibleRef[] = $state([]);
	let bible: Record<string, Record<string, Record<string, string>>> | null = $state(null);
	let resolved: RefWithVerses[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) return;
		(async () => {
			const [p, bibleResp] = await Promise.all([
				loadParagraph(ctx.paragraph),
				fetch('/data/bible/ncl.json').then((r) => r.json())
			]);
			refs = p.bible_refs;
			bible = bibleResp;
		})();
	});

	function parseRef(raw: string): ParsedRef | null {
		const m = raw.match(/^([1-3]?\s*[A-Za-zÉéèê]+)\s+(\d+):(\d+)(?:-(\d+))?/);
		if (!m) return null;
		const book = bookByAbbr(m[1]!.trim());
		if (!book) return null;
		const chapter = parseInt(m[2]!, 10);
		const fromV = parseInt(m[3]!, 10);
		const toV = m[4] ? parseInt(m[4]!, 10) : fromV;
		return { raw, book, chapter, fromV, toV };
	}

	$effect(() => {
		if (!bible) return;
		const out: RefWithVerses[] = [];
		for (const r of refs) {
			const parsed = parseRef(r.text);
			if (!parsed) continue;
			const verses: { v: number; text: string }[] = [];
			const chapterVerses = bible[parsed.book.usfx]?.[String(parsed.chapter)] ?? {};
			for (let v = parsed.fromV; v <= parsed.toV; v++) {
				const text = chapterVerses[String(v)];
				if (text) verses.push({ v, text });
			}
			out.push({ ...parsed, verses });
		}
		resolved = out;
	});
</script>

<div class="font-ui text-sm">
	{#if refs.length === 0}
		<p class="text-muted italic">Aucune référence biblique.</p>
	{:else}
		<ul class="space-y-5">
			{#each resolved as r (r.raw + ':' + r.fromV)}
				<li>
					<a
						href="/bible/{r.book.slug}/{r.chapter}/{r.fromV}"
						class="font-semibold text-accent hover:underline"
					>
						{r.book.frenchName} {r.chapter},
						{#if r.toV !== r.fromV}{r.fromV}–{r.toV}{:else}{r.fromV}{/if}
					</a>
					{#if r.verses.length > 0}
						<div class="mt-2 font-body text-[15px] leading-relaxed">
							{#each r.verses as v (v.v)}
								<span class="block">
									<sup class="text-xs text-accent tabular-nums mr-1">{v.v}</sup>
									{v.text}
								</span>
							{/each}
						</div>
					{:else}
						<p class="mt-1 text-xs text-muted italic">Verset non disponible.</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
