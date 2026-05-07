import {
	loadBibleVerseIndex,
	loadConcordanceManifest,
	loadNclSections,
	loadChapterCounts
} from '$lib/data/loaders';
import type { LayoutLoad } from './$types';

// Bible-section-wide data: verse index, concordance manifest, NCL sections,
// chapter counts. Hoisted here so SvelteKit reuses them across chapter
// navigations within /bible. Without this, every chapter load re-fetched these
// 4 JSON shards as 4 fresh Worker subrequests on cold edge nodes.
export const load: LayoutLoad = async ({ fetch }) => {
	const [verseIdx, concordanceManifest, sections, chapterCounts] = await Promise.all([
		loadBibleVerseIndex(fetch),
		loadConcordanceManifest(fetch),
		loadNclSections(fetch),
		loadChapterCounts(fetch)
	]);
	return { verseIdx, concordanceManifest, sections, chapterCounts };
};
