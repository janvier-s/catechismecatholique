/**
 * Inserts a non-breaking space before French high-punctuation marks
 * (:  ;  ?  !) and inside guillemets (« X / X ») in HTML text nodes.
 * Tags are passed through untouched.
 *
 * Guillemets always get a NBSP · even when the source had no whitespace
 * (e.g. when an inline cross-ref/footnote marker between the word and `»`
 * is hidden via CSS, eating the space the marker provided).
 */
const NBSP = ' ';
const WS_CLASS = '[ \\u00A0]';

export function frenchPunct(html: string): string {
	return html
		.split(/(<[^>]*>)/)
		.map((part, i) => {
			// Even indices are text nodes; odd indices are HTML tags.
			if (i % 2 !== 0) return part;
			return part
				.replace(new RegExp(`${WS_CLASS}*([;:?!])`, 'g'), `${NBSP}$1`)
				.replace(new RegExp(`«${WS_CLASS}*`, 'g'), `«${NBSP}`)
				.replace(new RegExp(`${WS_CLASS}*»`, 'g'), `${NBSP}»`);
		})
		.join('');
}
