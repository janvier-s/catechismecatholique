<script lang="ts">
	import { tick } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraph, loadNclBook } from '$lib/data/loaders';
	import { bookByAbbr, type BookInfo } from '$lib/utils/bibleBookSlug';
	import type { BibleRef, MagisterialRefRecord, NclBible } from '$lib/data/types';

	type RefStyle = 'inline' | 'sup' | 'cluster-leader' | 'cluster-member';
	type ParsedRef = {
		raw: string;
		idx: number;
		marker: number; // 1-based number to display; differs from idx for cluster members
		style: RefStyle;
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
			const usfxes = new SvelteSet<string>();
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
	function parseRef(raw: string, idx: number, marker: number, style: RefStyle): ParsedRef | null {
		const m = raw.match(/^([1-3]?\s*[A-Za-zÉéèê]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?/);
		if (!m) return null;
		const book = bookByAbbr(m[1]!.trim());
		if (!book) return null;
		const chapter = parseInt(m[2]!, 10);
		const fromV = m[3] ? parseInt(m[3], 10) : undefined;
		const toV = m[4] ? parseInt(m[4], 10) : fromV;
		return { raw, idx, marker, style, book, chapter, fromV, toV };
	}

	function markerAndStyleForIdx(idx: number): { marker: number; style: RefStyle } {
		const m = magisterial.find((r) => Number(r.idx) === idx);
		if (!m) return { marker: idx, style: 'inline' };
		const display = m.display_idx ?? idx;
		// Cluster member — no marker, indented with left rule.
		if (m.marker_idx !== undefined && m.marker_idx !== idx) {
			return { marker: display, style: 'cluster-member' };
		}
		// Cluster leader — at least one other ref points at me. Marker labels
		// the WHOLE group via a header row, so the leader's verse row carries
		// no inline marker.
		const isLeader = magisterial.some((r) => r.marker_idx === idx);
		if (isLeader) return { marker: display, style: 'cluster-leader' };
		// Solo ref — existing voir heuristic.
		return { marker: display, style: /^voir\s/i.test(m.raw) ? 'sup' : 'inline' };
	}

	$effect(() => {
		if (!bible) return;
		const out: RefWithVerses[] = [];
		for (let i = 0; i < refs.length; i++) {
			const idx = i + 1;
			const { marker, style } = markerAndStyleForIdx(idx);
			const parsed = parseRef(refs[i]!.text, idx, marker, style);
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

		// Build the set of idxs to flash. If `target` is a cluster member or
		// leader, expand to the full cluster; otherwise it's just the one row.
		const targetMag = magisterial.find((r) => Number(r.idx) === target);
		let flashIdxs: number[];
		if (targetMag?.marker_idx !== undefined && targetMag.marker_idx !== target) {
			const leaderIdx = targetMag.marker_idx;
			flashIdxs = [
				leaderIdx,
				...magisterial.filter((r) => r.marker_idx === leaderIdx).map((r) => Number(r.idx))
			];
		} else if (magisterial.some((r) => r.marker_idx === target)) {
			flashIdxs = [
				target,
				...magisterial.filter((r) => r.marker_idx === target).map((r) => Number(r.idx))
			];
		} else {
			flashIdxs = [target];
		}

		(async () => {
			await tick();
			const rows = flashIdxs
				.map((idx) => listEl?.querySelector<HTMLElement>(`[data-idx="${idx}"]`))
				.filter((el): el is HTMLElement => el != null);
			if (rows.length === 0) return;

			// Scroll only the panel's inner overflow container so the outer
			// document doesn't jump. If the closest .styled-scroll ancestor is
			// missing for any reason, skip scrolling — the flash still pulls
			// the eye.
			const scrollEl = rows[0]!.closest<HTMLElement>('.styled-scroll');
			if (scrollEl) {
				const containerRect = scrollEl.getBoundingClientRect();
				const targetRect = rows[0]!.getBoundingClientRect();
				const offset = targetRect.top - containerRect.top + scrollEl.scrollTop - 8;
				// Only scroll if the row isn't fully visible — avoids the
				// "page jiggles every time" feel for short paragraphs.
				if (targetRect.top < containerRect.top || targetRect.bottom > containerRect.bottom) {
					scrollEl.scrollTo({ top: offset, behavior: 'smooth' });
				}
			}

			for (const el of rows) el.classList.add('ref-flash');
			setTimeout(() => {
				for (const el of rows) el.classList.remove('ref-flash');
			}, 1400);
		})();
	});
</script>

{#snippet verseBody(r: RefWithVerses)}
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
					{#if r.verses.length > 1}
						<sup class="top-0 align-baseline text-xs text-accent tabular-nums mr-2">{v.v}</sup>
					{/if}
					{v.text}
				</span>
			{/each}
		</div>
	{:else}
		<p class="mt-1 text-xs text-muted italic">Verset non disponible.</p>
	{/if}
{/snippet}

<div class="font-ui text-sm">
	{#if refs.length === 0}
		<p class="text-muted italic">Aucune référence biblique.</p>
	{:else}
		<ul bind:this={listEl} class="space-y-3 sm:space-y-5">
			{#each resolved as r (r.raw + ':' + r.idx)}
				{#if r.style === 'cluster-leader'}
					<li class="cluster-header" aria-hidden="true">
						<sup class="ref-marker">{r.marker}</sup>
					</li>
				{/if}
				<li
					data-idx={r.idx}
					class="rounded"
					class:cluster-verse={r.style === 'cluster-leader' || r.style === 'cluster-member'}
				>
					<div class="flex items-baseline gap-1.5">
						{#if r.style === 'sup'}
							<sup class="ref-marker">{r.marker}</sup>
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
					{@render verseBody(r)}
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
	/* Cluster header — the marker that labels a footnote group. Sits on its
	   own row above the cluster verses so it visually attaches to the whole
	   group, not just the first verse. */
	li.cluster-header {
		padding: 0;
		margin: 0;
	}
	li.cluster-header sup.ref-marker {
		font-size: 0.85em;
	}
	/* Cluster verses — leader's verse + all its members, indented under the
	   header with a subtle accent rule. No border-radius so the left border
	   draws as one unbroken line across all members. */
	li.cluster-verse {
		margin-left: 0.75rem;
		padding-left: 0.75rem;
		border-left: 2px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
		border-radius: 0;
	}
	/* Consecutive cluster verses: no gap so the left border is continuous.
	   Inner padding-top provides the breathing room instead. */
	li.cluster-verse + li.cluster-verse {
		margin-top: 0;
		padding-top: 0.5rem;
	}
	/* Header sits immediately above the first cluster verse — tight gap so the
	   marker reads as attached to the group, not floating above it. */
	li.cluster-header + li.cluster-verse {
		margin-top: 0;
	}
</style>
