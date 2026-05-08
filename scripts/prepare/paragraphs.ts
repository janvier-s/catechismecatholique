import type { Paragraph } from '../../src/lib/data/types';
import {
	capitalizeFirstWord,
	groupConsecutiveBibleSups,
	mergeBibleRefContinuations,
	normalizeGuillemets
} from './source-data-fixes';

interface RawNode {
	type: string;
	number?: number;
	text_html?: string;
	cross_refs?: string[];
	bible_refs?: { text: string }[];
	citations?: { text_html: string }[];
	refs?: { type: string; raw: string; idx?: string | number; doc_raw?: string }[];
	children?: RawNode[];
}

/**
 * Strip inline source-citation prefixes that wrap a `srcRef` sup marker
 * — patterns like `(Symbolum « Quicumque » <sup class="srcRef docRef">a
 * </sup>)`. The doc reference is already captured in `magisterial_refs`
 * and rendered via the sup marker; the parenthetical source name was
 * leaking duplicate metadata into the prose. Bible refs (`bibleRef`) are
 * left alone because the user expects to see e.g. `(Mt 5, 14)` inline.
 *
 * We also handle malformed sources where the close paren is missing
 * (e.g. §266's `(Symbolum « Quicumque » <sup>a</sup>.`) by making the
 * trailing `)` optional. Conservative: only matches when there are no
 * nested parens between the opening `(` and the sup.
 */
function stripInlineDocCitations(html: string): string {
	return html.replace(
		/\s*\(\s*[^()]*?\s*(<sup class="[^"]*\bsrcRef\b[^"]*"[^>]*>[^<]*<\/sup>)\s*\)?/g,
		' $1'
	);
}

export function extractParagraphs(parts: RawNode[]): Map<number, Paragraph> {
	const out = new Map<number, Paragraph>();
	function walk(node: RawNode) {
		if (node.type === 'paragraph' && typeof node.number === 'number') {
			const cleaned = stripInlineDocCitations(
				capitalizeFirstWord(normalizeGuillemets(node.text_html ?? ''))
			);
			const initialRefs = (node.refs ?? []).map((r) => ({
				type: r.type as Paragraph['magisterial_refs'][number]['type'],
				raw: r.raw,
				idx: r.idx,
				doc_raw: r.doc_raw
			}));
			const grouped = groupConsecutiveBibleSups({ html: cleaned, refs: initialRefs });
			out.set(node.number, {
				corpus: 'ccc',
				number: node.number,
				text_html: grouped.html,
				cross_refs: node.cross_refs ?? [],
				bible_refs: mergeBibleRefContinuations(
					(node.bible_refs ?? []).map((b) => ({ text: b.text }))
				),
				citations: (node.citations ?? []).map((c) => ({ text_html: c.text_html })),
				magisterial_refs: grouped.refs
			});
		}
		for (const c of node.children ?? []) walk(c);
	}
	for (const p of parts) walk(p);
	return out;
}
