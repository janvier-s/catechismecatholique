import { describe, it, expect } from 'vitest';
import { buildBibleVerseIndex } from '../../../scripts/prepare/bible-verse-index';
import { BOOKS } from '../../../src/lib/utils/bibleBookSlug';

const NCL = {
	JHN: { '1': { '14': 'le Verbe', '15': '...' } },
	'1CO': {
		'1': { '1': '...', '2': '...' },
		'10': { '1': '...', '2': '...', '3': '...', '6': '...' }
	}
};

describe('buildBibleVerseIndex', () => {
	it('maps a single-verse ref', () => {
		const idx = buildBibleVerseIndex(NCL, { 'Jn 1:14': [461] }, BOOKS);
		expect(idx['JHN']!['1']!['14']).toEqual([461]);
	});

	it('expands a verse-range to every verse', () => {
		const idx = buildBibleVerseIndex(NCL, { '1 Cor 10:1-6': [1094] }, BOOKS);
		expect(idx['1CO']!['10']!['1']).toEqual([1094]);
		expect(idx['1CO']!['10']!['6']).toEqual([1094]);
		expect(idx['1CO']!['10']!['2']).toEqual([1094]);
	});

	it('expands a chapter-range to every verse of every chapter', () => {
		const idx = buildBibleVerseIndex(NCL, { '1 Cor 1-6': [401] }, BOOKS);
		expect(idx['1CO']!['1']!['1']).toEqual([401]);
		expect(idx['1CO']!['1']!['2']).toEqual([401]);
	});

	it('handles every alternate abbreviation for a book', () => {
		// 'Gen' is a secondary abbr for Genesis; lookup must accept it.
		const ncl2 = { ...NCL, GEN: { '1': { '1': '...' } } };
		const idx = buildBibleVerseIndex(ncl2, { 'Gen 1:1': [11] }, BOOKS);
		expect(idx['GEN']!['1']!['1']).toEqual([11]);
	});

	it('dedupes and sorts paragraphs', () => {
		const merged = buildBibleVerseIndex(
			NCL,
			{ 'Jn 1:14': [461, 423, 461] },
			BOOKS
		);
		expect(merged['JHN']!['1']!['14']).toEqual([423, 461]);
	});
});
