import type { CalendrierDateRow, CalendrierDatesIndexFile } from '$lib/data/types';
import { toIsoDate } from './calendrierDateLookup';

export interface MonthGridCell {
	date: string;
	day: number;
	inMonth: boolean;
	inRange: boolean;
	row: CalendrierDateRow | null;
}

/**
 * Builds a fixed 6-week, Monday-first grid for `month` (1-12) of `year`.
 * Leading/trailing cells from adjacent months are included for layout
 * continuity and marked `inMonth: false`.
 */
export function buildMonthGrid(
	year: number,
	month: number,
	index: CalendrierDatesIndexFile
): MonthGridCell[][] {
	const rowsByDate = new Map(index.rows.map((r) => [r.date, r]));

	const firstOfMonth = new Date(year, month - 1, 1);
	const leadingDays = (firstOfMonth.getDay() + 6) % 7; // Monday-first offset
	const gridStart = new Date(firstOfMonth);
	gridStart.setDate(gridStart.getDate() - leadingDays);

	const grid: MonthGridCell[][] = [];
	const cursor = new Date(gridStart);
	for (let week = 0; week < 6; week++) {
		const days: MonthGridCell[] = [];
		for (let day = 0; day < 7; day++) {
			const date = toIsoDate(cursor);
			days.push({
				date,
				day: cursor.getDate(),
				inMonth: cursor.getMonth() === month - 1 && cursor.getFullYear() === year,
				inRange: date >= index.rangeStart && date <= index.rangeEnd,
				row: rowsByDate.get(date) ?? null
			});
			cursor.setDate(cursor.getDate() + 1);
		}
		grid.push(days);
	}
	return grid;
}
