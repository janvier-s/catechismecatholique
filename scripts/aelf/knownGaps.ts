// scripts/aelf/knownGaps.ts

/**
 * AELF's live archive only goes back to roughly 2017 (a query for
 * 2016-01-01 404s, 2017-01-01 succeeds) and serves no future date at all
 * (verified against dates as near as 2027 and 2029, not just far-future
 * ones). These three (Sunday-of-Ordinary-Time-N, cycle) pairs have no
 * occurrence between 2017 and today, and their next real occurrence is
 * years out - there is currently no fetchable date for them anywhere.
 * Tolerated here, explicitly and by name, rather than silently dropped, so
 * a future re-run of `npm run fetch-aelf` after the listed date passes can
 * pick each one up - at which point it should be deleted from this list.
 */
export const KNOWN_AELF_ARCHIVE_GAPS: Record<string, string> = {
	'a:neuvieme-dimanche-du-temps-ordinaire': 'next occurrence 2029-06-03',
	'b:septieme-dimanche-du-temps-ordinaire': 'next occurrence 2030-02-24',
	'b:huitieme-dimanche-du-temps-ordinaire': 'next occurrence 2030-03-03'
};
