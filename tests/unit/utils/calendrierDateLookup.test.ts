import { describe, it, expect } from 'vitest';
import {
	toIsoDate,
	previousSunday,
	nextSunday,
	resolveToday,
	resolvePickedDate,
	resolveFeastForRow
} from '../../../src/lib/utils/calendrierDateLookup';
import type {
	CalendrierDatesIndexFile,
	CalendrierDateRow,
	CalendrierFixedFeast
} from '../../../src/lib/data/types';

const index: CalendrierDatesIndexFile = {
	rangeStart: '2024-01-01',
	rangeEnd: '2024-12-31',
	rows: [
		{
			date: '2024-01-14',
			slug: 'deuxieme-dimanche-du-temps-ordinaire',
			corpus: 'year',
			yearKey: 'b',
			liturgicalColor: 'green'
		},
		{
			date: '2024-03-29',
			slug: 'vendredi-saint-la-passion-du-seigneur',
			corpus: 'year',
			yearKey: 'b',
			liturgicalColor: 'red'
		},
		{
			date: '2024-03-31',
			slug: 'dimanche-de-paques-la-resurrection-du-seigneur',
			corpus: 'year',
			yearKey: 'b',
			liturgicalColor: 'white'
		}
	]
};

describe('previousSunday / nextSunday', () => {
	it('snaps a weekday forward to that weeks Sunday', () => {
		expect(toIsoDate(nextSunday(new Date(2024, 0, 10)))).toBe('2024-01-14'); // Wednesday
	});
	it('leaves a Sunday unchanged when snapping forward', () => {
		expect(toIsoDate(nextSunday(new Date(2024, 0, 14)))).toBe('2024-01-14');
	});
	it('walks a weekday back to that weeks Sunday', () => {
		expect(toIsoDate(previousSunday(new Date(2024, 0, 10)))).toBe('2024-01-07');
	});
	it('walks a Sunday back a full week, not to itself', () => {
		expect(toIsoDate(previousSunday(new Date(2024, 0, 14)))).toBe('2024-01-07');
	});
});

describe('resolveToday', () => {
	it('matches when today is itself a covered Sunday', () => {
		expect(resolveToday(index, new Date(2024, 0, 14))).toEqual({
			status: 'match',
			row: index.rows[0],
			label: 'today'
		});
	});
	it('falls back to the previous Sunday on a ferial weekday', () => {
		expect(resolveToday(index, new Date(2024, 0, 17))).toEqual({
			status: 'match',
			row: index.rows[0],
			label: 'previous-sunday'
		});
	});
	it('reports out-of-range outside the index bounds', () => {
		expect(resolveToday(index, new Date(2017, 0, 1))).toEqual({ status: 'out-of-range' });
	});
});

describe('resolvePickedDate', () => {
	it('matches a fixed/moveable solemnity on its exact weekday before snapping to Sunday', () => {
		expect(resolvePickedDate(index, new Date(2024, 2, 29))).toEqual({
			// Good Friday, a Friday
			status: 'match',
			row: index.rows[1],
			label: 'picked'
		});
	});
	it('snaps a weekday forward to that weeks Sunday', () => {
		expect(resolvePickedDate(index, new Date(2024, 0, 9))).toEqual({
			// Tuesday before Jan 14
			status: 'match',
			row: index.rows[0],
			label: 'picked'
		});
	});
	it('reports no-match when nothing is nearby', () => {
		expect(resolvePickedDate(index, new Date(2024, 5, 1))).toEqual({ status: 'no-match' });
	});
	it('reports no-match (not out-of-range) when picked is in-range but snap lands past rangeEnd', () => {
		const narrowIndex: CalendrierDatesIndexFile = {
			rangeStart: '2024-01-01',
			rangeEnd: '2024-12-24',
			rows: [
				{
					date: '2024-12-22',
					slug: 'test-sunday',
					corpus: 'year',
					yearKey: 'b',
					liturgicalColor: 'green'
				}
			]
		};
		// 2024-12-23 is a Monday, in range, but nextSunday is 2024-12-29, past rangeEnd
		expect(resolvePickedDate(narrowIndex, new Date(2024, 11, 23))).toEqual({
			status: 'no-match'
		});
	});
});

describe('resolveFeastForRow', () => {
	it('resolves a weekday row via loadCalendrierFeries', async () => {
		const fixedFeasts: CalendrierFixedFeast[] = [];
		const row: CalendrierDateRow = {
			date: '2026-01-12',
			slug: 'ordinaire-2-lundi',
			corpus: 'weekday',
			cycle: 'II',
			liturgicalColor: 'green'
		};
		const mockFetch = (async () =>
			new Response(
				JSON.stringify({
					key: 'II',
					feasts: [
						{
							slug: 'ordinaire-2-lundi',
							title: 'Lundi de la 2e semaine du Temps Ordinaire',
							season: 'ordinaire',
							liturgicalColor: 'green',
							clusters: []
						}
					]
				})
			)) as unknown as typeof fetch;
		const feast = await resolveFeastForRow(row, fixedFeasts, mockFetch);
		expect(feast?.slug).toBe('ordinaire-2-lundi');
	});
});
