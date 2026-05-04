import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import { loadBibleVerseIndex } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const ch = parseInt(params.ch!, 10);
	if (!Number.isFinite(ch)) throw error(404);

	const [r1, verseIdx] = await Promise.all([
		fetch('/data/bible/ncl.json'),
		loadBibleVerseIndex(fetch)
	]);
	const ncl = (await r1.json()) as Record<string, Record<string, Record<string, string>>>;

	const bookData = ncl[book.usfx];
	if (!bookData) throw error(404);
	const chData = bookData[String(ch)];
	if (!chData) throw error(404);

	const verses = Object.entries(chData)
		.map(([v, text]) => ({ v: parseInt(v, 10), text }))
		.sort((a, b) => a.v - b.v);

	const totalChapters = Object.keys(bookData)
		.map((k) => parseInt(k, 10))
		.reduce((m, n) => Math.max(m, n), 0);

	// hasConcordance is a placeholder; the real check lands in Task U7 once the
	// pericope-grouped concordance build replaces the per-verse index.
	return { book, chapter: ch, verses, verseIdx, totalChapters, hasConcordance: false };
};
