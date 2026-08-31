import { describe, it, expect } from 'vitest';
import { parseAelfRef } from '../../../scripts/prepare/concordanceRefParser';

describe('parseAelfRef', () => {
	it('parses a plain single-range ref', () => {
		expect(parseAelfRef('Ep 1, 1-10')).toEqual({
			slug: 'ephesiens',
			chapter: 1,
			ranges: [[1, 10]]
		});
	});

	it('parses a numbered-book ref with a double space', () => {
		expect(parseAelfRef('1 R  17, 1-6')).toEqual({
			slug: '1-rois',
			chapter: 17,
			ranges: [[1, 6]]
		});
	});

	it('strips lowercase verse-letter suffixes and irregular dash spacing', () => {
		expect(parseAelfRef('Jn 3, 7b- 15')).toEqual({
			slug: 'jean',
			chapter: 3,
			ranges: [[7, 15]]
		});
	});

	it('parses dot-separated compound ranges', () => {
		expect(parseAelfRef('Mi 6, 1-4.6-8')).toEqual({
			slug: 'michee',
			chapter: 6,
			ranges: [
				[1, 4],
				[6, 8]
			]
		});
	});

	it('parses a single verse with no range', () => {
		expect(parseAelfRef('Lc 4, 24')).toEqual({
			slug: 'luc',
			chapter: 4,
			ranges: [[24, 24]]
		});
	});

	it('uses the parenthesised (Hebrew) number of a dual-numbered psalm ref', () => {
		expect(parseAelfRef('Ps 118 (119), 97-98, 99-100, 101-102')).toEqual({
			slug: 'psaumes',
			chapter: 119,
			ranges: [
				[97, 98],
				[99, 100],
				[101, 102]
			]
		});
	});

	it('keeps the parenthesised number even when it is the shorter one', () => {
		expect(parseAelfRef('Ps 21 (22), 1-2')).toEqual({
			slug: 'psaumes',
			chapter: 22,
			ranges: [[1, 2]]
		});
	});

	it('returns null for a ref spanning two chapters', () => {
		expect(parseAelfRef('Mt 26, 14 – 27, 66')).toBeNull();
		expect(parseAelfRef('Is 8, 23b – 9, 3')).toBeNull();
		expect(parseAelfRef('Ml 1, 14b – 2, 2b.8-10')).toBeNull();
	});

	it('still parses hyphen-joined verse ranges that look dash-like', () => {
		expect(parseAelfRef('Ps 129 (130), 1-2, 3-4')).toEqual({
			slug: 'psaumes',
			chapter: 130,
			ranges: [
				[1, 2],
				[3, 4]
			]
		});
	});

	it('returns null for an unresolvable book abbreviation', () => {
		expect(parseAelfRef('Xyz 1, 1-5')).toBeNull();
	});

	it('returns null for a malformed ref', () => {
		expect(parseAelfRef('not a reference')).toBeNull();
	});
});
