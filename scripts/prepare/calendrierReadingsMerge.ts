import type {
	CalendrierFixedFeast,
	CalendrierReadingsFile,
	CalendrierYearFile
} from './calendrier.ts';
import { readingsKey } from './calendrier.ts';
import { KNOWN_AELF_GAPS } from '../aelf/knownGaps.ts';
import type { WeekdayTarget } from './weekdayFeasts.ts';

/**
 * Validates that every curated feast/fixed-feast slug has a fetched AELF
 * reading, and returns the subset of `readingsFile` the current curated
 * data actually needs (so a feast later removed from the source text
 * doesn't leave a stale entry in the output). Throws, naming the missing
 * feast, rather than silently emitting a partial file - matches this
 * project's established fail-loud convention for build-time data gaps.
 * The exception: a key listed in `KNOWN_AELF_GAPS` is tolerated
 * absent rather than thrown on, since AELF genuinely has no fetchable date
 * for it yet.
 *
 * `weekdayTargets` is already filtered upstream to only the combos with a
 * real `readingsFile` entry, so that loop copies without the throw-on-missing
 * guard the year/fixed loops need.
 */
export function mergeReadings(
	yearFiles: CalendrierYearFile[],
	fixed: CalendrierFixedFeast[],
	readingsFile: CalendrierReadingsFile,
	weekdayTargets: WeekdayTarget[] = []
): CalendrierReadingsFile {
	const out: CalendrierReadingsFile = {};

	for (const yf of yearFiles) {
		for (const feast of yf.feasts) {
			const key = readingsKey(feast.slug, yf.key);
			const entry = readingsFile[key];
			if (!entry) {
				if (key in KNOWN_AELF_GAPS) continue;
				throw new Error(
					`calendrier: no AELF reading resolved for "${feast.title}" (${key}). ` +
						`Run "npm run fetch-aelf" and commit the updated readings.json.`
				);
			}
			out[key] = entry;
		}
	}
	for (const ff of fixed) {
		const key = readingsKey(ff.slug);
		const entry = readingsFile[key];
		if (!entry) {
			throw new Error(
				`calendrier: no AELF reading resolved for "${ff.title}" (${key}). ` +
					`Run "npm run fetch-aelf" and commit the updated readings.json.`
			);
		}
		out[key] = entry;
	}
	for (const t of weekdayTargets) {
		const key = readingsKey(t.slug, t.cycle);
		out[key] = readingsFile[key]!;
	}

	for (const key of Object.keys(KNOWN_AELF_GAPS)) {
		if (key in readingsFile) {
			console.warn(
				`calendrier: "${key}" is listed in KNOWN_AELF_GAPS but readings.json now has an entry for it - remove it from the allowlist.`
			);
		}
	}

	return out;
}
