import { loadBibleVerseIndex, loadNclSections, loadChapterCounts } from '$lib/data/loaders';
import type { LayoutLoad } from './$types';

// Bible-section-wide data: verse index, NCL sections, chapter counts. Hoisted
// here so SvelteKit reuses them across chapter navigations within /bible.
// Without this, every chapter load re-fetched these JSON shards as fresh
// Worker subrequests on cold edge nodes.
export const load: LayoutLoad = async ({ fetch }) => {
	const [verseIdx, sections, chapterCounts] = await Promise.all([
		loadBibleVerseIndex(fetch),
		loadNclSections(fetch),
		loadChapterCounts(fetch)
	]);
	return { verseIdx, sections, chapterCounts };
};
