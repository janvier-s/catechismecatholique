<script lang="ts">
	import type { PageData } from './$types';
	import { stripDiacritics } from '$lib/utils/searchTokenizer';
	let { data }: { data: PageData } = $props();

	function escapeHtml(s: string): string {
		return s
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	// Walk word-runs in the ORIGINAL text. Folding (œ→oe) changes string length,
	// so any approach that searches inside `stripDiacritics(text)` and then
	// slices `text` by those indices misaligns after each ligature. Comparing
	// per-word avoids the offset entirely and matches MiniSearch's tokenization.
	function* foldedWords(text: string): Generator<{ start: number; end: number; folded: string }> {
		const re = /[\p{L}\p{N}]+/gu;
		let m: RegExpExecArray | null;
		while ((m = re.exec(text)) !== null) {
			yield {
				start: m.index,
				end: m.index + m[0].length,
				folded: stripDiacritics(m[0]).toLowerCase()
			};
		}
	}

	// Pick the densest snippet — a 220-char window anchored on the position
	// with the highest match density. Falls back to the document head when no
	// terms match.
	function bestSnippet(text: string, terms: string[]): { start: number; end: number } {
		const MAX = 220;
		if (terms.length === 0 || text.length <= MAX)
			return { start: 0, end: Math.min(text.length, MAX) };
		const termSet = new Set(terms.map((t) => stripDiacritics(t).toLowerCase()));
		const positions: number[] = [];
		for (const w of foldedWords(text)) {
			if (termSet.has(w.folded)) positions.push(w.start);
		}
		if (positions.length === 0) return { start: 0, end: MAX };
		let best = { start: 0, end: MAX, count: 0 };
		for (const p of positions) {
			const start = Math.max(0, p - 60);
			const end = Math.min(text.length, start + MAX);
			const count = positions.filter((x) => x >= start && x < end).length;
			if (count > best.count) best = { start, end, count };
		}
		while (best.start > 0 && /\w/.test(text[best.start - 1] ?? '')) best.start--;
		while (best.end < text.length && /\w/.test(text[best.end] ?? '')) best.end++;
		return best;
	}

	function highlight(text: string, terms: string[]): string {
		if (terms.length === 0) return escapeHtml(text);
		const termSet = new Set(terms.map((t) => stripDiacritics(t).toLowerCase()));
		const parts: string[] = [];
		let last = 0;
		for (const w of foldedWords(text)) {
			if (!termSet.has(w.folded)) continue;
			parts.push(escapeHtml(text.slice(last, w.start)));
			parts.push(
				`<mark class="search-highlight">${escapeHtml(text.slice(w.start, w.end))}</mark>`
			);
			last = w.end;
		}
		parts.push(escapeHtml(text.slice(last)));
		return parts.join('');
	}

	function hitHref(h: PageData['hits'][number]): string {
		if (h.kind === 'paragraph') return `/ccc/${h.number}`;
		const anchor = h.id.split('#')[1] ?? '';
		if (h.paragraph_start) return `/ccc/${h.paragraph_start}${anchor ? '#' + anchor : ''}`;
		if (h.chapter_slug) return `/ccc/${h.chapter_slug}${anchor ? '#' + anchor : ''}`;
		return '/ccc';
	}

	function hitMatchTerms(h: PageData['hits'][number]): string[] {
		return Object.keys(h.match);
	}

	function snippetHtml(h: PageData['hits'][number]): string {
		const terms = hitMatchTerms(h);
		const { start, end } = bestSnippet(h.text, terms);
		const slice = h.text.slice(start, end);
		const ellipsisL = start > 0 ? '…' : '';
		const ellipsisR = end < h.text.length ? '…' : '';
		return ellipsisL + highlight(slice, terms) + ellipsisR;
	}
</script>

<svelte:head>
	<title>Recherche{data.q ? ` : ${data.q.slice(0, 80)}` : ''} — Catéchisme</title>
</svelte:head>

<main class="mx-auto max-w-reader px-6 py-10">
	<h1 class="font-heading text-4xl font-semibold mb-6">Recherche</h1>

	{#if !data.q}
		<p class="text-muted">
			Utilisez la barre de recherche en haut. Tapez un mot, un numéro de paragraphe (§&nbsp;27) ou
			une référence biblique (Jn&nbsp;1,&nbsp;14).
		</p>
	{:else if data.hits.length === 0}
		<p class="text-muted italic">Aucun résultat pour « {data.q} ».</p>
	{:else}
		<p class="font-ui text-xs text-muted mb-4 tabular-nums">
			{data.hits.length} résultat(s) pour <span class="text-foreground">« {data.q} »</span>
		</p>
		<ul class="space-y-5">
			{#each data.hits as h (h.id)}
				<li>
					<a href={hitHref(h)} class="block hover:bg-accent/5 p-3 -mx-3 rounded">
						<div class="font-ui text-xs text-accent font-semibold tabular-nums">
							{#if h.kind === 'paragraph'}CEC {h.number}{:else}Titre · CEC {h.paragraph_start}{/if}
						</div>
						<div class="font-body mt-1 text-[15px] leading-relaxed">
							{@html snippetHtml(h)}
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</main>

<style>
	:global(.search-highlight) {
		background: color-mix(in srgb, var(--color-accent) 20%, transparent);
		color: inherit;
		border-radius: 2px;
		padding: 1px 3px;
		font-weight: 600;
	}
</style>
