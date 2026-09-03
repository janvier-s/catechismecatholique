import { loadParagraph } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';
import { parseBibleRefText, type ParsedBibleRef } from '$lib/utils/bibleRefText';

export type ApiBibleRef = ParsedBibleRef;

/**
 * The paragraph's scripture citations, resolved to book slugs so a client can
 * link straight into the Bible reader. `bible_refs` already ships in the
 * default response as raw strings · this block adds the resolution.
 *
 * The stored text is the Catechism's own colon form (`Jn 6:44`); `display`
 * carries the French comma form the site renders (`Jn 6, 44`).
 */
export async function bibleBlock(n: number, fetcher: Fetch): Promise<ApiBibleRef[]> {
	const paragraph = await loadParagraph(n, fetcher);
	return paragraph.bible_refs.map((r) => parseBibleRefText(r.text));
}
