import { describe, it, expect } from 'vitest';
import { nextChapterRef, prevChapterRef, type ChapterRef } from '$lib/utils/chapterCursor';

// Keyed by USFX, mirroring static/data/bible/chapter-counts.json.
const COUNTS = { GEN: 50, EXO: 40, REV: 22, '3JN': 1, JUD: 1 };

const gen = (chapter: number): ChapterRef => ({ bookSlug: 'genese', usfx: 'GEN', chapter });

describe('nextChapterRef', () => {
	it('advances within a book', () => {
		expect(nextChapterRef(gen(1), COUNTS)).toEqual({
			bookSlug: 'genese',
			usfx: 'GEN',
			chapter: 2
		});
	});

	it('crosses into the next book at the last chapter', () => {
		expect(nextChapterRef(gen(50), COUNTS)).toEqual({
			bookSlug: 'exode',
			usfx: 'EXO',
			chapter: 1
		});
	});

	it('crosses out of a one-chapter book', () => {
		const ref = { bookSlug: '3-jean', usfx: '3JN', chapter: 1 };
		expect(nextChapterRef(ref, COUNTS)).toEqual({ bookSlug: 'jude', usfx: 'JUD', chapter: 1 });
	});

	it('stops at the end of the canon', () => {
		const ref = { bookSlug: 'apocalypse', usfx: 'REV', chapter: 22 };
		expect(nextChapterRef(ref, COUNTS)).toBeNull();
	});

	it('returns null for a book missing from the counts', () => {
		expect(nextChapterRef({ bookSlug: 'genese', usfx: 'NOPE', chapter: 1 }, COUNTS)).toBeNull();
	});
});

describe('prevChapterRef', () => {
	it('steps back within a book', () => {
		expect(prevChapterRef(gen(2), COUNTS)).toEqual({
			bookSlug: 'genese',
			usfx: 'GEN',
			chapter: 1
		});
	});

	it('crosses into the previous book at chapter 1, landing on its last chapter', () => {
		const ref = { bookSlug: 'exode', usfx: 'EXO', chapter: 1 };
		expect(prevChapterRef(ref, COUNTS)).toEqual({
			bookSlug: 'genese',
			usfx: 'GEN',
			chapter: 50
		});
	});

	it('stops at the start of the canon', () => {
		expect(prevChapterRef(gen(1), COUNTS)).toBeNull();
	});

	it('returns null when the previous book is missing from the counts', () => {
		const ref = { bookSlug: 'jude', usfx: 'JUD', chapter: 1 };
		// 2 Jean precedes 3 Jean precedes Jude; 3JN is in COUNTS, so use a book
		// whose predecessor is not: Exode's predecessor GEN is present, so
		// instead drop GEN from a local copy.
		const partial = { EXO: 40 };
		expect(prevChapterRef({ bookSlug: 'exode', usfx: 'EXO', chapter: 1 }, partial)).toBeNull();
		expect(prevChapterRef(ref, COUNTS)).toEqual({
			bookSlug: '3-jean',
			usfx: '3JN',
			chapter: 1
		});
	});
});
