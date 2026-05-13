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

export function detectIntent(input: string): Intent {
	const q = input.trim();
	if (!q) return { kind: 'text', q };

	// Multi-paragraph list: §1, §3, §240 or 1,3,240 (comma-separated, 2+ refs)
	const multiMatch = q.match(/^(?:§\s*\d+\s*,\s*)+§?\s*\d+$|^\d+(?:,\s*\d+)+$/);
	if (multiMatch) {
		const nums = q
			.replace(/§/g, '')
			.split(',')
			.map((s) => s.trim())
			.filter((s) => /^\d+$/.test(s));
		if (nums.length >= 2) return { kind: 'paragraph', href: `/cec/${nums.join(',')}` };
	}

	// Paragraph: optional § prefix, then digits or digit-range
	const pMatch = q.match(/^§?\s*(\d+)(?:[-–](\d+))?$/);
	if (pMatch) {
		const from = pMatch[1]!;
		const to = pMatch[2];
		return { kind: 'paragraph', href: to ? `/cec/${from}-${to}` : `/cec/${from}` };
	}

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
