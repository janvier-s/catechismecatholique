import { describe, it, expect } from 'vitest';
import { buildBibleVerseIndex } from '../../scripts/prepare/bible-verse-index';
import type { BookInfo } from '../../src/lib/utils/bibleBookSlug';

/** Just enough of the bible text for the builder's "does this verse exist" guard. */
const ncl = {
	WIS: { '8': { '1': 'Elle déploie sa force…', '7': 'Aime-t-on la justice ?' } },
	JHN: { '3': { '16': 'Car Dieu a tant aimé le monde…' } }
};

const books: BookInfo[] = [
	{ usfx: 'WIS', slug: 'sagesse', frenchName: 'Sagesse', abbrs: ['Sg', 'Wis'] },
	{ usfx: 'JHN', slug: 'jean', frenchName: 'Jean', abbrs: ['Jn', 'John'] }
];

describe('buildBibleVerseIndex', () => {
	it('indexes the published index, keyed by its English abbreviations', () => {
		const out = buildBibleVerseIndex(ncl, { 'Wis 8:7': [1849] }, books, []);
		expect(out.WIS!['8']!['7']).toEqual([1849]);
	});

	// The bug: paragraph 302 cites Sg 8:1, the published index does not list it,
	// and nothing else fed the paragraph's own references in · so /bible/sagesse/8
	// showed nothing for it.
	it("indexes a paragraph's own reference that the published index omits", () => {
		const out = buildBibleVerseIndex(ncl, {}, books, [{ number: 302, refs: ['Sg 8:1'] }]);
		expect(out.WIS!['8']!['1']).toEqual([302]);
	});

	it('merges the two sources rather than letting either replace the other', () => {
		const out = buildBibleVerseIndex(ncl, { 'Wis 8:7': [1849] }, books, [
			{ number: 302, refs: ['Sg 8:1'] }
		]);
		expect(Object.keys(out.WIS!['8']!).sort()).toEqual(['1', '7']);
	});

	it('does not duplicate a paragraph the published index already lists', () => {
		const out = buildBibleVerseIndex(ncl, { 'John 3:16': [219] }, books, [
			{ number: 219, refs: ['Jn 3:16'] }
		]);
		expect(out.JHN!['3']!['16']).toEqual([219]);
	});

	it('expands a verse range across the verses that exist', () => {
		const out = buildBibleVerseIndex(ncl, {}, books, [{ number: 500, refs: ['Sg 8:1-7'] }]);
		expect(out.WIS!['8']!['1']).toEqual([500]);
		expect(out.WIS!['8']!['7']).toEqual([500]);
	});

	// Matches what the published-index path already does for a chapter range:
	// a reference to a whole chapter indexes every verse the chapter has.
	it('expands a chapter-only reference across the whole chapter', () => {
		const out = buildBibleVerseIndex(ncl, {}, books, [{ number: 500, refs: ['Sg 8'] }]);
		expect(Object.keys(out.WIS!['8']!).sort()).toEqual(['1', '7']);
	});

	// The guard the published-index path already applies: a verse the bible text
	// does not have must not enter the index.
	it('skips a verse the bible text does not contain', () => {
		const out = buildBibleVerseIndex(ncl, {}, books, [{ number: 500, refs: ['Sg 8:99'] }]);
		expect(out.WIS?.['8']?.['99']).toBeUndefined();
	});

	it('ignores a reference whose book it cannot resolve', () => {
		const out = buildBibleVerseIndex(ncl, {}, books, [{ number: 500, refs: ['Zzz 1:1'] }]);
		expect(out.ZZZ).toBeUndefined();
	});

	it('keeps each verse list sorted', () => {
		const out = buildBibleVerseIndex(ncl, { 'Wis 8:1': [900] }, books, [
			{ number: 100, refs: ['Sg 8:1'] }
		]);
		expect(out.WIS!['8']!['1']).toEqual([100, 900]);
	});
});
