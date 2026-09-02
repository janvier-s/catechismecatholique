/**
 * A psalm or cantique reading names its book in its `type`, not in its `ref`
 * ("79 (80), 2ac.3bc, 15-16a, 18-19"), which `parseAelfRef` cannot resolve on
 * its own. Restore the implied book so the ref parses like any other.
 *
 * Only these two types, and only when the ref opens on a digit that is not
 * already followed by a book abbreviation: "2 S 7, 4-5a" also opens on a digit
 * but that digit belongs to the book's name.
 */
export function normalizeReadingRef(ref: string, type: string): string {
	if (type !== 'psaume' && type !== 'cantique') return ref;
	const trimmed = ref.trim();
	if (!/^\d/.test(trimmed)) return ref;
	// "2 S 7, ..." · a digit, then a letter word before the chapter number.
	if (/^\d\s+[A-Za-zÀ-ÿ]/.test(trimmed)) return ref;
	return `Ps ${trimmed}`;
}
