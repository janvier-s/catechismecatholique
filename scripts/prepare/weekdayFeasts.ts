import { Romcal } from 'romcal';
import type { SeasonKey } from './calendrier.ts';

export interface WeekdayCandidate {
	date: string;
	rank: 'WEEKDAY' | 'MEMORIAL' | 'OPTIONAL_MEMORIAL';
}

export interface WeekdayTarget {
	slug: string;
	season: SeasonKey;
	weekOfSeason: number;
	dayOfWeek: number;
	cycle: 'I' | 'II';
	/** Every real occurrence of this (season, week, weekday, cycle) combo at
	 *  or before `today`, most recent first - AELF's archive only reaches
	 *  back a few years, and a plain weekday occurrence of a given combo can
	 *  be scarce (Advent is 4 weeks long, cut short again by the date-proper
	 *  boundary at 17 December), so the fetcher needs more than one date to
	 *  try. A memorial/optional memorial keeps the weekday's own Mass
	 *  readings unless it has proper readings of its own; whether a specific
	 *  occurrence did isn't knowable from romcal alone, so the fetcher
	 *  verifies via AELF's own response before accepting one (see
	 *  fetch-aelf.ts). */
	candidates: WeekdayCandidate[];
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
 * True for weekdays whose readings the Roman lectionary assigns by calendar
 * date rather than by position in a week · from 17 December (the O Antiphons)
 * to the end of Christmas Time. Our `{season}-{weekOfSeason}-{dayOfWeek}`
 * identity cannot express those: two different real dates that romcal both
 * labels "Tuesday of the 3rd week of Advent" carry entirely different Mass
 * readings there, so one representative date's text would be confidently wrong
 * on every other date sharing the slug. We skip them rather than guess · both
 * when enumerating fetch targets and when emitting dates-index rows, which must
 * stay in lockstep.
 */
export function isDateProperWeekday(season: SeasonKey, date: string): boolean {
	if (season === 'noel') return true;
	return season === 'avent' && date.slice(5, 10) >= '12-17';
}

/**
 * Enumerates every distinct (season, weekOfSeason, dayOfWeek, weekdayCycle)
 * combination a ferial weekday, memorial, or optional memorial can be,
 * across [startYear, endYear], collecting every occurrence at or before
 * `today` as a fetch candidate (most recent first - see WeekdayTarget). A
 * weekday displaced by a FEAST/SOLEMNITY/SUNDAY has `rank` outside that set
 * that year and is skipped for that year only, same principle the Sunday
 * pipeline already relies on for displaced numbered Sundays.
 *
 * `Ranks` is a type-only export in romcal's TypeScript declarations, not a
 * runtime value (romcal's own `index.d.ts` declares it with `declare enum`
 * but the built JS module doesn't export it), so the comparisons below use
 * the string literals directly - the same pattern `calendrierDates.ts` uses
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
			if (day.rank !== 'WEEKDAY' && day.rank !== 'MEMORIAL' && day.rank !== 'OPTIONAL_MEMORIAL') {
				continue;
			}
			if (day.date > today) continue;

			const dayOfWeek = day.calendar.dayOfWeek;
			const weekOfSeason = day.calendar.weekOfSeason;
			if (dayOfWeek === undefined || dayOfWeek === 0 || weekOfSeason === undefined) continue;

			const romcalSeason = day.seasons[0];
			const season = romcalSeason ? ROMCAL_SEASON_TO_OURS[romcalSeason] : undefined;
			if (!season) continue;
			if (isDateProperWeekday(season, day.date)) continue;

			const cycle: 'I' | 'II' = day.cycles.weekdayCycle === 'YEAR_1' ? 'I' : 'II';
			const slug = weekdaySlug(season, weekOfSeason, dayOfWeek);
			const key = `${slug}:${cycle}`;

			let target = bySlugCycle.get(key);
			if (!target) {
				target = { slug, season, weekOfSeason, dayOfWeek, cycle, candidates: [] };
				bySlugCycle.set(key, target);
			}
			target.candidates.push({ date: day.date, rank: day.rank });
		}
	}

	const targets = [...bySlugCycle.values()];
	for (const target of targets) {
		target.candidates.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
	}
	return targets.sort((a, b) => a.slug.localeCompare(b.slug) || a.cycle.localeCompare(b.cycle));
}
