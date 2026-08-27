import type { CalendrierDateRow } from '../prepare/calendrier.ts';

/**
 * Picks the date to query AELF for a feast slug: the most recent row for
 * that slug whose date is not after `today` (both ISO yyyy-mm-dd strings).
 * AELF only serves real content for dates that have already occurred, and
 * Sunday/solemnity readings are locked to the liturgical cycle rather than
 * the civil year, so any past occurrence gives the right reading text.
 * Returns null if the slug has no past occurrence yet.
 */
export function pickReadingDate(
	rows: CalendrierDateRow[],
	slug: string,
	today: string
): string | null {
	const matches = rows.filter((r) => r.slug === slug && r.date <= today);
	if (matches.length === 0) return null;
	return matches.reduce((latest, r) => (r.date > latest ? r.date : latest), matches[0]!.date);
}
