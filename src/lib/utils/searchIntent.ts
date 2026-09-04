import { bookByAbbr } from './bibleBookSlug';

/** One verse or one contiguous range, as given in the query (e.g. "3-5" or "16"). */
export interface VerseGroup {
	from: string;
	to: string;
}

export type Intent =
	| { kind: 'paragraph'; href: string }
	| {
			kind: 'bible';
			href: string;
			bookName: string;
			usfx: string;
			chapter: string;
			verse: string;
			/** Every verse/range named, in query order. Always at least one entry;
			 *  `groups[0].from` is `verse` above. Disjoint groups (e.g. "3-5.8-10")
			 *  come through as separate entries rather than being flattened. */
			groups: VerseGroup[];
	  }
	| { kind: 'text'; q: string };

/** Read a query as a list of catechism paragraph refs, normalised to the
 *  `/cec/` URL form (`268,279-280,290-295`). Returns null as soon as any
 *  segment isn't a bare number or number range · a bible reference or plain
 *  text then falls through to the checks below. */
function paragraphRefs(q: string): string[] | null {
	const segments = q
		.replace(/§/g, ' ')
		.replace(/\s*[-–]\s*/g, '-') // "27 – 30" reads as one range
		.split(/[,;\s]+/)
		.filter(Boolean);
	if (segments.length === 0) return null;

	const refs: string[] = [];
	for (const segment of segments) {
		const m = segment.match(/^(\d+)(?:-(\d+))?$/);
		if (!m) return null;
		refs.push(m[2] ? `${m[1]}-${m[2]}` : m[1]!);
	}
	return refs;
}

export function detectIntent(input: string): Intent {
	const q = input.trim();
	if (!q) return { kind: 'text', q };

	// Paragraph refs · a single number (27), a range (27-30), or any mix of the
	// two in a list. Commas, semicolons, spaces and newlines all separate, and
	// § is optional, so "268, 279-280, 290-295" and "268 279-280 290-295" both
	// resolve to the same page.
	const refs = paragraphRefs(q);
	if (refs) return { kind: 'paragraph', href: `/cec/${refs.join(',')}` };

	// Bible: book abbr + ch + sep + verse, with an optional range on that first
	// verse (- or – or —) and any number of further groups (each itself a
	// verse or a range) joined by '.', ',' or ';' — the French lectionary uses
	// all three interchangeably for disjoint groups ("Gn 49, 1-2.8-10",
	// "Ps 71, 1-2, 7-8, 17") and search input adds ';' for the same purpose
	// (Mt 4:3-5;8-10). Sep between ch and verse is ':' or ',' (French uses
	// comma) — reserved for that single role, so it can't also start a group.
	const bMatch = q.match(
		/^([1-3]?\s*[\p{L}]+)\s+(\d+)\s*[:,]\s*(\d+)(?:\s*[-–—]\s*(\d+))?((?:\s*[.,;]\s*\d+(?:\s*[-–—]\s*\d+)?)*)$/u
	);
	if (bMatch) {
		const abbr = bMatch[1]!.trim();
		const book = bookByAbbr(abbr);
		if (book) {
			const chapter = bMatch[2]!;
			const verse = bMatch[3]!;
			const tail = bMatch[5] ?? '';
			const tailGroups = [...tail.matchAll(/[.,;]\s*(\d+)(?:\s*[-–—]\s*(\d+))?/gu)].map((m) => ({
				from: m[1]!,
				to: m[2] ?? m[1]!
			}));
			const groups: VerseGroup[] = [{ from: verse, to: bMatch[4] ?? verse }, ...tailGroups];
			return {
				kind: 'bible',
				href: `/bible/${book.slug}/${chapter}/${verse}`,
				bookName: book.frenchName,
				usfx: book.usfx,
				chapter,
				verse,
				groups
			};
		}
	}

	return { kind: 'text', q };
}
