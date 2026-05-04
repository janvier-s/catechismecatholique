/**
 * French pluralization helper.
 *
 * Returns the singular form when n === 1, otherwise appends an 's' to form
 * the plural. Designed for the simple French case where the plural is just
 * `singular + 's'` (paragraphe → paragraphes, renvoi → renvois, citation →
 * citations). For irregular plurals, write the form inline instead.
 *
 * @example
 * pluralFr(1, 'paragraphe') // 'paragraphe'
 * pluralFr(3, 'paragraphe') // 'paragraphes'
 */
export function pluralFr(n: number, singular: string): string {
	return n === 1 ? singular : `${singular}s`;
}
