import { describe, it, expect } from 'vitest';
import { parsePericope } from '$lib/utils/pericope';

describe('parsePericope', () => {
	it('parses a plain liturgical range', () => {
		expect(parsePericope('Lc 7, 11-16')).toMatchObject({
			book: 'LUK',
			book_slug: 'luc',
			book_name: 'Luc',
			spans: [{ chapter: 7, from: 11, to: 16 }]
		});
	});

	it('accepts the colon form the Catechism stores', () => {
		expect(parsePericope('Lc 7:11-16')?.spans).toEqual([{ chapter: 7, from: 11, to: 16 }]);
	});

	it('parses a single verse', () => {
		expect(parsePericope('Jn 3, 16')?.spans).toEqual([{ chapter: 3, from: 16, to: 16 }]);
	});

	it('parses a whole chapter when no verse is given', () => {
		expect(parsePericope('Ap 4')).toMatchObject({
			book: 'REV',
			spans: [{ chapter: 4, from: null, to: null }]
		});
	});

	// AELF joins disjoint verse groups with a dot: the lectionary skips verses.
	it('parses dot-separated groups as separate spans', () => {
		expect(parsePericope('Gn 49, 1-2.8-10')?.spans).toEqual([
			{ chapter: 49, from: 1, to: 2 },
			{ chapter: 49, from: 8, to: 10 }
		]);
	});

	it('parses comma-separated groups too', () => {
		expect(parsePericope('Ps 71, 1-2, 7-8, 17')?.spans).toEqual([
			{ chapter: 71, from: 1, to: 2 },
			{ chapter: 71, from: 7, to: 8 },
			{ chapter: 71, from: 17, to: 17 }
		]);
	});

	it('drops half-verse letters but keeps the verse', () => {
		expect(parsePericope('Is 8, 23b-9')?.spans[0]).toMatchObject({ from: 23 });
		expect(parsePericope('Ps 79, 2ac.3bc, 15-16a')?.spans).toEqual([
			{ chapter: 79, from: 2, to: 2 },
			{ chapter: 79, from: 3, to: 3 },
			{ chapter: 79, from: 15, to: 16 }
		]);
	});

	// The lectionary prints the Septuagint number first, the Hebrew one in
	// parentheses. The reader is Hebrew-numbered, so the parenthesis wins.
	it('prefers the parenthesised psalm number', () => {
		expect(parsePericope('Ps 118 (119), 97-98')).toMatchObject({
			book: 'PSA',
			spans: [{ chapter: 119, from: 97, to: 98 }]
		});
	});

	// The Passion narratives. These are the pericopes that most need resolving
	// and the ones a single-chapter parser has to refuse.
	it('parses a reference that crosses a chapter boundary', () => {
		expect(parsePericope('Mt 26, 14 – 27, 66')?.spans).toEqual([
			{ chapter: 26, from: 14, to: null },
			{ chapter: 27, from: null, to: 66 }
		]);
	});

	it('parses a cross-chapter reference written with a plain hyphen', () => {
		expect(parsePericope('Is 52, 13 - 53, 12')?.spans).toEqual([
			{ chapter: 52, from: 13, to: null },
			{ chapter: 53, from: null, to: 12 }
		]);
	});

	it('parses a book whose name carries a numeric prefix', () => {
		expect(parsePericope('1 Co 15, 20-26')).toMatchObject({
			book: '1CO',
			spans: [{ chapter: 15, from: 20, to: 26 }]
		});
	});

	it('reads a bare number as a verse in a single-chapter book', () => {
		expect(parsePericope('Jude 3')?.spans).toEqual([{ chapter: 1, from: 3, to: 3 }]);
	});

	it('returns null rather than guessing', () => {
		expect(parsePericope('')).toBeNull();
		expect(parsePericope('Livre inconnu 3, 1')).toBeNull();
		expect(parsePericope('n’importe quoi')).toBeNull();
	});

	it('keeps the reference it was given', () => {
		expect(parsePericope('Lc 7, 11-16')?.ref).toBe('Lc 7, 11-16');
	});
});
