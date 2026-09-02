import { bookBySlug, bookByUsfx } from '$lib/utils/bibleBookSlug';
import type { BibleVerseIndex } from '$lib/data/types';
import type { ApiErrorCode } from './http';

export interface BibleLookupBody {
	book: string;
	book_slug: string;
	book_name: string;
	chapter: number;
	verse: number | null;
	/** CCC paragraphs citing the verse, or the union across the chapter. */
	paragraphs: number[];
	/** Present only for a whole-chapter lookup: verse number to paragraphs. */
	verses?: Record<string, number[]>;
}

export type BibleLookupResult =
	| { ok: true; body: BibleLookupBody }
	| { ok: false; message: string; code: ApiErrorCode };

export function lookupBible(
	bookParam: string,
	chapter: string,
	verse: string | null,
	index: BibleVerseIndex
): BibleLookupResult {
	// Accept the French slug (/bible/jean/3/16) or the USFX code (/bible/JHN/3/16).
	const book = bookBySlug(bookParam) ?? bookByUsfx(bookParam.toUpperCase());
	if (!book) {
		return {
			ok: false,
			code: 'unknown_book',
			message: `Livre biblique inconnu : « ${bookParam} ». Utilisez le slug français (par exemple « jean ») ou le code à trois lettres (par exemple « JHN »).`
		};
	}

	if (!/^\d+$/.test(chapter)) {
		return {
			ok: false,
			code: 'unknown_book',
			message: `Chapitre invalide : « ${chapter} ». Un numéro est attendu.`
		};
	}
	if (verse !== null && !/^\d+$/.test(verse)) {
		return {
			ok: false,
			code: 'unknown_book',
			message: `Verset invalide : « ${verse} ». Un numéro est attendu.`
		};
	}

	const chapters = index[book.usfx] ?? {};
	const verses = chapters[chapter] ?? {};

	if (verse === null) {
		const union = [...new Set(Object.values(verses).flat())].sort((a, b) => a - b);
		return {
			ok: true,
			body: {
				book: book.usfx,
				book_slug: book.slug,
				book_name: book.frenchName,
				chapter: Number(chapter),
				verse: null,
				paragraphs: union,
				verses
			}
		};
	}

	return {
		ok: true,
		body: {
			book: book.usfx,
			book_slug: book.slug,
			book_name: book.frenchName,
			chapter: Number(chapter),
			verse: Number(verse),
			paragraphs: verses[verse] ?? []
		}
	};
}
