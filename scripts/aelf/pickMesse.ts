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
 * Some dates (Noël: veille/nuit/aurore/jour) offer more than one Mass, but
 * the curated data has only one entry for such feasts. Prefer "Messe du
 * jour" when there's a choice, since it's the main day Mass most commonly
 * referenced; fall back to the first entry with a warning otherwise, so an
 * unexpected AELF naming change is visible rather than silently picking
 * something unreviewed.
 */
export function pickMesse(messes: AelfMesse[], slug: string): PickMesseResult {
	if (messes.length === 0) {
		throw new Error(`calendrier/aelf: AELF returned no messes for "${slug}"`);
	}
	if (messes.length === 1) {
		return { messe: messes[0]!, warning: null };
	}
	const jour = messes.find((m) => m.nom === 'Messe du jour');
	if (jour) {
		return { messe: jour, warning: null };
	}
	const names = messes.map((m) => m.nom).join(', ');
	return {
		messe: messes[0]!,
		warning: `calendrier/aelf: "${slug}" has ${messes.length} messes (${names}), none named "Messe du jour" · using the first one`
	};
}
