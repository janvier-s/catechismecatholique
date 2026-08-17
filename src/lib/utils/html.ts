/**
 * Collapse a paragraph's text_html down to plain prose: drops footnote/ref
 * markers entirely (their content is a bare index letter/number, not text)
 * rather than just stripping the tag, then removes remaining markup.
 */
export function stripHtml(s: string): string {
	return s
		.replace(/<sup[^>]*>[^<]*<\/sup>/g, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}
