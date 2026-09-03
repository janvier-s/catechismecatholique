import type { Paragraph } from '$lib/data/types';
import { stripHtml } from '$lib/utils/html';

/**
 * The fields every route serving a CEC paragraph shares. Both /api/cec routes
 * and the `texts` block build from here so the same paragraph can never come
 * back describing itself differently depending on which endpoint asked.
 */

export interface ApiCitation {
	text_html: string;
	/** The plain twin every *_html field in this API carries. */
	text: string;
}

export function apiCitations(p: Paragraph): ApiCitation[] {
	// Tolerates a shard without the field · one malformed file should cost its
	// quotations, not the whole paragraph, since the caller drops anything that
	// throws.
	return (p.citations ?? []).map((c) => ({
		text_html: c.text_html,
		text: stripHtml(c.text_html)
	}));
}

/**
 * The paragraph read as one passage: its own prose followed by each source it
 * quotes. Null when it quotes nothing · 2513 of 2865 paragraphs would
 * otherwise carry a second copy of `text` for no gain, and the key's absence
 * tells a client there is no quoted material.
 *
 * Blocks are joined with a blank line, the only way plain text can carry the
 * boundary the reader sees. There is deliberately no HTML counterpart:
 * concatenating the markup would flatten each quotation into a sibling span of
 * the paragraph's own prose, presenting a quoted source as the Catechism's own
 * words · an HTML client has `text_html` and `citations[].text_html` and can
 * wrap them as it renders them.
 */
export function textFull(p: Paragraph): string | null {
	const citations = p.citations ?? [];
	if (citations.length === 0) return null;
	return [stripHtml(p.text_html), ...citations.map((c) => stripHtml(c.text_html))].join('\n\n');
}
