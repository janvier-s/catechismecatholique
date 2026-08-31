import { describe, it, expect } from 'vitest';
import { buildMonthGrid } from '../../../src/lib/utils/calendrierMonthGrid';
import type { CalendrierDatesIndexFile } from '../../../src/lib/data/types';

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
			date: '2024-03-31',
			slug: 'dimanche-de-paques-la-resurrection-du-seigneur',
			corpus: 'year',
			yearKey: 'b',
			liturgicalColor: 'white'
		}
	]
};

describe('buildMonthGrid', () => {
	it('always returns 6 weeks of 7 days', () => {
		const grid = buildMonthGrid(2024, 1, index);
		expect(grid).toHaveLength(6);
		for (const week of grid) expect(week).toHaveLength(7);
	});

	it('starts January 2024 on Monday with no leading days from December', () => {
		const grid = buildMonthGrid(2024, 1, index);
		expect(grid[0]![0]).toMatchObject({ date: '2024-01-01', inMonth: true });
		expect(grid[0]![0]!.day).toBe(1);
	});

	it('pads leading days from the previous month, marked inMonth: false', () => {
		// March 2024 starts on a Friday, so Mon-Thu are Feb 26-29 (2024 is a leap year)
		const grid = buildMonthGrid(2024, 3, index);
		expect(grid[0]).toMatchObject([
			{ date: '2024-02-26', inMonth: false },
			{ date: '2024-02-27', inMonth: false },
			{ date: '2024-02-28', inMonth: false },
			{ date: '2024-02-29', inMonth: false },
			{ date: '2024-03-01', inMonth: true },
			{ date: '2024-03-02', inMonth: true },
			{ date: '2024-03-03', inMonth: true }
		]);
	});

	it('pads trailing days from the next month, marked inMonth: false', () => {
		const grid = buildMonthGrid(2024, 1, index);
		const lastWeek = grid[5]!;
		expect(lastWeek[0]).toMatchObject({ date: '2024-02-05', inMonth: false });
	});

	it('attaches the matching row and null otherwise', () => {
		const grid = buildMonthGrid(2024, 1, index);
		const jan14 = grid.flat().find((c) => c.date === '2024-01-14')!;
		expect(jan14.row).toEqual(index.rows[0]);

		const jan15 = grid.flat().find((c) => c.date === '2024-01-15')!;
		expect(jan15.row).toBeNull();
	});

	it('marks cells outside the dataset range as inRange: false, independent of inMonth', () => {
		const narrowIndex: CalendrierDatesIndexFile = {
			rangeStart: '2024-01-05',
			rangeEnd: '2024-12-31',
			rows: []
		};
		const grid = buildMonthGrid(2024, 1, narrowIndex);
		const jan4 = grid[0]!.find((c) => c.date === '2024-01-04')!;
		expect(jan4).toMatchObject({ inMonth: true, inRange: false });
		const jan5 = grid[0]!.find((c) => c.date === '2024-01-05')!;
		expect(jan5).toMatchObject({ inMonth: true, inRange: true });
	});

	it('handles December correctly (leading days come from November, trailing from January)', () => {
		// December 1 2024 is a Sunday, so Monday-first leading padding reaches
		// back into November and the year rolls forward for trailing days.
		const grid = buildMonthGrid(2024, 12, index);
		expect(grid[0]![0]).toMatchObject({ date: '2024-11-25', inMonth: false });
		expect(grid[0]![6]).toMatchObject({ date: '2024-12-01', inMonth: true });
		const lastCell = grid[5]![6]!;
		expect(lastCell.date >= '2025-01-01').toBe(true);
	});
});
