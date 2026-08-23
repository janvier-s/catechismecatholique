import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import { loadNclBook, loadNclParagraphsBook } from '$lib/data/loaders';
import type { PageLoad } from './$types';

// Session-wide data (verse index, concordance manifest, NCL sections, chapter
// counts) is loaded once by /bible/+layout.ts and inherited via parent().
export const load: PageLoad = async ({ params, fetch, parent }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const ch = parseInt(params.ch!, 10);
	if (!Number.isFinite(ch)) throw error(404);

	const [parentData, bookData, paragraphsBook] = await Promise.all([
		parent(),
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
		verseIdx: parentData.verseIdx,
		totalChapters,
		// The whole map, not this chapter's slice: infinite scroll renders
		// chapters this load function never saw. Both are already in the SSR
		// payload via /bible/+layout.ts, so this costs nothing extra.
		sectionsByBook: parentData.sections,
		concordanceManifest: parentData.concordanceManifest,
		chapterCounts: parentData.chapterCounts,
		paragraphs: paragraphsBook?.[String(ch)] ?? null
	};
};
