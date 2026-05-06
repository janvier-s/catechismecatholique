<script lang="ts">
	import { tick } from 'svelte';
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraph, loadNclBook } from '$lib/data/loaders';
	import { bookByAbbr, type BookInfo } from '$lib/utils/bibleBookSlug';
	import type { BibleRef, MagisterialRefRecord, NclBible } from '$lib/data/types';

	type RefStyle = 'inline' | 'sup';
	type ParsedRef = {
		raw: string;
		idx: number; // 1-based, matches data-idx on the in-text marker
		style: RefStyle; // 'sup' = "voir N" footnote in text; 'inline' = parens in text
		book: BookInfo;
		chapter: number;
		fromV?: number;
		toV?: number;
	};
	type RefWithVerses = ParsedRef & { verses: { v: number; text: string }[] };

	let refs: BibleRef[] = $state([]);
	let magisterial: MagisterialRefRecord[] = $state([]);
	let bible: NclBible | null = $state(null);
	let resolved: RefWithVerses[] = $state([]);
	let listEl: HTMLUListElement | undefined = $state();

	$effect(() => {
		const ctx = $studyPanel.context;
		if (ctx?.kind !== 'paragraph') return;
		(async () => {
			const p = await loadParagraph(ctx.paragraph);
			refs = p.bible_refs;
			magisterial = p.magisterial_refs;
			// Lazily load only the NCL books actually referenced by this paragraph.
			const usfxes = new Set<string>();
			for (const r of p.bible_refs) {
				const m = r.text.match(/^([1-3]?\s*[A-Za-zÉéèê]+)/);
				if (!m) continue;
				const b = bookByAbbr(m[1]!.trim());
				if (b) usfxes.add(b.usfx);
			}
			const list = Array.from(usfxes);
			const books = await Promise.all(list.map((u) => loadNclBook(u)));
			const next: NclBible = {};
			for (let i = 0; i < list.length; i++) {
				const data = books[i];
				if (data) next[list[i]!] = data;
			}
			bible = next;
		})();
	});

	// Verse part is optional so chapter-only refs (e.g. "Os 11", "Ez 16") parse.
	function parseRef(raw: string, idx: number, style: RefStyle): ParsedRef | null {
		const m = raw.match(/^([1-3]?\s*[A-Za-zÉéèê]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?/);
		if (!m) return null;
		const book = bookByAbbr(m[1]!.trim());
		if (!book) return null;
		const chapter = parseInt(m[2]!, 10);
		const fromV = m[3] ? parseInt(m[3], 10) : undefined;
		const toV = m[4] ? parseInt(m[4], 10) : fromV;
		return { raw, idx, style, book, chapter, fromV, toV };
	}

	// Marker style mirrors the text: refs whose magisterial raw starts with "voir"
	// render as sup footnotes in text, the rest as inline (Book Ch, V) parens.
	function styleForIdx(idx: number): RefStyle {
		const m = magisterial.find((r) => Number(r.idx) === idx);
		return m && /^voir\s/i.test(m.raw) ? 'sup' : 'inline';
	}

	$effect(() => {
		if (!bible) return;
		const out: RefWithVerses[] = [];
		for (let i = 0; i < refs.length; i++) {
			const idx = i + 1;
			const parsed = parseRef(refs[i]!.text, idx, styleForIdx(idx));
			if (!parsed) continue;
			const verses: { v: number; text: string }[] = [];
			if (parsed.fromV !== undefined && parsed.toV !== undefined) {
				const chapterVerses = bible[parsed.book.usfx]?.[String(parsed.chapter)] ?? {};
				for (let v = parsed.fromV; v <= parsed.toV; v++) {
					const text = chapterVerses[String(v)];
					if (text) verses.push({ v, text });
				}
			}
			out.push({ ...parsed, verses });
		}
		resolved = out;
	});

	$effect(() => {
		const ctx = $studyPanel.context;
		const target = ctx?.kind === 'paragraph' ? ctx.bibleRefIdx : undefined;
		if (target === undefined || resolved.length === 0 || !listEl) return;
		(async () => {
			await tick();
			const el = listEl?.querySelector<HTMLElement>(`[data-idx="${target}"]`);
			if (!el) return;
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			el.classList.add('ref-flash');
			setTimeout(() => el.classList.remove('ref-flash'), 1400);
		})();
	});
</script>

<div class="font-ui text-sm">
	{#if refs.length === 0}
		<p class="text-muted italic">Aucune référence biblique.</p>
	{:else}
		<ul bind:this={listEl} class="space-y-5">
			{#each resolved as r (r.raw + ':' + r.idx)}
				<li data-idx={r.idx} class="rounded">
					<div class="flex items-baseline gap-1.5">
						{#if r.style === 'sup'}
							<sup class="ref-marker">{r.idx}</sup>
						{/if}
						<a
							href="/bible/{r.book.slug}/{r.chapter}{r.fromV !== undefined ? `/${r.fromV}` : ''}"
							class="font-semibold text-accent hover:underline"
						>
							{r.book.frenchName}
							{r.chapter}{#if r.fromV !== undefined},
								{#if r.toV !== r.fromV}{r.fromV}–{r.toV}{:else}{r.fromV}{/if}
							{/if}
						</a>
					</div>
					{#if r.fromV === undefined}
						<a
							href="/bible/{r.book.slug}/{r.chapter}"
							target="_blank"
							rel="noopener noreferrer"
							class="mt-1 inline-block text-[13px] text-accent hover:underline"
						>
							Lire le chapitre entier&nbsp;→
						</a>
					{:else if r.verses.length > 0}
						<div class="mt-2 font-body text-[15px] leading-relaxed">
							{#each r.verses as v (v.v)}
								<span class="block">
									<sup class="top-0 align-baseline text-xs text-accent tabular-nums mr-1">{v.v}</sup
									>
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

<style>
	li {
		transition: background-color 0.6s ease;
		padding: 0.25rem 0.5rem;
		margin: -0.25rem -0.5rem;
	}
	:global(li.ref-flash) {
		background-color: color-mix(in srgb, var(--color-accent) 18%, transparent);
		transition: background-color 0.15s ease;
	}
	.ref-marker {
		color: var(--color-muted);
		font-weight: 500;
	}
	sup.ref-marker {
		font-size: 0.75em;
	}
</style>
