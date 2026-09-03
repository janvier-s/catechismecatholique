import { bookByAbbr, type BookInfo } from './bibleBookSlug';

/**
 * A contiguous stretch of one chapter. `from`/`to` are null at an open end:
 * a whole chapter is `{ from: null, to: null }`, and the first half of a
 * cross-chapter reference is `{ from: 14, to: null }` meaning "verse 14 to the
 * end of chapter 26".
 */
export interface PericopeSpan {
	chapter: number;
	from: number | null;
	to: number | null;
}

export interface ParsedPericope {
	/** The reference as given. */
	ref: string;
	book: string;
	book_slug: string;
	book_name: string;
	spans: PericopeSpan[];
}

/** USFX codes of the books that have exactly one chapter. */
const SINGLE_CHAPTER = new Set(['OBA', 'PHM', '2JN', '3JN', 'JUD']);

/** Book, chapter, and everything after the chapter/verse separator. */
const HEAD = /^((?:[1-3]\s+)?[\p{L}][\p{L}.]*)\s+(\d+)\s*(?:[:,]\s*(.+))?$/u;

/** "26, 14 – 27, 66" · the second chapter of a cross-chapter reference. */
const CROSS_CHAPTER = /^(\d+)\s*[-–—]\s*(\d+)\s*[:,]\s*(\d+)[a-z]*$/;

/** One verse group: "11-16", "2ac", "15-16a". */
const GROUP = /^(\d+)[a-z]*(?:\s*[-–—]\s*(\d+)[a-z]*)?$/;

/**
 * Parse a scripture reference in the shapes the French lectionary and the
 * Catechism actually use.
 *
 * Handles the comma separator of French usage and the colon the Catechism
 * stores, disjoint verse groups joined by dots or commas
 * ("Gn 49, 1-2.8-10"), half-verse letters, the Septuagint/Hebrew psalm pair
 * ("Ps 118 (119), 97-98" · the parenthesised Hebrew number wins, because that
 * is what the reader is numbered by), single-chapter books cited by verse
 * alone, and references that cross a chapter boundary
 * ("Mt 26, 14 – 27, 66").
 *
 * Returns null rather than guessing when the book or the shape is not
 * recognised.
 */
export function parsePericope(ref: string): ParsedPericope | null {
	const raw = (ref ?? '').trim();
	if (raw === '') return null;

	// "Ps 118 (119), 97-98" · keep the parenthesised number and drop the rest.
	const cleaned = raw.replace(/\s+/g, ' ').replace(/^(\D*)\d+\s*\((\d+)[^)]*\)/, '$1$2');

	const head = HEAD.exec(cleaned);
	if (!head) return null;

	const book: BookInfo | undefined = bookByAbbr(head[1]!);
	if (!book) return null;

	const firstNumber = Number(head[2]);
	const rest = head[3]?.trim();

	// "Jude 3" is verse 3 of the only chapter, not chapter 3.
	if (rest === undefined) {
		const single = SINGLE_CHAPTER.has(book.usfx);
		return build(raw, book, [
			single
				? { chapter: 1, from: firstNumber, to: firstNumber }
				: { chapter: firstNumber, from: null, to: null }
		]);
	}

	// "Mt 26, 14 – 27, 66" · run to the end of one chapter, then into the next.
	const cross = CROSS_CHAPTER.exec(rest);
	if (cross) {
		const startVerse = Number(cross[1]);
		const endChapter = Number(cross[2]);
		const endVerse = Number(cross[3]);
		if (endChapter <= firstNumber) return null;
		const spans: PericopeSpan[] = [{ chapter: firstNumber, from: startVerse, to: null }];
		for (let c = firstNumber + 1; c < endChapter; c++) {
			spans.push({ chapter: c, from: null, to: null });
		}
		spans.push({ chapter: endChapter, from: null, to: endVerse });
		return build(raw, book, spans);
	}

	const spans: PericopeSpan[] = [];
	for (const part of rest.split(/[.,]/)) {
		const g = GROUP.exec(part.trim());
		if (!g) continue;
		const from = Number(g[1]);
		spans.push({ chapter: firstNumber, from, to: g[2] === undefined ? from : Number(g[2]) });
	}
	if (spans.length === 0) return null;
	return build(raw, book, spans);
}

function build(ref: string, book: BookInfo, spans: PericopeSpan[]): ParsedPericope {
	return {
		ref,
		book: book.usfx,
		book_slug: book.slug,
		book_name: book.frenchName,
		spans
	};
}
