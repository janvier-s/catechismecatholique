import type { CalendrierFixedFeast, CalendrierReadingsFile, CalendrierYearFile } from './calendrier.ts';

/**
 * Validates that every curated feast/fixed-feast slug has a fetched AELF
 * reading, and returns the subset of `readingsFile` the current curated
 * data actually needs (so a feast later removed from the source text
 * doesn't leave a stale entry in the output). Throws, naming the missing
 * feast, rather than silently emitting a partial file - matches this
 * project's established fail-loud convention for build-time data gaps.
 */
export function mergeReadings(
	yearFiles: CalendrierYearFile[],
	fixed: CalendrierFixedFeast[],
	readingsFile: CalendrierReadingsFile
): CalendrierReadingsFile {
	const out: CalendrierReadingsFile = {};

	for (const yf of yearFiles) {
		for (const feast of yf.feasts) {
			const entry = readingsFile[feast.slug];
			if (!entry) {
				throw new Error(
					`calendrier: no AELF reading resolved for "${feast.title}" (${feast.slug}). ` +
						`Run "npm run fetch-aelf" and commit the updated readings.json.`
				);
			}
			out[feast.slug] = entry;
		}
	}
	for (const ff of fixed) {
		const entry = readingsFile[ff.slug];
		if (!entry) {
			throw new Error(
				`calendrier: no AELF reading resolved for "${ff.title}" (${ff.slug}). ` +
					`Run "npm run fetch-aelf" and commit the updated readings.json.`
			);
		}
		out[ff.slug] = entry;
	}

	return out;
}
