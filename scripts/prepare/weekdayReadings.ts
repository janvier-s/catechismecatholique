import type {
	CalendrierFeast,
	CalendrierReading,
	LiturgicalColor,
	SeasonKey
} from './calendrier.ts';
import { parseAelfRef } from './concordanceRefParser.ts';
import { matchConcordance, type CccCitation } from './concordanceMatcher.ts';
import { clusterCitations, type HeadingLevels } from './cecHeadingCluster.ts';

const FRENCH_WEEKDAY_TITLE: Record<number, string> = {
	1: 'Lundi',
	2: 'Mardi',
	3: 'Mercredi',
	4: 'Jeudi',
	5: 'Vendredi',
	6: 'Samedi'
};

const SEASON_LABEL: Record<SeasonKey, string> = {
	avent: "de l'Avent",
	noel: 'du Temps de Noël',
	careme: 'de Carême',
	pascal: 'du Temps Pascal',
	solennite: '',
	ordinaire: 'du Temps Ordinaire'
};

function frenchOrdinal(n: number): string {
	return n === 1 ? '1re' : `${n}e`;
}

export function formatWeekdayTitle(
	season: SeasonKey,
	weekOfSeason: number,
	dayOfWeek: number
): string {
	const day = FRENCH_WEEKDAY_TITLE[dayOfWeek] ?? '';
	const seasonLabel = SEASON_LABEL[season];
	return `${day} de la ${frenchOrdinal(weekOfSeason)} semaine ${seasonLabel}`.trim();
}

/**
 * Builds one CalendrierFeast from raw AELF readings, by parsing each
 * reading's ref, matching it against the archived concordance, and
 * clustering the union of citations by CCC heading. A reading whose ref
 * doesn't parse, or whose chapter isn't covered by the concordance,
 * contributes nothing · not an error, since psalm and first-reading
 * coverage is intentionally partial (see the design spec).
 */
export function buildProperFeast(
	slug: string,
	title: string,
	season: SeasonKey,
	liturgicalColor: LiturgicalColor,
	readings: CalendrierReading[],
	concordanceDir: string,
	levels: HeadingLevels
): CalendrierFeast {
	const citations: CccCitation[] = [];
	for (const reading of readings) {
		if (!['lecture_1', 'psaume', 'evangile'].includes(reading.type)) continue;
		const parsed = parseAelfRef(reading.ref);
		if (!parsed) continue;
		citations.push(...matchConcordance(parsed, concordanceDir));
	}

	return { slug, title, season, liturgicalColor, clusters: clusterCitations(citations, levels) };
}

/** Same as `buildProperFeast`, with the title formatted from the weekday's
 *  season/week/day position rather than given directly. */
export function buildWeekdayFeast(
	slug: string,
	season: SeasonKey,
	weekOfSeason: number,
	dayOfWeek: number,
	liturgicalColor: LiturgicalColor,
	readings: CalendrierReading[],
	concordanceDir: string,
	levels: HeadingLevels
): CalendrierFeast {
	return buildProperFeast(
		slug,
		formatWeekdayTitle(season, weekOfSeason, dayOfWeek),
		season,
		liturgicalColor,
		readings,
		concordanceDir,
		levels
	);
}
