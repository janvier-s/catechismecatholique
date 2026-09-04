import type { NclBlock } from '$lib/data/types';

export interface VerseSpan {
	from: number;
	to: number;
}

/**
 * Sort verse spans and merge any that touch or overlap, so "3-5" + "6-8"
 * reads as one flowing "3-8" excerpt instead of two chunks with nothing
 * skipped between them. Genuinely disjoint spans (a gap of at least one
 * verse) stay separate.
 */
export function mergeVerseSpans(spans: VerseSpan[]): VerseSpan[] {
	const sorted = [...spans].sort((a, b) => a.from - b.from);
	const merged: VerseSpan[] = [];
	for (const span of sorted) {
		const last = merged[merged.length - 1];
		if (last && span.from <= last.to + 1) {
			last.to = Math.max(last.to, span.to);
		} else {
			merged.push({ ...span });
		}
	}
	return merged;
}

/**
 * Slice a chapter's paragraph/poetry blocks down to just the verses in
 * [from, to], preserving block kind/level/stanzaBreak. Blocks left with no
 * matching verse are dropped rather than kept empty.
 */
export function filterBlocksToSpan(blocks: NclBlock[], span: VerseSpan): NclBlock[] {
	const out: NclBlock[] = [];
	for (const block of blocks) {
		const verses = block.verses.filter((rv) => rv.v >= span.from && rv.v <= span.to);
		if (verses.length === 0) continue;
		out.push({ ...block, verses } as NclBlock);
	}
	return out;
}
