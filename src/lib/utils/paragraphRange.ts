import type { ParagraphRange } from '$lib/data/types';

/**
 * Render a CCC paragraph range as bare numbers, e.g. "26 – 49", or "27" for a
 * single paragraph. Deliberately no § / §§ prefix: these read as table-of-
 * contents locators, and in a right-aligned column the symbol is noise.
 *
 * Shared by the Panorama cards and the sidebar rail so the two never drift.
 */
export function fmtParagraphRange(r: ParagraphRange | undefined): string {
	if (!r) return '';
	return r.from === r.to ? `${r.from}` : `${r.from} – ${r.to}`;
}
