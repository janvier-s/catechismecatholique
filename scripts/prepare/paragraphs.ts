import type { Paragraph } from '../../src/lib/data/types';
import { capitalizeFirstWord, mergeBibleRefContinuations } from './source-data-fixes';

interface RawNode {
	type: string;
	number?: number;
	text_html?: string;
	cross_refs?: string[];
	bible_refs?: { text: string }[];
	citations?: { text_html: string }[];
	refs?: { type: string; raw: string; idx?: string; doc_raw?: string }[];
	children?: RawNode[];
}

export function extractParagraphs(parts: RawNode[]): Map<number, Paragraph> {
	const out = new Map<number, Paragraph>();
	function walk(node: RawNode) {
		if (node.type === 'paragraph' && typeof node.number === 'number') {
			out.set(node.number, {
				corpus: 'ccc',
				number: node.number,
				text_html: capitalizeFirstWord(node.text_html ?? ''),
				cross_refs: node.cross_refs ?? [],
				bible_refs: mergeBibleRefContinuations(
					(node.bible_refs ?? []).map((b) => ({ text: b.text }))
				),
				citations: (node.citations ?? []).map((c) => ({ text_html: c.text_html })),
				magisterial_refs: (node.refs ?? []).map((r) => ({
					type: r.type as Paragraph['magisterial_refs'][number]['type'],
					raw: r.raw,
					idx: r.idx,
					doc_raw: r.doc_raw
				}))
			});
		}
		for (const c of node.children ?? []) walk(c);
	}
	for (const p of parts) walk(p);
	return out;
}
