import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import { loadParagraph } from '$lib/data/loaders';
import type { BibleVerseIndex } from '$lib/data/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const ch = parseInt(params.ch!, 10);
	const v = parseInt(params.v!, 10);
	const [r1, r2] = await Promise.all([
		fetch('/data/bible/ncl.json'),
		fetch('/data/ccc/bible-verse-index.json')
	]);
	const ncl = (await r1.json()) as Record<string, Record<string, Record<string, string>>>;
	const verseIdx = (await r2.json()) as BibleVerseIndex;

	const text = ncl[book.usfx]?.[String(ch)]?.[String(v)];
	if (!text) throw error(404);

	const cited = verseIdx[book.usfx]?.[String(ch)]?.[String(v)] ?? [];
	const paragraphs = await Promise.all(cited.map((n) => loadParagraph(n, fetch)));
	return { book, chapter: ch, verse: v, text, paragraphs };
};
