import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import {
	loadBibleVerseIndex,
	loadConcordanceManifest,
	loadNclSections,
	loadChapterCounts,
	loadNclBible
} from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const ch = parseInt(params.ch!, 10);
	if (!Number.isFinite(ch)) throw error(404);

	const [ncl, verseIdx, manifest, sections, chapterCounts] = await Promise.all([
		loadNclBible(fetch),
		loadBibleVerseIndex(fetch),
		loadConcordanceManifest(fetch),
		loadNclSections(fetch),
		loadChapterCounts(fetch)
	]);

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

	const hasConcordance = (manifest[book.slug] ?? []).includes(ch);

	const bookSections = sections[book.usfx] ?? [];
	const chapterSections = bookSections.filter((s) => s.ch === ch);

	return {
		book,
		chapter: ch,
		verses,
		verseIdx,
		totalChapters,
		hasConcordance,
		sections: chapterSections,
		chapterCounts
	};
};
