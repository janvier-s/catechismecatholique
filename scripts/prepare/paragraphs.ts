import type { Paragraph } from '../../src/lib/data/types';
import {
	capitalizeFirstWord,
	groupConsecutiveBibleSups,
	mergeBibleRefContinuations,
	normalizeFrenchPunctuationSpacing,
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

/**
 * Citations attached to a paragraph (patristic/liturgical quotes shown
 * indented under the prose) re-use LOCAL data-idx counters ("1", "2", …)
 * for their inline sup markers — but the paragraph's `magisterial_refs`
 * is a single global sequence shared with the main text. The result is
 * markers like §2852's citation ending in `<sup data-idx="1">1</sup>
 * <sup data-idx="2">2</sup>` — which the runtime renderer maps back to
 * the FIRST two refs (Jn 8:44 / Ap 12:9) instead of the trailing two
 * (Rm 8:31 / saint Ambroise). The Ambroise marker disappears entirely
 * because it should be a `docRef` (letter idx) but is emitted as
 * `bibleRef`.
 *
 * Fix: walk citation sup markers in document order, pop the next
 * un-consumed entry from `magisterial_refs` (those whose idx isn't
 * already used by main `text_html`), and rewrite each sup with the
 * correct idx + class (`bibleRef` for type=bible, `docRef` for
 * everything else — patristic/liturgical/etc.).
 */
function reindexCitationSupMarkers(
	mainHtml: string,
	citations: { text_html: string }[],
	refs: Paragraph['magisterial_refs']
): { text_html: string }[] {
	if (citations.length === 0) return citations;
	const consumed = new Set<string>();
	for (const m of mainHtml.matchAll(/data-idx="([^"]+)"/g)) consumed.add(m[1]!);
	// Bible-ref clusters (groupConsecutiveBibleSups) fold trailing members into
	// a leader marker and strip their <sup> from mainHtml — so their idx never
	// shows up in `consumed` above even though they're already displayed via
	// the leader. Treat them as consumed too, or a citation sup steals one and
	// mislabels an unrelated verse as the citation's source (e.g. §618).
	const remaining = refs.filter(
		(r) =>
			!consumed.has(String(r.idx)) &&
			!(r.marker_idx !== undefined && consumed.has(String(r.marker_idx)))
	);
	if (remaining.length === 0) return citations;
	let cursor = 0;
	return citations.map((c) => {
		const newHtml = c.text_html.replace(
			/<sup class="srcRef \w+Ref" data-idx="[^"]+">[^<]*<\/sup>/g,
			() => {
				const r = remaining[cursor++];
				if (!r) return '';
				const cls = r.type === 'bible' ? 'bibleRef' : 'docRef';
				return `<sup class="srcRef ${cls}" data-idx="${r.idx}">${r.idx}</sup>`;
			}
		);
		return { text_html: newHtml };
	});
}

export function extractParagraphs(parts: RawNode[]): Map<number, Paragraph> {
	const out = new Map<number, Paragraph>();
	function walk(node: RawNode) {
		if (node.type === 'paragraph' && typeof node.number === 'number') {
			const cleaned = stripInlineDocCitations(
				capitalizeFirstWord(
					normalizeFrenchPunctuationSpacing(normalizeGuillemets(node.text_html ?? ''))
				)
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
				citations: reindexCitationSupMarkers(
					grouped.html,
					(node.citations ?? []).map((c) => ({
						text_html: normalizeFrenchPunctuationSpacing(normalizeGuillemets(c.text_html))
					})),
					grouped.refs
				),
				magisterial_refs: grouped.refs
			});
		}
		for (const c of node.children ?? []) walk(c);
	}
	for (const p of parts) walk(p);
	return out;
}
