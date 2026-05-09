/**
 * Inserts a non-breaking space before French high-punctuation marks
 * (:  ;  ?  !) in HTML text nodes. Tags are passed through untouched.
 */
export function frenchPunct(html: string): string {
	return html
		.split(/(<[^>]*>)/)
		.map((part, i) =>
			// Even indices are text nodes; odd indices are HTML tags.
			i % 2 === 0 ? part.replace(/ *([;:?!])/g, ' $1') : part
		)
		.join('');
}
