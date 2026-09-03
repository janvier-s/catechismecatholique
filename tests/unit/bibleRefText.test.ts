import { describe, it, expect } from 'vitest';
import { parseBibleRefText } from '$lib/utils/bibleRefText';

describe('parseBibleRefText', () => {
	it('parses a plain chapter and verse', () => {
		expect(parseBibleRefText('Jn 6:44')).toMatchObject({
			book: 'JHN',
			book_slug: 'jean',
			book_name: 'Jean',
			chapter: 6,
			verse_start: 44,
			verse_end: 44,
			display: 'Jn 6, 44',
			url: '/bible/jean/6/44'
		});
	});

	it('parses a verse range and keeps both ends', () => {
		expect(parseBibleRefText('Jn 6:39-40')).toMatchObject({
			chapter: 6,
			verse_start: 39,
			verse_end: 40,
			display: 'Jn 6, 39-40',
			url: '/bible/jean/6/39'
		});
	});

	it('parses a book with a numeric prefix', () => {
		expect(parseBibleRefText('2 Co 5:8')).toMatchObject({
			book: '2CO',
			book_slug: '2-corinthiens',
			chapter: 5,
			verse_start: 8,
			display: '2 Co 5, 8'
		});
	});

	it('parses a chapter-only reference', () => {
		expect(parseBibleRefText('Ap 4')).toMatchObject({
			book: 'REV',
			book_slug: 'apocalypse',
			chapter: 4,
			verse_start: null,
			verse_end: null,
			display: 'Ap 4',
			url: '/bible/apocalypse/4'
		});
	});

	it('drops a verse letter suffix but keeps the verse', () => {
		expect(parseBibleRefText('Jr 4:1a')).toMatchObject({
			chapter: 4,
			verse_start: 1,
			verse_end: 1,
			display: 'Jr 4, 1a'
		});
	});

	it('accepts an en dash as a range separator', () => {
		expect(parseBibleRefText('Gn 1:1–2')).toMatchObject({
			chapter: 1,
			verse_start: 1,
			verse_end: 2
		});
	});

	it('strips a leading "voir"', () => {
		expect(parseBibleRefText('voir Lc 18:9-14')).toMatchObject({
			book_slug: 'luc',
			chapter: 18,
			verse_start: 9,
			verse_end: 14,
			display: 'Lc 18, 9-14'
		});
	});

	it('accepts the French comma separator a reader would type', () => {
		expect(parseBibleRefText('Mt 5, 14')).toMatchObject({
			book_slug: 'matthieu',
			chapter: 5,
			verse_start: 14
		});
	});

	it('returns nulls, not a throw, for an unparseable reference', () => {
		expect(parseBibleRefText('Livre inconnu 3:16')).toMatchObject({
			book: null,
			book_slug: null,
			chapter: null,
			url: null
		});
		expect(parseBibleRefText('')).toMatchObject({ book: null, chapter: null });
	});

	it('keeps the raw text on every result, parsed or not', () => {
		expect(parseBibleRefText('Jn 6:44').text).toBe('Jn 6:44');
		expect(parseBibleRefText('n’importe quoi').text).toBe('n’importe quoi');
	});
});

// Abdias, Philémon, 2 Jean, 3 Jean and Jude have a single chapter, so the
// Catechism writes "Jude 3" meaning verse 3 · read as a chapter it produces a
// link to a chapter that does not exist.
describe('parseBibleRefText · single-chapter books', () => {
	it('reads a bare number as a verse of chapter 1', () => {
		expect(parseBibleRefText('Jude 3')).toMatchObject({
			book: 'JUD',
			book_slug: 'jude',
			chapter: 1,
			verse_start: 3,
			verse_end: 3,
			url: '/bible/jude/1/3'
		});
	});

	it('does the same for Philémon, 2 Jean, 3 Jean and Abdias', () => {
		expect(parseBibleRefText('Phm 16')).toMatchObject({ chapter: 1, verse_start: 16 });
		expect(parseBibleRefText('2 Jn 7')).toMatchObject({ chapter: 1, verse_start: 7 });
		expect(parseBibleRefText('3 Jn 7')).toMatchObject({ chapter: 1, verse_start: 7 });
		expect(parseBibleRefText('Ab 15')).toMatchObject({ chapter: 1, verse_start: 15 });
	});

	it('keeps an explicit chapter and verse untouched', () => {
		expect(parseBibleRefText('Jude 1:3')).toMatchObject({ chapter: 1, verse_start: 3 });
	});

	it('leaves multi-chapter books reading the bare number as a chapter', () => {
		expect(parseBibleRefText('Ap 4')).toMatchObject({ chapter: 4, verse_start: null });
	});
});
