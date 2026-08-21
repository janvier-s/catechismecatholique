import { error } from '@sveltejs/kit';
import { loadParagraph, loadParagraphContext } from '$lib/data/loaders';
import type { PageLoad } from './$types';

const LAST = 2865;
/** Upper bound on a multi selection · keeps a hand-typed 1-2865,1 from
 *  fetching the whole catechism in one page load. */
const MAX_MULTI = 120;

/** Expand a comma-separated list of numbers and ranges into sorted, deduped
 *  paragraph numbers. Segments out of bounds are dropped rather than fatal. */
function expandSelection(ref: string): number[] {
	const seen = new Set<number>();
	for (const segment of ref.split(',')) {
		const bounds = segment.split('-').map((s) => parseInt(s, 10));
		const from = bounds[0]!;
		const to = bounds.length > 1 ? bounds[1]! : from;
		if (from < 1 || to < from || to > LAST) continue;
		for (let n = from; n <= to; n++) seen.add(n);
	}
	return [...seen].sort((a, b) => a - b);
}

/** Render numbers back as a compact reference · 268, 279–280, 290–295. */
function compactLabel(numbers: number[]): string {
	const parts: string[] = [];
	for (let i = 0; i < numbers.length; ) {
		let j = i;
		while (j + 1 < numbers.length && numbers[j + 1] === numbers[j]! + 1) j++;
		parts.push(i === j ? `${numbers[i]}` : `${numbers[i]}–${numbers[j]}`);
		i = j + 1;
	}
	return parts.join(', ');
}

export const load: PageLoad = async ({ params, fetch }) => {
	const ref = params.ref!;
	const isMulti = ref.includes(',');
	const isRange = !isMulti && ref.includes('-');

	if (isMulti) {
		const all = expandSelection(ref);
		if (all.length === 0) throw error(404, 'Références invalides');
		const numbers = all.slice(0, MAX_MULTI);
		const paragraphs = await Promise.all(numbers.map((n) => loadParagraph(n, fetch)));
		return {
			kind: 'multi' as const,
			numbers,
			paragraphs,
			display: compactLabel(numbers),
			truncated: all.length > numbers.length
		};
	}

	if (isRange) {
		const parts = ref.split('-').map((s) => parseInt(s, 10));
		const from = parts[0]!;
		const to = parts[1]!;
		if (from < 1 || to < from || to > 2865) throw error(404, 'Plage invalide');
		const numbers: number[] = [];
		for (let n = from; n <= to; n++) numbers.push(n);
		const [paragraphs, context] = await Promise.all([
			Promise.all(numbers.map((n) => loadParagraph(n, fetch))),
			loadParagraphContext(from, fetch)
		]);
		return { kind: 'range' as const, from, to, paragraphs, context: context ?? undefined };
	}

	const n = parseInt(ref, 10);
	if (n < 1 || n > 2865) throw error(404, 'Paragraphe inconnu');
	const [paragraph, context] = await Promise.all([
		loadParagraph(n, fetch),
		loadParagraphContext(n, fetch)
	]);
	return { kind: 'paragraph' as const, paragraph, context: context ?? undefined };
};
