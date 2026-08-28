// scripts/aelf/knownGaps.ts

/**
 * Keys that `npm run fetch-aelf` cannot currently resolve for any past
 * date it tries, for two distinct reasons:
 *
 * - Structural calendar mismatch: AELF's "romain" zone transfers Epiphany
 *   and Corpus Christi to the nearest Sunday even when queried with
 *   `zone: 'romain'`, while this project's romcal-computed dates do not.
 *   A curated feast whose date always falls in the transfer's shadow (e.g.
 *   "second-dimanche-apres-noel" is always the Sunday between Christmas and
 *   Jan 6, which AELF always treats as the transferred Epiphany) can never
 *   resolve, no matter how many past years are tried - this is permanent,
 *   not a temporary gap.
 * - Archive/occurrence gap: no date exists for this key at all, either
 *   because AELF's archive doesn't reach far enough back or because every
 *   occurrence this project's date range covers happens to collide with a
 *   transferred solemnity (see above) - this one IS temporary and should
 *   resolve on its own as later occurrences enter the covered date range.
 *
 * Tolerated here, explicitly and by name, rather than silently dropped, so
 * a future re-run of `npm run fetch-aelf` can be checked against this list:
 * a key that starts resolving should be deleted from it.
 */
export const KNOWN_AELF_GAPS: Record<string, string> = {
	// Permanent: this slug's date is always the Sunday between Christmas and
	// Jan 6 - the exact Sunday AELF gives transferred Epiphany's content
	// instead (see `aelfQueryDate` in fetch-aelf.ts, which recovers real
	// Epiphany content itself by querying that same transferred Sunday -
	// there is no separate "second Sunday after Christmas" content to
	// recover for this slug, since AELF's calendar doesn't have that day at
	// all in years the transfer applies). Verified across every past
	// occurrence 2000-2026.
	'a:second-dimanche-apres-noel': 'permanent - always collides with transferred Epiphany',
	'b:second-dimanche-apres-noel': 'permanent - always collides with transferred Epiphany',
	'c:second-dimanche-apres-noel': 'permanent - always collides with transferred Epiphany',
	// Every past occurrence within this project's date range (2000-2035)
	// collided with Corpus Christi's transferred Sunday for this specific
	// (Ordinary-Time-Sunday-N, cycle) pair - not provably permanent the way
	// the three pairs above are (Corpus Christi's date does shift with
	// Easter), but empirically unresolvable with every candidate tried.
	'a:neuvieme-dimanche-du-temps-ordinaire':
		'every occurrence in the covered date range collides with Corpus Christi',
	'b:septieme-dimanche-du-temps-ordinaire':
		'every occurrence in the covered date range collides with Corpus Christi',
	'b:huitieme-dimanche-du-temps-ordinaire':
		'every occurrence in the covered date range collides with Corpus Christi',
	'b:neuvieme-dimanche-du-temps-ordinaire':
		'every occurrence in the covered date range collides with Corpus Christi',
	'c:neuvieme-dimanche-du-temps-ordinaire':
		'every occurrence in the covered date range collides with Corpus Christi'
};
