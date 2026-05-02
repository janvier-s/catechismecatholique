import { parse } from 'parse5';

interface ParseNode {
	tagName?: string;
	nodeName: string;
	childNodes?: ParseNode[];
	value?: string;
	attrs?: { name: string; value: string }[];
}

function* iterate(node: ParseNode): Generator<ParseNode> {
	yield node;
	for (const c of node.childNodes ?? []) yield* iterate(c as ParseNode);
}

function textOf(n: ParseNode): string {
	if (n.nodeName === '#text') return (n.value ?? '').replace(/\s+/g, ' ').trim();
	let s = '';
	for (const c of n.childNodes ?? []) s += ' ' + textOf(c as ParseNode);
	return s.replace(/\s+/g, ' ').trim();
}

// HTML5 parsers (parse5) do not honor self-closing syntax on non-void elements
// like <title/>. The XHTML source uses self-closing tags that swallow the rest
// of the document as text. Expand them so parse5 sees explicit close tags.
function normalizeXhtml(xml: string): string {
	const nonVoid =
		/<(title|script|style|div|span|table|tbody|thead|tr|td|th|p|a|b|i|u|em|strong|h1|h2|h3|sup)([^>]*)\/>/gi;
	return xml.replace(nonVoid, '<$1$2></$1>');
}

export interface SourceEntry {
	category: string;
	doc_name: string;
	location: string;
	paragraphs: number[];
}

export function parseSourceTable(xml: string): SourceEntry[] {
	const doc = parse(normalizeXhtml(xml)) as unknown as ParseNode;
	const out: SourceEntry[] = [];
	let category = '';
	for (const n of iterate(doc)) {
		if (n.tagName === 'h1') {
			const t = textOf(n);
			if (t) category = t;
		}
		if (n.tagName === 'tr') {
			const cells = (n.childNodes ?? []).filter(
				(c) => (c as ParseNode).tagName === 'td'
			) as ParseNode[];
			if (cells.length < 2) continue;
			const docName = textOf(cells[0]!);
			const location = cells.length > 2 ? textOf(cells[1]!) : '';
			const last = textOf(cells[cells.length - 1]!);
			const paragraphs = (last.match(/\b\d+\b/g) ?? [])
				.map((s) => parseInt(s, 10))
				.filter((n) => Number.isFinite(n));
			if (docName && paragraphs.length > 0) {
				out.push({ category, doc_name: docName, location, paragraphs });
			}
		}
	}
	return out;
}
