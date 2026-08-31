import { Romcal, type Season } from 'romcal';
import type {
	CalendrierDateRow,
	CalendrierFeast,
	CalendrierFixedFeast,
	CalendrierYearFile,
	LiturgicalColor,
	SeasonKey
} from './calendrier.ts';
import { parseFrenchOrdinal } from './calendrierFrenchOrdinal.ts';
import { NAMED_FEAST_ROMCAL_ID, SEASON_TO_ROMCAL } from './calendrierRomcalIds.ts';
import {
	isDateProperWeekday,
	ROMCAL_SEASON_TO_OURS,
	weekdaySlug,
	type WeekdayTarget
} from './weekdayFeasts.ts';

export const DATE_RANGE_START_YEAR = 2000;
export const DATE_RANGE_END_YEAR = 2035;

// A weekday slug's own liturgical color must be the season's ferial color,
// not whichever occurrence's color happened to be resolved first: since a
// memorial's color is the SAINT's (usually white, sometimes red), widening
// weekday rows to memorial dates means the very first occurrence scanned for
// a slug like "avent-1-jeudi" could well be a white-vested memorial rather
// than a plain violet Advent weekday, giving the whole slug the wrong color.
const SEASON_FERIAL_COLOR: Record<SeasonKey, LiturgicalColor> = {
	avent: 'violet',
	noel: 'white',
	careme: 'violet',
	pascal: 'white',
	solennite: 'white',
	ordinaire: 'green'
};

const ROMCAL_COLOR_TO_OURS: Record<string, LiturgicalColor> = {
	RED: 'red',
	ROSE: 'rose',
	PURPLE: 'violet',
	GREEN: 'green',
	WHITE: 'white',
	GOLD: 'white', // same festive tier as white; no separate accent needed
	BLACK: 'violet' // rare (e.g. All Souls); closest mournful color we support
};

type Matcher = { kind: 'id'; id: string } | { kind: 'sunday'; season: Season; week: number };

function buildMatcher(slug: string, title: string, season: CalendrierFeast['season']): Matcher {
	const namedId = NAMED_FEAST_ROMCAL_ID[slug];
	if (namedId) return { kind: 'id', id: namedId };

	const week = parseFrenchOrdinal(title);
	const romcalSeason = SEASON_TO_ROMCAL[season];
	if (week === null || !romcalSeason) {
		throw new Error(
			`calendrier: feast "${title}" (${slug}) has no NAMED_FEAST_ROMCAL_ID entry and its ` +
				`title did not parse as an ordinal Sunday. Add it to calendrierRomcalIds.ts.`
		);
	}
	return { kind: 'sunday', season: romcalSeason, week };
}

export interface CalendrierDatesJoinResult {
	rows: CalendrierDateRow[];
	colorsBySlug: Map<string, LiturgicalColor>;
}

