import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import { loadParagraph, loadNclBook, loadBibleVerseIndex } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const ch = parseInt(params.ch!, 10);
	const v = parseInt(params.v!, 10);
	const [bookData, verseIdx] = await Promise.all([
		loadNclBook(book.usfx, fetch),
		loadBibleVerseIndex(fetch)
	]);

	const text = bookData?.[String(ch)]?.[String(v)];
	if (!text) throw error(404);

	const cited = verseIdx[book.usfx]?.[String(ch)]?.[String(v)] ?? [];
	const paragraphs = await Promise.all(cited.map((n) => loadParagraph(n, fetch)));
	return { book, chapter: ch, verse: v, text, paragraphs };
};
