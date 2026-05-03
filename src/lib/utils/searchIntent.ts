import { bookByAbbr } from './bibleBookSlug';

export type Intent =
	| { kind: 'paragraph'; href: string }
	| { kind: 'bible'; href: string }
	| { kind: 'text'; q: string };

export function detectIntent(input: string): Intent {
	const q = input.trim();
	if (!q) return { kind: 'text', q };

	// Paragraph: optional § prefix, then digits or digit-range
	const pMatch = q.match(/^§?\s*(\d+)(?:[-–](\d+))?$/);
	if (pMatch) {
		const from = pMatch[1]!;
		const to = pMatch[2];
		return { kind: 'paragraph', href: to ? `/ccc/${from}-${to}` : `/ccc/${from}` };
	}

	// Bible: book abbr + ch + sep + verse[-range]. Sep is ':' or ',' (French uses comma).
	const bMatch = q.match(/^([1-3]?\s*[A-Za-zÉéèêÊ]+)\s+(\d+)\s*[:,]\s*(\d+)(?:\s*-\s*\d+)?$/);
	if (bMatch) {
		const abbr = bMatch[1]!.trim();
		const book = bookByAbbr(abbr);
		if (book) {
			return {
				kind: 'bible',
				href: `/bible/${book.slug}/${bMatch[2]}/${bMatch[3]}`
			};
		}
	}

	return { kind: 'text', q };
}