export async function buildCalendrierDates(
	yearFiles: CalendrierYearFile[],
	fixedFeasts: CalendrierFixedFeast[],
	weekdayTargets: WeekdayTarget[] = []
): Promise<CalendrierDatesJoinResult> {
	const rows: CalendrierDateRow[] = [];
	const colorsBySlug = new Map<string, LiturgicalColor>();

	// Matchers are year-invariant (a feast's identity doesn't change year to
	// year), so resolve each one exactly once regardless of how many years
	// we scan below. This is also where a bad title fails loudly, once,
	// rather than 18 times.
	const matchersBySlug = new Map<string, Matcher>();
	for (const yf of yearFiles) {
		for (const feast of yf.feasts) {
			matchersBySlug.set(feast.slug, buildMatcher(feast.slug, feast.title, feast.season));
		}
	}
	for (const ff of fixedFeasts) {
		const namedId = NAMED_FEAST_ROMCAL_ID[ff.slug];
		if (!namedId) {
			throw new Error(
				`calendrier: fixed feast "${ff.title}" (${ff.slug}) has no NAMED_FEAST_ROMCAL_ID entry.`
			);
		}
		matchersBySlug.set(ff.slug, { kind: 'id', id: namedId });
	}

	const weekdayBySlugCycle = new Map(weekdayTargets.map((t) => [`${t.slug}:${t.cycle}`, t]));

	for (let year = DATE_RANGE_START_YEAR; year <= DATE_RANGE_END_YEAR; year++) {
		const calendar = await new Romcal().generateCalendar(year);
		const days = Object.values(calendar).map((arr) => arr[0]!);

		const byId = new Map(days.map((d) => [d.id, d]));
		const sundaysBySeasonWeek = new Map<string, (typeof days)[number]>();
		for (const d of days) {
			// A solemnity that displaces a numbered Sunday keeps that Sunday's
			// season and weekOfSeason metadata, so "falls on a Sunday" is not
			// enough · only rank SUNDAY means the numbered Sunday is the thing
			// actually being celebrated that day.
			if (d.rank !== 'SUNDAY') continue;
			for (const s of d.seasons) {
				sundaysBySeasonWeek.set(`${s}:${d.calendar.weekOfSeason}`, d);
			}
		}

		for (const yf of yearFiles) {
			for (const feast of yf.feasts) {
				const matcher = matchersBySlug.get(feast.slug)!;
				const day =
					matcher.kind === 'id'
						? byId.get(matcher.id)
						: sundaysBySeasonWeek.get(`${matcher.season}:${matcher.week}`);
				if (!day) continue; // e.g. "Second Sunday after Christmas" doesn't occur every year

				// Colors are cycle-invariant, so resolve them from any year that
				// celebrates the feast, before the cycle gate below.
				if (!colorsBySlug.has(feast.slug)) {
					colorsBySlug.set(feast.slug, ROMCAL_COLOR_TO_OURS[day.colors[0] ?? 'WHITE'] ?? 'white');
				}

				// Several feasts have a different slug per année because the
				// curated source titles differ. A row must therefore be stamped
				// with the année file it came from, and only emitted when that
				// file is the one actually read that day · otherwise the row
				// points at a slug the yearKey's file doesn't contain.
				if (yf.key !== sundayCycleToYearKey(day.cycles.sundayCycle)) continue;

				rows.push({
					date: day.date,
					slug: feast.slug,
					corpus: 'year',
					yearKey: yf.key,
					liturgicalColor: colorsBySlug.get(feast.slug)!
				});
			}
		}

		for (const ff of fixedFeasts) {
			// romcal resolves transfers itself (the Immaculée moves off an Advent
			// Sunday, Saint Joseph off a Lent Sunday), so its date beats
			// arithmetic on the curated month/day.
			const matcher = matchersBySlug.get(ff.slug)!;
			const day = matcher.kind === 'id' ? byId.get(matcher.id) : undefined;
			if (!day) {
				// Romcal drops the celebration outright in a few years rather than
				// transferring it (Pierre et Paul whenever the Sacré-Coeur lands on
				// 28 June, Saint Joseph when 19 March falls in Holy Week). We have
				// no trustworthy date to substitute, so skip the year and say so.
				console.warn(`calendrier: ${ff.slug} has no romcal celebration in ${year} · no row`);
				continue;
			}

			if (!colorsBySlug.has(ff.slug)) {
				colorsBySlug.set(ff.slug, ROMCAL_COLOR_TO_OURS[day.colors[0] ?? 'WHITE'] ?? 'white');
			}
			rows.push({
				date: day.date,
				slug: ff.slug,
				corpus: 'fixed',
				liturgicalColor: colorsBySlug.get(ff.slug)!
			});
		}

		for (const day of days) {
			// A memorial or optional memorial in Ordinary Time (and most of the
			// year outside Advent/Lent/Easter) uses the weekday's own Mass
			// readings unless it has proper readings of its own, which we have
			// no data for - so it's still correct to show the ferial slug's
			// content here. Only WEEKDAY was accepted before, which meant any
			// date carrying a memorial got no card at all even though the
			// readings underneath it are the same.
			if (day.rank !== 'WEEKDAY' && day.rank !== 'MEMORIAL' && day.rank !== 'OPTIONAL_MEMORIAL') {
				continue;
			}
			const dayOfWeek = day.calendar.dayOfWeek;
			const weekOfSeason = day.calendar.weekOfSeason;
			if (dayOfWeek === undefined || dayOfWeek === 0 || weekOfSeason === undefined) continue;
			const romcalSeason = day.seasons[0];
			const season = romcalSeason ? ROMCAL_SEASON_TO_OURS[romcalSeason] : undefined;
			if (!season) continue;
			// Kept in lockstep with buildWeekdayTargets · a date excluded there
			// must never get a row here either.
			if (isDateProperWeekday(season, day.date)) continue;
			const cycle: 'I' | 'II' = day.cycles.weekdayCycle === 'YEAR_1' ? 'I' : 'II';
			const slug = weekdaySlug(season, weekOfSeason, dayOfWeek);
			if (!weekdayBySlugCycle.has(`${slug}:${cycle}`)) continue; // no fetched reading for this combo

			if (!colorsBySlug.has(slug)) {
				colorsBySlug.set(slug, SEASON_FERIAL_COLOR[season]);
			}
			rows.push({
				date: day.date,
				slug,
				corpus: 'weekday',
				cycle,
				sundayCycle: sundayCycleToYearKey(day.cycles.sundayCycle),
				liturgicalColor: colorsBySlug.get(slug)!
			});
		}
	}

	rows.sort((a, b) => a.date.localeCompare(b.date));
	return { rows, colorsBySlug };
}

function sundayCycleToYearKey(cycle: string): 'a' | 'b' | 'c' {
	if (cycle === 'YEAR_A') return 'a';
	if (cycle === 'YEAR_B') return 'b';
	return 'c';
}
