import { bookByAbbr, type BookInfo } from './bibleBookSlug';

export interface ParsedBibleRef {
	/** The reference exactly as it was stored, unchanged. */
	text: string;
	/** French display form: the same abbreviation, comma before the verse. */
	display: string;
	book: string | null;
	book_slug: string | null;
	book_name: string | null;
	chapter: number | null;
	verse_start: number | null;
	verse_end: number | null;
	url: string | null;
}

/**
 * One reference, e.g. `Jn 6:44`, `1 Th 4:13-14`, `Ap 4`, `voir Lc 18:9-14`.
 *
 * The CCC stores the chapter and verse separated by a colon, but French usage
 * writes a comma and the site displays one everywhere · both separators are
 * accepted here so the same parser serves stored text and reader input.
 *
 * Verified against the corpus: all 4012 stored references match this pattern
 * and every book abbreviation among them resolves.
 */
/** USFX codes of the books that have exactly one chapter. */
const SINGLE_CHAPTER = new Set(['OBA', 'PHM', '2JN', '3JN', 'JUD']);

const REF =
	/^(?:voir\s+)?((?:[1-3]\s+)?[\p{L}][\p{L}.]*)\s+(\d+)(?:\s*[:,]\s*(\d+)[a-z]?(?:\s*[-–]\s*(\d+)[a-z]?)?)?$/u;

function empty(text: string): ParsedBibleRef {
	return {
		text,
		display: text,
		book: null,
		book_slug: null,
		book_name: null,
		chapter: null,
		verse_start: null,
		verse_end: null,
		url: null
	};
}

/**
 * Resolve a reference string to a book, chapter and verse span.
 *
 * Never throws: an unrecognised string comes back with null fields and its
 * own text preserved, so a caller can always render something.
 */
export function parseBibleRefText(text: string): ParsedBibleRef {
	const raw = text ?? '';
	const m = REF.exec(raw.trim());
	if (!m) return empty(raw);

	const book: BookInfo | undefined = bookByAbbr(m[1]!);
	if (!book) return empty(raw);

	// Abdias, Philémon, 2 Jean, 3 Jean and Jude are one chapter long, so the
	// Catechism cites them by verse alone: "Jude 3" is verse 3, not chapter 3.
	// Read literally it yields a link to a chapter that does not exist.
	const bare = m[3] === undefined;
	const single = SINGLE_CHAPTER.has(book.usfx);
	const chapter = bare && single ? 1 : Number(m[2]);
	const verseStart = bare ? (single ? Number(m[2]) : null) : Number(m[3]);
	const verseEnd = m[4] === undefined ? verseStart : Number(m[4]);

	// The display form keeps the abbreviation the source used · only the
	// separator changes, matching what the reader sees in the prose.
	const abbr = m[1]!.trim();
	const versePart = raw
		.trim()
		.match(/[:,]\s*(.+)$/)?.[1]
		?.trim();
	const display = versePart
		? `${abbr} ${chapter}, ${versePart}`
		: bare && single
			? `${abbr} ${verseStart}`
			: `${abbr} ${chapter}`;

	return {
		text: raw,
		display,
		book: book.usfx,
		book_slug: book.slug,
		book_name: book.frenchName,
		chapter,
		verse_start: verseStart,
		verse_end: verseEnd,
		url:
			verseStart === null
				? `/bible/${book.slug}/${chapter}`
				: `/bible/${book.slug}/${chapter}/${verseStart}`
	};
}
