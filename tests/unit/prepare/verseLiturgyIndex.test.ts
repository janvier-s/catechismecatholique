import { describe, it, expect } from 'vitest';
import {
	normalizeReadingRef,
	buildVerseLiturgyIndex,
	type VerseLiturgyDay,
	type VerseLiturgySource
} from '../../../scripts/prepare/verseLiturgyIndex';

describe('normalizeReadingRef', () => {
	it('prefixes a bookless psalm ref with Ps', () => {
		expect(normalizeReadingRef('79 (80), 2ac.3bc, 15-16a, 18-19', 'psaume')).toBe(
			'Ps 79 (80), 2ac.3bc, 15-16a, 18-19'
		);
	});

	it('prefixes a bookless cantique ref with Ps', () => {
		expect(normalizeReadingRef('97 (98), 1, 2-3ab', 'cantique')).toBe('Ps 97 (98), 1, 2-3ab');
	});

	it('leaves a psalm ref that already names its book alone', () => {
		expect(normalizeReadingRef('Ps 145 (146), 7, 8', 'psaume')).toBe('Ps 145 (146), 7, 8');
	});

	it('leaves a numbered book alone', () => {
		// "2 S 7, 4-5a" opens on a digit but that digit is the book's own
		// number, not a psalm number · prefixing it would corrupt the ref.
		expect(normalizeReadingRef('2 S 7, 4-5a.12-14a.16', 'psaume')).toBe('2 S 7, 4-5a.12-14a.16');
	});

	it('leaves a gospel ref alone', () => {
		expect(normalizeReadingRef('Mt 11, 2-11', 'evangile')).toBe('Mt 11, 2-11');
	});
});

function day(slug: string, over: Partial<VerseLiturgyDay> = {}): VerseLiturgyDay {
	return {
		slug,
		title: slug,
		season: 'avent',
		color: 'violet',
		kind: 'year',
		readings: [],
		...over
	};
}

function source(d: VerseLiturgyDay, readings: { type: string; ref: string }[]): VerseLiturgySource {
	return { day: { ...d, readings }, readings };
}

describe('buildVerseLiturgyIndex', () => {
	it('maps every verse of a range to its day', () => {
		const idx = buildVerseLiturgyIndex([
			source(day('avent-3'), [{ type: 'evangile', ref: 'Mt 11, 2-11' }])
		]);
		expect(idx.days).toHaveLength(1);
		const verses = idx.books['matthieu']!['11']!;
		expect(Object.keys(verses).sort((a, b) => Number(a) - Number(b))).toEqual([
			'2',
			'3',
			'4',
			'5',
			'6',
			'7',
			'8',
			'9',
			'10',
			'11'
		]);
		expect(verses['5']).toEqual([0]);
	});

	it('records a day once when two of its readings hit the same verse', () => {
		const idx = buildVerseLiturgyIndex([
			source(day('doublon'), [
				{ type: 'lecture_1', ref: 'Jn 3, 16' },
				{ type: 'evangile', ref: 'Jn 3, 16-18' }
			])
		]);
		expect(idx.books['jean']!['3']!['16']).toEqual([0]);
	});

	it('lists days in source order for a shared verse', () => {
		const idx = buildVerseLiturgyIndex([
			source(day('premier'), [{ type: 'evangile', ref: 'Jn 3, 16' }]),
			source(day('second'), [{ type: 'evangile', ref: 'Jn 3, 16' }])
		]);
		expect(idx.books['jean']!['3']!['16']).toEqual([0, 1]);
	});

	it('handles a bookless psalm ref through the normaliser', () => {
		const idx = buildVerseLiturgyIndex([
			source(day('psaume-jour'), [{ type: 'psaume', ref: '97 (98), 1, 2-3ab' }])
		]);
		// parseAelfRef prefers the parenthesised Hebrew numbering, so this is
		// psalm 98, not 97.
		expect(idx.books['psaumes']!['98']!['1']).toEqual([0]);
	});

	it('skips a ref spanning two chapters and counts it', () => {
		const idx = buildVerseLiturgyIndex([
			source(day('rameaux'), [{ type: 'evangile', ref: 'Mt 26, 14 – 27, 66' }])
		]);
		expect(idx.books['matthieu']).toBeUndefined();
		expect(idx.skipped).toBe(1);
	});

	it('keeps a day out of the table when none of its refs parse', () => {
		const idx = buildVerseLiturgyIndex([
			source(day('illisible'), [{ type: 'evangile', ref: 'pas une référence' }])
		]);
		expect(idx.days).toHaveLength(0);
		expect(idx.skipped).toBe(1);
	});

	it('carries the day fields the panel renders', () => {
		const idx = buildVerseLiturgyIndex([
			source(
				day('ferie', {
					kind: 'weekday',
					weekdayCycle: 'II',
					title: 'Jeudi de la 1re semaine',
					readingsKey: 'II:avent-1-jeudi'
				}),
				[{ type: 'evangile', ref: 'Mt 7, 21' }]
			)
		]);
		expect(idx.days[0]).toMatchObject({
			slug: 'ferie',
			kind: 'weekday',
			weekdayCycle: 'II',
			readingsKey: 'II:avent-1-jeudi',
			readings: [{ type: 'evangile', ref: 'Mt 7, 21' }]
		});
	});
});
