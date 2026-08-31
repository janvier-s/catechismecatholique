import type {
	CalendrierFeast,
	CalendrierReading,
	LiturgicalColor,
	SeasonKey
} from './calendrier.ts';
import { parseAelfRef } from './concordanceRefParser.ts';
import { matchConcordance, type CccCitation } from './concordanceMatcher.ts';
import { clusterCitations, type HeadingLevels } from './cecHeadingCluster.ts';

/**
 * Builds one weekday's CalendrierFeast from its raw AELF readings, by
 * parsing each reading's ref, matching it against the archived concordance,
 * and clustering the union of citations by CCC heading. A reading whose ref
 * doesn't parse, or whose chapter isn't covered by the concordance,
 * contributes nothing · not an error, since psalm and first-reading
 * coverage is intentionally partial (see the design spec).
 */
export function buildWeekdayFeast(
	slug: string,
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

	return {
		slug,
		title: slug,
		season,
		liturgicalColor,
		clusters: clusterCitations(citations, levels)
	};
}
