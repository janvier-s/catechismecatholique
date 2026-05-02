import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const ch = params.ch!;
	const [r1, r2] = await Promise.all([
		fetch('/data/bible/ncl.json'),
		fetch('/data/ccc/bible-index.json')
	]);
	const ncl = (await r1.json()) as Record<string, Record<string, Record<string, string>>>;
	const bibleIdx = (await r2.json()) as Record<string, number[]>;
	const verses = ncl[book.usfx]?.[ch];
	if (!verses) throw error(404);
	const primaryAbbr = book.abbrs[0]!;
	const verseList = Object.entries(verses)
		.map(([v, text]) => ({
			v: parseInt(v, 10),
			text,
			cccCitations: bibleIdx[`${primaryAbbr} ${ch}:${v}`] ?? []
		}))
		.sort((a, b) => a.v - b.v);
	return { book, chapter: parseInt(ch, 10), verses: verseList };
};
