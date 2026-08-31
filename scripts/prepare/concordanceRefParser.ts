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
 * only the first (Septuagint) number, since that's what both the AELF text
 * and data-archive/concordance/psaumes/ are keyed on.
 */
export function parseAelfRef(raw: string): ParsedRef | null {
	const cleaned = raw.replace(/\s+/g, ' ').trim();
	// Drop a parenthesised Hebrew-numbering psalm suffix before the main match,
	// e.g. "Ps 118 (119), 97-98" -> "Ps 118, 97-98".
	const withoutAltNumbering = cleaned.replace(/^(\D*\d+)\s*\([^)]+\)/, '$1');

	const m = withoutAltNumbering.match(/^(\d\s+)?([A-Za-zÀ-ÿ]+)\s+(\d+)\s*,\s*(.+)$/);
	if (!m) return null;
	const [, numPrefix, abbrWord, chapterStr, versePart] = m;
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
