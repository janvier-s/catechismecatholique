import type { CalendrierDateRow } from '../prepare/calendrier.ts';

/**
 * Candidate dates to query AELF for a feast slug, most recent first, among
 * rows not after `today` (both ISO yyyy-mm-dd strings). AELF only serves
 * real content for dates that have already occurred, and Sunday/solemnity
 * readings are locked to the liturgical cycle rather than the civil year,
 * so any past occurrence gives the right reading text - in principle. In
 * practice AELF's calendar transfers a handful of solemnities (Epiphany,
 * Corpus Christi) to the nearest Sunday even when queried with `zone:
 * 'romain'`, which this project's romcal-computed dates do not; on such a
 * date AELF silently returns a *different* celebration's content. More than
 * one candidate lets the caller detect that mismatch and retry an earlier
 * occurrence instead of accepting whatever the most recent date returns.
 * When `yearKey` is given, only rows from that lectionary cycle are
 * considered, since the same slug repeats across cycles A/B/C with
 * genuinely different readings; omit it for fixed feasts, whose rows carry
 * no `yearKey` at all.
 */
export function pickReadingDateCandidates(
	rows: CalendrierDateRow[],
	slug: string,
	today: string,
	yearKey?: 'a' | 'b' | 'c',
	limit = 12
): string[] {
	return rows
		.filter((r) => r.slug === slug && r.date <= today && (!yearKey || r.yearKey === yearKey))
		.map((r) => r.date)
		.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
		.slice(0, limit);
}

/**
 * The single most recent candidate date, or null if the slug has no past
 * occurrence yet. See `pickReadingDateCandidates` for the full rationale;
 * most callers that don't need retry-on-mismatch want this instead.
 */
export function pickReadingDate(
	rows: CalendrierDateRow[],
	slug: string,
	today: string,
	yearKey?: 'a' | 'b' | 'c'
): string | null {
	return pickReadingDateCandidates(rows, slug, today, yearKey, 1)[0] ?? null;
}
