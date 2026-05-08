const LIGATURE_MAP: Record<string, string> = {
	œ: 'oe',
	Œ: 'oe',
	æ: 'ae',
	Æ: 'ae'
};

export function slugify(input: string): string {
	let s = input;
	for (const [from, to] of Object.entries(LIGATURE_MAP)) {
		s = s.split(from).join(to);
	}
	s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
	s = s.toLowerCase();
	s = s.replace(/['’ʼ]/g, '');
	s = s.replace(/[^a-z0-9]+/g, '-');
	s = s.replace(/^-+|-+$/g, '');
	return s;
}

// Collision-aware: throws if a slug collides within its parent.
export function uniqueSlug(title: string, taken: Set<string>): string {
	const slug = slugify(title);
	if (taken.has(slug)) {
		throw new Error(`Slug collision: "${slug}" (from title "${title}")`);
	}
	taken.add(slug);
	return slug;
}

// Stop-words at the start of a French title that we drop for slug brevity.
// These are *only* matched at position 0; internal "de la" stays for sense.
const LEADING_STOP_WORDS = new Set([
	'a',
	'au',
	'aux',
	'd',
	'de',
	'des',
	'du',
	'en',
	'et',
	'l',
	'la',
	'le',
	'les',
	'à'
]);

/**
 * Slugify + drop leading French articles + truncate at a word boundary.
 * Used to keep route slugs short and readable.
 *
 *   shortSlug('La célébration du mystère chrétien', 30)
 *     → 'celebration-du-mystere-chretien'
 */
export function shortSlug(title: string, max: number): string {
	let raw = slugify(title);
	if (!raw) return '';
	// Handle French apostrophes that get collapsed by slugify.
	// e.g., "L'homme" → "lhomme" → strip the 'l' to get "homme".
	for (const word of ['lhomme', 'dhomme']) {
		if (raw.startsWith(word)) {
			raw = raw.slice(word[0]!.length); // Remove the article letter
			break;
		}
	}
	// Drop leading stop-words. We keep dropping while the first segment is
	// in the stop list AND there's at least one segment left.
	const parts = raw.split('-');
	while (parts.length > 1 && LEADING_STOP_WORDS.has(parts[0]!)) parts.shift();
	const trimmed = parts.join('-');
	if (trimmed.length <= max) return trimmed;
	// Truncate at the nearest hyphen boundary that fits within max.
	const cut = trimmed.lastIndexOf('-', max);
	if (cut > 0) return trimmed.slice(0, cut);
	// No boundary fits — hard cut.
	return trimmed.slice(0, max);
}

/**
 * Build a numbered slug like "2-credo" from the position-in-parent and the
 * title, registering it in `taken` and disambiguating with -2, -3 … on
 * collision. n=0 emits just the slug (used for special items like Prologue).
 */
export function numberedSlug(n: number, title: string, max: number, taken: Set<string>): string {
	const body = shortSlug(title, max);
	const prefix = n > 0 ? `${n}-` : '';
	let candidate = `${prefix}${body}`;
	if (!candidate) candidate = prefix.replace(/-$/, '') || `i${n}`;
	let suffix = 1;
	let final = candidate;
	while (taken.has(final)) {
		suffix++;
		final = `${candidate}-${suffix}`;
	}
	taken.add(final);
	return final;
}
