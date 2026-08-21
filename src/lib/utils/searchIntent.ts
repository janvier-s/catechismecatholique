import { bookByAbbr } from './bibleBookSlug';

export type Intent =
	| { kind: 'paragraph'; href: string }
	| {
			kind: 'bible';
			href: string;
			bookName: string;
			usfx: string;
			chapter: string;
			verse: string;
			verseEnd?: string;
			additionalVerses?: Array<{ verse: string; href: string }>;
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
	// § is optional, so a reference pasted out of the concordance works whatever
	// shape it arrives in: "268, 279-280, 290-295" and "268 279-280 290-295"
	// both resolve to the same page.
	const refs = paragraphRefs(q);
	if (refs) return { kind: 'paragraph', href: `/cec/${refs.join(',')}` };

	// Bible: book abbr + ch + sep + verse + optional range (- or –) or dot-separated additional
	// verses (French scholarly notation: Jn 3:16.18 or Jn 3, 16.18).
	// Sep between ch and verse is ':' or ',' (French uses comma).
	const bMatch = q.match(
		/^([1-3]?\s*[\p{L}]+)\s+(\d+)\s*[:,]\s*(\d+)((?:\s*[-–]\s*\d+|\s*\.\s*\d+)*)$/u
	);
	if (bMatch) {
		const abbr = bMatch[1]!.trim();
		const book = bookByAbbr(abbr);
		if (book) {
			const chapter = bMatch[2]!;
			const verse = bMatch[3]!;
			const tail = (bMatch[4] ?? '').trim();
			const rangeMatch = tail.match(/^[-–]\s*(\d+)$/);
			const additionalMatches = !rangeMatch ? [...tail.matchAll(/\.\s*(\d+)/gu)] : [];
			return {
				kind: 'bible',
				href: `/bible/${book.slug}/${chapter}/${verse}`,
				bookName: book.frenchName,
				usfx: book.usfx,
				chapter,
				verse,
				...(rangeMatch ? { verseEnd: rangeMatch[1] } : {}),
				...(additionalMatches.length > 0
					? {
							additionalVerses: additionalMatches.map((m) => ({
								verse: m[1]!,
								href: `/bible/${book.slug}/${chapter}/${m[1]}`
							}))
						}
					: {})
			};
		}
	}

	return { kind: 'text', q };
}
