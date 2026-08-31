import { bookByAbbr } from '../../src/lib/utils/bibleBookSlug.ts';

export interface ParsedRef {
	slug: string;
	chapter: number;
	ranges: [number, number][];
}

/**
 * Parses an AELF `ref` string ("Ep 1, 1-10", "1 R  17, 1-6", "Jn 3, 7b- 15",
 * "Mi 6, 1-4.6-8", "Ps 118 (119), 97-98") into a book slug + chapter +
 * verse ranges. Verse-letter suffixes (7b, 15a) are dropped - the concordance
 * matches at verse granularity, not half-verse. Psalm dual numbering keeps
 * the parenthesised (Hebrew/Masoretic) number, which is what
 * data-archive/concordance/psaumes/ is keyed on - verified against the archive
 * itself: psaumes/22.json runs to verse 32 and cites CEC 603/2605 (the Passion
 * psalm), i.e. Hebrew 22 rather than the Septuagint's Psalm 22.
 *
 * Returns null for a ref AELF spells across two chapters ("Mt 26, 14 - 27, 66",
 * with a spaced en-dash in the source): the concordance is keyed per chapter
 * and guessing one of the two would silently produce a real but wrong match.
 */
export function parseAelfRef(raw: string): ParsedRef | null {
	const cleaned = raw.replace(/\s+/g, ' ').trim();
	// Prefer the parenthesised Hebrew-numbering psalm number over the bare
	// Septuagint one, e.g. "Ps 118 (119), 97-98" -> "Ps 119, 97-98".
	const withoutAltNumbering = cleaned.replace(/^(\D*)\d+\s*\((\d+)[^)]*\)/, '$1$2');

	const m = withoutAltNumbering.match(/^(\d\s+)?([A-Za-zÀ-ÿ]+)\s+(\d+)\s*,\s*(.+)$/);
	if (!m) return null;
	const [, numPrefix, abbrWord, chapterStr, versePart] = m;
	// A second "<number>," after an en/em-dash means the ref crosses a chapter
	// boundary. Only those dashes count: plain hyphens join verses within one
	// chapter ("97-98, 99-100") and would false-positive here.
	if (/[–—]\s*\d+\s*,/.test(versePart!)) return null;
	const abbr = numPrefix ? `${numPrefix.trim()} ${abbrWord}` : abbrWord!;
	const book = bookByAbbr(abbr!);
	if (!book) return null;

	const chapter = parseInt(chapterStr!, 10);
	const ranges: [number, number][] = [];
	for (const part of versePart!.split(/[.,]/)) {
		const vm = part.trim().match(/^(\d+)\s*[a-z]?\s*-?\s*(\d+)?\s*[a-z]?$/);
		if (!vm) continue;
		const start = parseInt(vm[1]!, 10);
		const end = vm[2] ? parseInt(vm[2], 10) : start;
		ranges.push([start, end]);
	}
	if (ranges.length === 0) return null;

	return { slug: book.slug, chapter, ranges };
}
