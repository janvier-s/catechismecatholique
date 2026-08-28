import type { CalendrierReading } from '../prepare/calendrier.ts';

export interface AelfMesse {
	nom: string;
	lectures: CalendrierReading[];
}

export interface PickMesseResult {
	messe: AelfMesse;
	warning: string | null;
}

/**
 * AELF's `nom` strings for a multi-Mass day are neither consistently cased
 * ("Messe du jour" vs "MESSE DU JOUR") nor consistently phrased ("Messe du
 * jour de Pâques", "Messe de la Passion" with no "jour" at all), so this
 * cannot be an exact-string match. Preparatory/partial Masses - a vigil, the
 * Chrism Mass, the Palm Sunday procession - are never what the curated data
 * means by a feast's one reading set, so they're excluded outright; among
 * what's left, a name containing "jour" is preferred (matches every "Messe
 * du jour…" variant), and the last remaining entry otherwise (the fullest,
 * most-day-of Mass tends to be listed last - e.g. "Messe de la Passion"
 * after "Procession des Rameaux"). A choice made via the fallback path is
 * still a heuristic, so it's warned rather than silent, for a future
 * reviewer to spot-check.
 */
const EXCLUDE_RE = /veill|vigile|nuit|aurore|chrismale|procession/i;
const JOUR_RE = /jour/i;

export function pickMesse(messes: AelfMesse[], slug: string): PickMesseResult {
	if (messes.length === 0) {
		throw new Error(`calendrier/aelf: AELF returned no messes for "${slug}"`);
	}
	if (messes.length === 1) {
		return { messe: messes[0]!, warning: null };
	}
	const jour = messes.find((m) => JOUR_RE.test(m.nom) && !EXCLUDE_RE.test(m.nom));
	if (jour) {
		return { messe: jour, warning: null };
	}
	const candidates = messes.filter((m) => !EXCLUDE_RE.test(m.nom));
	const chosen =
		candidates.length > 0 ? candidates[candidates.length - 1]! : messes[messes.length - 1]!;
	const names = messes.map((m) => m.nom).join(', ');
	return {
		messe: chosen,
		warning: `calendrier/aelf: "${slug}" has ${messes.length} messes (${names}) · none matched "jour" cleanly, chose "${chosen.nom}" heuristically`
	};
}
