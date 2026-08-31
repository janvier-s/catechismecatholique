import { Romcal } from 'romcal';
import type { SeasonKey } from './calendrier.ts';

export interface WeekdayTarget {
	slug: string;
	season: SeasonKey;
	weekOfSeason: number;
	dayOfWeek: number;
	cycle: 'I' | 'II';
	representativeDate: string;
}

export const FRENCH_WEEKDAY: Record<number, string> = {
	1: 'lundi',
	2: 'mardi',
	3: 'mercredi',
	4: 'jeudi',
	5: 'vendredi',
	6: 'samedi'
};

export const ROMCAL_SEASON_TO_OURS: Record<string, SeasonKey> = {
	ADVENT: 'avent',
	CHRISTMAS_TIME: 'noel',
	LENT: 'careme',
	EASTER_TIME: 'pascal',
	ORDINARY_TIME: 'ordinaire'
};

export function weekdaySlug(season: SeasonKey, weekOfSeason: number, dayOfWeek: number): string {
	return `${season}-${weekOfSeason}-${FRENCH_WEEKDAY[dayOfWeek]}`;
}

/**
 * Enumerates every distinct (season, weekOfSeason, dayOfWeek, weekdayCycle)
 * combination a plain ferial weekday can be, across [startYear, endYear],
 * keeping the most recent occurrence at or before `today` as the
 * representative date to fetch AELF text for. A weekday displaced by a
 * memorial/feast/solemnity has `rank !== Ranks.Weekday` that year and is
 * skipped for that year only - another year supplies the representative
 * date instead, same principle the Sunday pipeline already relies on for
 * displaced numbered Sundays.
 *
 * `Ranks` is a type-only export in romcal's TypeScript declarations, not a
 * runtime value (romcal's own `index.d.ts` declares it with `declare enum`
 * but the built JS module doesn't export it), so the comparison below uses
 * the string literal directly - the same pattern `calendrierDates.ts` uses
 * for `d.rank !== 'SUNDAY'`.
 */
export async function buildWeekdayTargets(
	startYear: number,
	endYear: number,
	today: string
): Promise<WeekdayTarget[]> {
	const bySlugCycle = new Map<string, WeekdayTarget>();

	for (let year = startYear; year <= endYear; year++) {
		const calendar = await new Romcal().generateCalendar(year);
		const days = Object.values(calendar).map((arr) => arr[0]!);

		for (const day of days) {
			if (day.rank !== 'WEEKDAY') continue;
			if (day.date > today) continue;

			const dayOfWeek = day.calendar.dayOfWeek;
			const weekOfSeason = day.calendar.weekOfSeason;
			if (dayOfWeek === undefined || dayOfWeek === 0 || weekOfSeason === undefined) continue;

			const romcalSeason = day.seasons[0];
			const season = romcalSeason ? ROMCAL_SEASON_TO_OURS[romcalSeason] : undefined;
			if (!season) continue;

			const cycle: 'I' | 'II' = day.cycles.weekdayCycle === 'YEAR_1' ? 'I' : 'II';
			const slug = weekdaySlug(season, weekOfSeason, dayOfWeek);
			const key = `${slug}:${cycle}`;

			const existing = bySlugCycle.get(key);
			if (!existing || day.date > existing.representativeDate) {
				bySlugCycle.set(key, {
					slug,
					season,
					weekOfSeason,
					dayOfWeek,
					cycle,
					representativeDate: day.date
				});
			}
		}
	}

	return [...bySlugCycle.values()].sort(
		(a, b) => a.slug.localeCompare(b.slug) || a.cycle.localeCompare(b.cycle)
	);
}
