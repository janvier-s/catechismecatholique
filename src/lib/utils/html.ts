/**
 * Collapse a paragraph's text_html down to plain prose: drops footnote/ref
 * markers entirely (their content is a bare index letter/number, not text)
 * rather than just stripping the tag, then removes remaining markup.
 *
 * The Catechism writes a space before its note markers, and tags become a
 * space, so both leave a gap once removed · without the last two passes two
 * paragraphs in three read "pour son fils ." Only the punctuation that takes
 * no space before it in French is closed up: the space before ; : ! ? and »
 * is correct and must survive.
 */
export function stripHtml(s: string): string {
	return s
		.replace(/<sup[^>]*>[^<]*<\/sup>/g, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.replace(/\s+([.,)])/g, '$1')
		.replace(/\(\s+/g, '(')
		.trim();
}
