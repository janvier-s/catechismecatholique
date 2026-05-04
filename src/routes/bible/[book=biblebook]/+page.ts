import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import { loadNclBible } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const ncl = await loadNclBible(fetch);
	const chapters = Object.keys(ncl[book.usfx] ?? {})
		.map((c) => parseInt(c, 10))
		.filter((n) => Number.isFinite(n))
		.sort((a, b) => a - b);
	return { book, chapters };
};
