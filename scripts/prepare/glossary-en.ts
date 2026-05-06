// Parser for the English Levada glossary that ships with the Ascension
// edition of the Catechism (DOCTRINA/sources/ccc_ascension/bm_glossary.xhtml).
//
// Each entry looks like:
//   <p id="ABORTION" class="Glossary-Entry">
//     <span class="NEW_BOLD">ABORTION:</span>
//     Deliberate termination of pregnancy by killing the unborn child… (2271-2272).
//   </p>
//
// Some entries continue across multiple paragraphs (no id on the continuation).
// Some end with "See X" cross-references.
import { parse } from 'parse5';

interface ParseNode {
	tagName?: string;
	nodeName: string;
	childNodes?: ParseNode[];
	attrs?: { name: string; value: string }[];
	value?: string;
}

export interface GlossaryEnEntry {
	id: string;
	term: string; // e.g. "Abortion"
	definition: string; // plain prose, no HTML
	refs: number[]; // CCC paragraph numbers extracted from "(N, N-N)"
	seeAlso: string[]; // referenced terms ("See SLOTH")
}

function attr(node: ParseNode, name: string): string | undefined {
	return node.attrs?.find((a) => a.name === name)?.value;
}
function hasClass(node: ParseNode, cls: string): boolean {
	return (attr(node, 'class') ?? '').split(/\s+/).includes(cls);
}
function* iter(node: ParseNode): Generator<ParseNode> {
	yield node;
	for (const c of node.childNodes ?? []) yield* iter(c);
}
function textOf(node: ParseNode): string {
	if (node.nodeName === '#text') return node.value ?? '';
	let s = '';
	for (const c of node.childNodes ?? []) s += textOf(c);
	return s;
}
function normalizeXhtml(xml: string): string {
	return xml.replace(
		/<(title|script|style|div|span|table|tr|td|th|p|a|b|i|u|em|strong)([^>]*)\/>/gi,
		'<$1$2></$1>'
	);
}

// "(2271-2272)" → [2271, 2272]; "(59, 72, 145, 705, 762, 2570)" → [59, 72, …];
// "(1424, 1442, 1449, 1453, 1480)" → all five
// We keep only true paragraph references — small numbers ≤ 2865 (CCC ends at 2865).
function extractRefs(text: string): number[] {
	const out = new Set<number>();
	// Match every parenthesised digit-group anywhere in the entry.
	const groups = text.matchAll(/\(([\d\s,–\-;cf.]+)\)/g);
	for (const g of groups) {
		const inner = g[1]!;
		// Tokens: 2271, 2271-2272, 2271–2272
		const tokens = inner.matchAll(/(\d+)(?:\s*[-–]\s*(\d+))?/g);
		for (const t of tokens) {
			const from = parseInt(t[1]!, 10);
			const to = t[2] ? parseInt(t[2], 10) : from;
			if (from < 1 || from > 2865 || to < 1 || to > 2865) continue;
			for (let n = from; n <= to; n++) out.add(n);
		}
	}
	return [...out].sort((a, b) => a - b);
}

// Strip trailing "(refs)" and "See X" tail; collapse whitespace; restore
// "ABORTION: …" → "Deliberate …" by removing the leading bold lemma.
function cleanDefinition(text: string, lemma: string): { definition: string; seeAlso: string[] } {
	let s = text.replace(/\s+/g, ' ').trim();
	// drop leading "LEMMA:"
	const lemmaRe = new RegExp(`^${lemma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*`, 'i');
	s = s.replace(lemmaRe, '');
	// extract "See X" / "See also X" cross-refs
	const seeAlso: string[] = [];
	s = s.replace(/\.?\s*See(?:\s+also)?\s+([A-Z][^.]*?)\.?\s*$/, (_m, names) => {
		for (const name of String(names).split(/\s*,\s*/)) {
			const t = name.trim().replace(/\.$/, '');
			if (t) seeAlso.push(t);
		}
		return '';
	});
	// trim trailing parenthesised refs (we already extracted them; keeping them
	// inline would clutter the French translation).
	s = s.replace(/\s*\([\d\s,–\-;cf.]+\)\.?\s*$/, '').trim();
	if (s && !/[.!?]$/.test(s)) s += '.';
	return { definition: s, seeAlso };
}

function titleCase(lemma: string): string {
	// "APOSTLES’ CREED" → "Apostles' Creed"; "ABRAHAM" → "Abraham"
	return lemma
		.toLowerCase()
		.replace(/’/g, "'")
		.replace(/(^|[\s'’\-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function parseGlossaryEn(xml: string): GlossaryEnEntry[] {
	const doc = parse(normalizeXhtml(xml)) as unknown as ParseNode;
	const out: GlossaryEnEntry[] = [];
	let current: GlossaryEnEntry | null = null;

	for (const node of iter(doc)) {
		if (node.tagName !== 'p' || !hasClass(node, 'Glossary-Entry')) continue;
		const id = attr(node, 'id');
		const text = textOf(node);
		// Skip the empty "A B C D" letter-link rows
		if (/^[A-Z](?:\s+[A-Z])+\s*$/.test(text.trim())) continue;

		if (id) {
			// New entry. Lemma = bold span text, ending in ":"
			const boldNode = [...iter(node)].find((n) => n.tagName === 'span' && hasClass(n, 'NEW_BOLD'));
			if (!boldNode) continue;
			const rawLemma = textOf(boldNode).replace(/:\s*$/, '').trim();
			if (!rawLemma) continue;
			if (current) out.push(current);
			const refs = extractRefs(text);
			const { definition, seeAlso } = cleanDefinition(text, rawLemma);
			current = {
				id,
				term: titleCase(rawLemma),
				definition,
				refs,
				seeAlso
			};
		} else if (current) {
			// Continuation of the previous entry.
			const refs = extractRefs(text);
			const { definition: extraDef, seeAlso: extraSee } = cleanDefinition(text, current.term);
			current.definition = (current.definition + ' ' + extraDef).trim();
			current.refs = [...new Set([...current.refs, ...refs])].sort((a, b) => a - b);
			current.seeAlso = [...current.seeAlso, ...extraSee];
		}
	}
	if (current) out.push(current);
	return out;
}
