import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import { loadNclBook } from '$lib/data/loaders';
import type { PageLoad } from './$types';

// Session-wide data (verse index, concordance manifest, NCL sections, chapter
// counts) is loaded once by /bible/+layout.ts and inherited via parent().
export const load: PageLoad = async ({ params, fetch, parent }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const ch = parseInt(params.ch!, 10);
	if (!Number.isFinite(ch)) throw error(404);

	const [parentData, bookData] = await Promise.all([parent(), loadNclBook(book.usfx, fetch)]);

	if (!bookData) throw error(404);
	const chData = bookData[String(ch)];
	if (!chData) throw error(404);

	const verses = Object.entries(chData)
		.map(([v, text]) => ({ v: parseInt(v, 10), text }))
		.sort((a, b) => a.v - b.v);

	const totalChapters = Object.keys(bookData)
		.map((k) => parseInt(k, 10))
		.reduce((m, n) => Math.max(m, n), 0);

	const hasConcordance = (parentData.concordanceManifest[book.slug] ?? []).includes(ch);

	const bookSections = parentData.sections[book.usfx] ?? [];
	const chapterSections = bookSections.filter((s) => s.ch === ch);

	return {
		book,
		chapter: ch,
		verses,
		verseIdx: parentData.verseIdx,
		totalChapters,
		hasConcordance,
		sections: chapterSections,
		chapterCounts: parentData.chapterCounts
	};
};
