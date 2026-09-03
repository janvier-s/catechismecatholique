import { parsePericope, type PericopeSpan } from '$lib/utils/pericope';
import type { BibleVerseIndex } from '$lib/data/types';
import type { ApiErrorCode } from './http';

/** Refs accepted in one request. Each is a handful of map lookups. */
export const MAX_REFS = 50;

export interface PericopeHit {
	ref: string;
	book: string;
	book_slug: string;
	book_name: string;
	spans: PericopeSpan[];
	/** CCC paragraphs citing any verse of the passage. */
	paragraphs: number[];
	/** Verse number to paragraphs, for the verses inside the passage that have any. */
	verses: Record<string, number[]>;
}

export interface PericopeMiss {
	ref: string;
	error: string;
	code: ApiErrorCode;
}

export type PericopeResult = PericopeHit | PericopeMiss;

function coversVerse(span: PericopeSpan, verse: number): boolean {
	if (span.from !== null && verse < span.from) return false;
	if (span.to !== null && verse > span.to) return false;
	return true;
}

/**
 * Resolve one scripture reference to the CCC paragraphs that cite it.
 *
 * A reference that parses but that nothing cites is a hit with an empty list,
 * not a miss · the passage exists, the Catechism simply never quotes it.
 */
export function resolvePericope(ref: string, index: BibleVerseIndex): PericopeResult {
	const parsed = parsePericope(ref);
	if (!parsed) {
		return {
			ref,
			error: `Référence illisible : « ${ref} ». Attendu par exemple « Lc 7, 11-16 », « Gn 49, 1-2.8-10 » ou « Mt 26, 14 - 27, 66 ».`,
			code: 'bad_reference'
		};
	}

	const chapters = index[parsed.book] ?? {};
	const verses: Record<string, number[]> = {};
	const paragraphs = new Set<number>();

	for (const span of parsed.spans) {
		const inChapter = chapters[String(span.chapter)];
		if (!inChapter) continue;
		for (const [verse, cited] of Object.entries(inChapter)) {
			if (!coversVerse(span, Number(verse))) continue;
			// Several spans can name the same verse; merge rather than replace.
			const merged = new Set([...(verses[verse] ?? []), ...cited]);
			verses[verse] = [...merged].sort((a, b) => a - b);
			for (const p of cited) paragraphs.add(p);
		}
	}

	return {
		ref: parsed.ref,
		book: parsed.book,
		book_slug: parsed.book_slug,
		book_name: parsed.book_name,
		spans: parsed.spans,
		paragraphs: [...paragraphs].sort((a, b) => a - b),
		verses
	};
}

export type ParseRefsResult =
	| { ok: true; refs: string[] }
	| { ok: false; message: string; code: ApiErrorCode };

/**
 * Collect the references from the query string. They may be repeated
 * (`?ref=A&ref=B`) or joined with semicolons (`?ref=A;B`), because a caller
 * resolving a whole lectionary wants both.
 */
export function parseRefs(params: URLSearchParams): ParseRefsResult {
	const refs = params
		.getAll('ref')
		.flatMap((value) => value.split(';'))
		.map((value) => value.trim())
		.filter((value) => value !== '');

	if (refs.length === 0) {
		return {
			ok: false,
			code: 'bad_reference',
			message:
				'Indiquez au moins une référence, par exemple ?ref=Lc 7, 11-16. Plusieurs références se passent en répétant le paramètre ou en les séparant par un point-virgule.'
		};
	}
	if (refs.length > MAX_REFS) {
		return {
			ok: false,
			code: 'too_many_refs',
			message: `Au plus ${MAX_REFS} références par requête (${refs.length} demandées). Découpez la demande.`
		};
	}
	return { ok: true, refs };
}
