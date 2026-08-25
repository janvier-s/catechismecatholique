import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import { loadNclBook, loadNclParagraphsBook } from '$lib/data/loaders';
import type { PageLoad } from './$types';

// Session-wide data (verse index, NCL sections, chapter counts) is loaded
// once by /bible/+layout.ts. It is NOT re-returned here:
// SvelteKit merges every route node's data into the page's `data` prop, so
// +page.svelte reads it straight off the layout, and re-returning it would
// just be four more keys to keep in sync by hand.
//
// It costs nothing either way in the payload · this route has no server load,
// and only server load data is devalue-serialised into the HTML. Measured at
// /bible/genese/1: 987528 bytes with the re-returns, 987529 without.
export const load: PageLoad = async ({ params, fetch }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const ch = parseInt(params.ch!, 10);
	if (!Number.isFinite(ch)) throw error(404);

	const [bookData, paragraphsBook] = await Promise.all([
		loadNclBook(book.usfx, fetch),
		loadNclParagraphsBook(book.usfx, fetch)
	]);

	if (!bookData) throw error(404);
	const chData = bookData[String(ch)];
	if (!chData) throw error(404);

	const verses = Object.entries(chData)
		.map(([v, text]) => ({ v: parseInt(v, 10), text }))
		.sort((a, b) => a.v - b.v);

	const totalChapters = Object.keys(bookData)
		.map((k) => parseInt(k, 10))
		.reduce((m, n) => Math.max(m, n), 0);

	return {
		book,
		chapter: ch,
		verses,
		totalChapters,
		paragraphs: paragraphsBook?.[String(ch)] ?? null
	};
};
