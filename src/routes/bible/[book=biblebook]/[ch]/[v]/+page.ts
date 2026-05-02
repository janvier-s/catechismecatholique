import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import { loadParagraph } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const ch = parseInt(params.ch!, 10);
	const v = parseInt(params.v!, 10);
	const [r1, r2] = await Promise.all([
		fetch('/data/bible/ncl.json'),
		fetch('/data/ccc/bible-index.json')
	]);
	const ncl = (await r1.json()) as Record<string, Record<string, Record<string, string>>>;
	const bibleIdx = (await r2.json()) as Record<string, number[]>;
	const text = ncl[book.usfx]?.[ch]?.[v];
	if (!text) throw error(404);

	// Pull all CCC paragraphs that cite this verse, including any whose range contains it.
	const cited = new Set<number>();
	for (const [refKey, paragraphs] of Object.entries(bibleIdx)) {
		const m = refKey.match(/^([1-3]?\s*[A-Za-zÉéèê]+)\s*(\d+):(\d+)(?:-(\d+))?$/);
		if (!m) continue;
		const refAbbr = m[1]!.trim();
		const refCh = parseInt(m[2]!, 10);
		const fromV = parseInt(m[3]!, 10);
		const toV = m[4] ? parseInt(m[4]!, 10) : fromV;
		const matchesBook = book.abbrs.some((a) => a === refAbbr);
		if (!matchesBook || refCh !== ch) continue;
		if (v >= fromV && v <= toV) {
			for (const n of paragraphs) cited.add(n);
		}
	}
	const sorted = Array.from(cited).sort((a, b) => a - b);
	const paragraphs = await Promise.all(sorted.map((n) => loadParagraph(n, fetch)));
	return { book, chapter: ch, verse: v, text, paragraphs };
};
