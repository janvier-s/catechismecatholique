import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import { loadConcordanceChapter, loadChapterCounts, loadNclBook } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const ch = parseInt(params.ch!, 10);
	if (!Number.isFinite(ch)) throw error(404);

	const [bookData, chapterData, chapterCounts] = await Promise.all([
		loadNclBook(book.usfx, fetch),
		loadConcordanceChapter(book.slug, ch, fetch),
		loadChapterCounts(fetch)
	]);
	if (!bookData) throw error(404);
	if (!chapterData) {
		// Concordance not available for this chapter · render a friendly
		// "pas disponible" stub instead of 404'ing.
		return {
			book,
			chapter: ch,
			verses: [],
			chapterData: null,
			totalChapters: Object.keys(bookData)
				.map((k) => parseInt(k, 10))
				.reduce((m, n) => Math.max(m, n), 0),
			chapterCounts,
			missing: true as const
		};
	}
	const chData = bookData[String(ch)];
	if (!chData) throw error(404);

	const verses = Object.entries(chData)
		.map(([v, text]) => ({ v: parseInt(v, 10), text }))
		.sort((a, b) => a.v - b.v);

	const totalChapters = Object.keys(bookData)
		.map((k) => parseInt(k, 10))
		.reduce((m, n) => Math.max(m, n), 0);

	return { book, chapter: ch, verses, chapterData, totalChapters, chapterCounts };
};
