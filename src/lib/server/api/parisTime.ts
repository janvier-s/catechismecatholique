/**
 * Date helpers for `/api/liturgie`. Extracted from the route so they can be
 * tested against a fixed clock: the spec's Testing section names the
 * Europe/Paris midnight calculation specifically.
 */

const MIN_TTL = 60;
const MAX_TTL = 3600;

/**
 * Seconds until the next midnight in Europe/Paris, clamped to [60, 3600].
 *
 * The clamp exists so a request just after midnight does not ask the edge to
 * hold the body for a full day, and one just before midnight still gets a
 * usable TTL rather than zero.
 */
export function secondsUntilParisMidnight(now: Date): number {
	const paris = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
	// A runtime whose ICU emits a narrow no-break space before AM/PM can make
	// the round-trip above unparseable. Fall back to the safe short TTL rather
	// than emitting `max-age=NaN`.
	if (Number.isNaN(paris.getTime())) return MIN_TTL;
	const midnight = new Date(paris);
	midnight.setHours(24, 0, 0, 0);
	const seconds = Math.ceil((midnight.getTime() - paris.getTime()) / 1000);
	if (!Number.isFinite(seconds)) return MIN_TTL;
	return Math.max(MIN_TTL, Math.min(MAX_TTL, seconds));
}

/** Today's date in Europe/Paris as YYYY-MM-DD, the calendar index's key format. */
export function todayInParis(now: Date): string {
	// en-CA formats as YYYY-MM-DD, which is exactly the index key format.
	return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
}
