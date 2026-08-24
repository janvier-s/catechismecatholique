import { getNextBook, getPrevBook } from '$lib/utils/bibleBookSlug';

/** A chapter's identity, carrying both keys the data layer needs: the slug for
 *  URLs and `bookBySlug`, the USFX for the JSON shards and the counts map. */
export interface ChapterRef {
	bookSlug: string;
	usfx: string;
	chapter: number;
}

/** Total chapters per book, keyed by USFX · the shape of
 *  static/data/bible/chapter-counts.json, loaded by /bible/+layout.ts. */
export type ChapterCounts = Record<string, number>;

/** The chapter after `ref`, rolling into the next book at a book's end.
 *  Null at the end of the canon, or when the book is unknown to `counts`. */
export function nextChapterRef(ref: ChapterRef, counts: ChapterCounts): ChapterRef | null {
	const total = counts[ref.usfx];
	if (total === undefined) return null;
	if (ref.chapter < total) {
		return { bookSlug: ref.bookSlug, usfx: ref.usfx, chapter: ref.chapter + 1 };
	}
	const next = getNextBook(ref.bookSlug);
	if (!next) return null;
	return { bookSlug: next.slug, usfx: next.usfx, chapter: 1 };
}

/** The chapter before `ref`, rolling into the previous book's *last* chapter
 *  at chapter 1. Null at Genèse 1, or when the previous book is unknown. */
export function prevChapterRef(ref: ChapterRef, counts: ChapterCounts): ChapterRef | null {
	if (ref.chapter > 1) {
		return { bookSlug: ref.bookSlug, usfx: ref.usfx, chapter: ref.chapter - 1 };
	}
	const prev = getPrevBook(ref.bookSlug);
	if (!prev) return null;
	const total = counts[prev.usfx];
	if (total === undefined) return null;
	return { bookSlug: prev.slug, usfx: prev.usfx, chapter: total };
}
