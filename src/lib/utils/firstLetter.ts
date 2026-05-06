/**
 * Bucket a glossary term under a single A-Z letter.
 *
 * Strips leading non-letter characters (so `« aujourd'hui »` buckets under A),
 * folds diacritics, and maps French ligatures to their dominant base letter
 * (Œ/œ → O, Æ/æ → A). Falls back to `#` for the rare term that begins with no
 * Latin letter at all.
 */
export function firstLetter(term: string): string {
	const stripped = term.replace(/^[^\p{L}]+/u, '');
	if (!stripped) return '#';
	let first = stripped.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();
	if (first === 'Œ') first = 'O';
	if (first === 'Æ') first = 'A';
	return /[A-Z]/.test(first) ? first : '#';
}

/**
 * Sort key for alphabetic ordering within a letter bucket. Drops leading
 * non-letter characters so `« aujourd'hui »` collates next to other `au-`
 * entries instead of at the head of the section.
 */
export function sortKey(term: string): string {
	return term.replace(/^[^\p{L}]+/u, '');
}
