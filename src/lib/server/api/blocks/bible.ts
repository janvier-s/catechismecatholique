import { loadParagraph } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';
import { bookByAbbr } from '$lib/utils/bibleBookSlug';

export interface ApiBibleRef {
	text: string;
	book: string | null;
	book_slug: string | null;
	book_name: string | null;
	chapter: number | null;
	verse_start: number | null;
	verse_end: number | null;
	url: string | null;
}

/**
 * The paragraph's scripture citations, resolved to book slugs so a client can
 * link straight into the Bible reader. `bible_refs` already ships in the
 * default response as raw strings · this block adds the resolution.
 */
export async function bibleBlock(n: number, fetcher: Fetch): Promise<ApiBibleRef[]> {
	const paragraph = await loadParagraph(n, fetcher);
	return paragraph.bible_refs.map((r) => {
		const book = r.book ? bookByAbbr(r.book) : undefined;
		return {
			text: r.text,
			book: r.book ?? null,
			book_slug: book?.slug ?? null,
			book_name: book?.frenchName ?? null,
			chapter: r.chapter ?? null,
			verse_start: r.verseStart ?? null,
			verse_end: r.verseEnd ?? null,
			url: book && r.chapter ? `/bible/${book.slug}/${r.chapter}` : null
		};
	});
}
