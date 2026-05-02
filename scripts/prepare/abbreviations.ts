import { parse } from 'parse5';
import type { AbbreviationMap } from '../../src/lib/data/types';

interface ParseNode {
	tagName?: string;
	nodeName: string;
	childNodes?: ParseNode[];
	value?: string;
}

function* iterate(node: ParseNode): Generator<ParseNode> {
	yield node;
	for (const child of node.childNodes ?? []) yield* iterate(child as ParseNode);
}

function textOf(node: ParseNode): string {
	if (node.nodeName === '#text') return (node.value ?? '').trim();
	let s = '';
	for (const c of node.childNodes ?? []) s += textOf(c as ParseNode);
	return s.trim();
}

// HTML5 parsers (parse5) do not honor self-closing syntax on non-void elements
// like <title/>. The XHTML source uses self-closing tags that swallow the rest
// of the document as text. Expand them so parse5 sees explicit close tags.
function normalizeXhtml(xml: string): string {
	const nonVoid =
		/<(title|script|style|div|span|table|tbody|thead|tr|td|th|p|a|b|i|u|em|strong)([^>]*)\/>/gi;
	return xml.replace(nonVoid, '<$1$2></$1>');
}

export function parseSigles(xml: string): AbbreviationMap {
	const doc = parse(normalizeXhtml(xml)) as unknown as ParseNode;
	const out: AbbreviationMap = {};
	for (const n of iterate(doc)) {
		if (n.tagName === 'tr') {
			const tds = (n.childNodes ?? []).filter(
				(c) => (c as ParseNode).tagName === 'td'
			) as ParseNode[];
			if (tds.length >= 2) {
				const abbr = textOf(tds[0]!);
				const expansion = textOf(tds[1]!);
				if (abbr && expansion) out[abbr] = expansion;
			}
		}
	}
	return out;
}
