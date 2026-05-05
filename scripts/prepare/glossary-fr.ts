// Parser for the French index thématique that ships with the 1998 edition of
// the Catéchisme de l'Église Catholique
// (DOCTRINA/sources/CCC/thematic_cross-refs/index_thematique/indexThem_*.xhtml).
//
// Each file holds one or more letters. Structure per letter:
//   <div class="level1">
//     <h1 class="level1_title">A</h1>
//     <div class="level2">
//       <p class="level2_para">
//         <span class="typo_smallcaps">ABAISSEMENT DE JÉSUS (HUMILIATIO)</span> :
//         <a class="renvois_source">272</a>, <a>472</a>, <a>520</a>.
//       </p>
//       <p class="level2_para">
//         <span class="typo_smallcaps">ABANDON (RELICTIO)</span>
//       </p>
//       <div class="level3">
//         <p class="level3_para">
//           Abandon à la providence : <a>305</a>, <a>322</a>, <a>2115</a>.
//         </p>
//         …
//       </div>
//     </div>
//   </div>
//
// The headword may be followed by inline refs OR by a level3 block of
// thematic sub-entries (or both).
import { parse } from 'parse5';

interface ParseNode {
	tagName?: string;
	nodeName: string;
	childNodes?: ParseNode[];
	attrs?: { name: string; value: string }[];
	value?: string;
}

export interface GlossaryFrSubEntry {
	label: string; // e.g. "Abandon à la providence"
	refs: number[];
}

export interface GlossaryFrEntry {
	letter: string; // first letter of the head-word (used for letter-jump UI)
	term: string; // human display, e.g. "Abandon"
	latin?: string; // parenthesised Latin equivalent, if any
	directRefs: number[]; // refs attached to the headword line itself
	subEntries: GlossaryFrSubEntry[];
	seeAlso: string[]; // cross-refs to other head-words ("Voir : Consécration, Sacrement")
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
		/<(title|script|style|div|span|table|tr|td|th|p|a|b|i|u|em|strong|h1|h2|h3)([^>]*)\/>/gi,
		'<$1$2></$1>'
	);
}

// Pull every <a class="renvois_source"> number out of the subtree.
//
// Important: the printed source uses two-digit shorthand for the second end
// of a range — "1373-75" means §§1373-1375, not §1373 + §75. The visible text
// is the shorthand; the FULL paragraph number is encoded in the href as
// "#renvlnk_p1375". Extract from the href.
//
// Also detect ranges: when two consecutive <a> tags are separated by "-" or
// "–" in the surrounding text, expand to every paragraph in between.
function refIdFromAnchor(node: ParseNode): number | null {
	const href = node.attrs?.find((a) => a.name === 'href')?.value ?? '';
	const id = node.attrs?.find((a) => a.name === 'id')?.value ?? '';
	const m = href.match(/_p(\d+)/) ?? id.match(/p(\d+)/);
	if (!m) return null;
	const n = parseInt(m[1]!, 10);
	if (!Number.isFinite(n) || n < 1 || n > 2865) return null;
	return n;
}

function extractRefs(node: ParseNode): number[] {
	// Walk in document order, tracking each ref anchor and the inter-anchor
	// text. When two anchors are separated by "-" / "–", expand to a range.
	// Don't recurse into anchors themselves: their inner text is the (often
	// shorthand) label and would shadow the hyphen between anchors.
	const tokens: ({ kind: 'anchor'; n: number } | { kind: 'text'; v: string })[] = [];
	function walk(n: ParseNode) {
		if (n.tagName === 'a' && hasClass(n, 'renvois_source')) {
			const num = refIdFromAnchor(n);
			if (num !== null) tokens.push({ kind: 'anchor', n: num });
			return;
		}
		if (n.nodeName === '#text') {
			tokens.push({ kind: 'text', v: n.value ?? '' });
			return;
		}
		for (const c of n.childNodes ?? []) walk(c);
	}
	walk(node);
	const refs = new Set<number>();
	for (let i = 0; i < tokens.length; i++) {
		const t = tokens[i]!;
		if (t.kind !== 'anchor') continue;
		refs.add(t.n);
		// Look ahead: next non-empty token. If it's a "-" / "–" text, the
		// anchor after it is the end of a range.
		let j = i + 1;
		while (j < tokens.length && tokens[j]!.kind === 'text' && /^\s*$/.test(tokens[j]!.v)) j++;
		if (j < tokens.length && tokens[j]!.kind === 'text' && /^\s*[-–]\s*$/.test(tokens[j]!.v)) {
			let k = j + 1;
			while (k < tokens.length && tokens[k]!.kind === 'text' && /^\s*$/.test(tokens[k]!.v)) k++;
			const end = tokens[k];
			if (end && end.kind === 'anchor' && end.n > t.n) {
				for (let p = t.n + 1; p <= end.n; p++) refs.add(p);
				i = k; // consume the range
			}
		}
	}
	return [...refs].sort((a, b) => a - b);
}

// French inflection markers used after a head-word: «(s)», «(e)», «(se)»,
// «(s/e)». These are NOT Latin glosses and must stay attached to the term.
const INFLECTION_RE = /^(s|e|se|s\/e|s\/se|le)$/i;

// Restore Latin ligatures: `ae`/`oe` → `æ`/`œ` (preserving case).
function ligateLatin(s: string): string {
	return s
		.replace(/AE/g, 'Æ')
		.replace(/Ae/g, 'Æ')
		.replace(/ae/g, 'æ')
		.replace(/OE/g, 'Œ')
		.replace(/Oe/g, 'Œ')
		.replace(/oe/g, 'œ');
}

// Apply Latin ligatures only to text inside `(…)` so French outside the parens
// (e.g. "coexistant") stays untouched.
function ligateInsideParens(s: string): string {
	return s.replace(/\(([^)]+)\)/g, (_, inner) => '(' + ligateLatin(inner) + ')');
}

// Tighten extra whitespace inside parentheses (`( foedus vetus )` →
// `(foedus vetus)`) and drop a trailing period that sometimes follows the
// closing paren on title-only entries.
function cleanParens(s: string): string {
	return s
		.replace(/\(\s+([^)]*?)\s+\)/g, '($1)')
		.replace(/\(\s+([^)]+?)\)/g, '($1)')
		.replace(/\(([^)]+?)\s+\)/g, '($1)')
		.replace(/\)\s*\.\s*$/, ')');
}

// "ABAISSEMENT DE JÉSUS ( HUMILIATIO )" → { term: "Abaissement de Jésus", latin: "Humiliatio" }
// "ANGE(S)" → { term: "Ange(s)" } — inflection marker stays on the term.
function splitTermAndLatin(raw: string): { term: string; latin?: string } {
	const cleaned = cleanParens(raw.replace(/\s+/g, ' ').trim());
	const m = cleaned.match(/^(.*?)\s*\(\s*([^)]+?)\s*\)\s*$/);
	if (!m) return { term: ligateInsideParens(titleCaseFrench(cleaned)) };
	if (INFLECTION_RE.test(m[2]!.trim())) {
		return { term: titleCaseFrench(cleaned) };
	}
	return { term: titleCaseFrench(m[1]!.trim()), latin: titleCaseLatin(m[2]!.trim()) };
}

// Proper nouns whose canonical capitalization we restore wherever they appear.
// Patterns are matched case-insensitively so this works on both lowercased
// head-words and source-cased subentry labels. Order from longest to shortest
// so multi-word phrases ("Esprit Saint") don't get partially overwritten by
// later single-word rules.
const PROPER_NOUNS: ReadonlyArray<[RegExp, string]> = [
	[/\btrès\s+sainte\s+trinité\b/giu, 'Très Sainte Trinité'],
	[/\bnouveau\s+testament\b/giu, 'Nouveau Testament'],
	[/\bancien\s+testament\b/giu, 'Ancien Testament'],
	[/\besprit\s+saint\b/giu, 'Esprit Saint'],
	// Persons / divine names
	[/\byhwh\b/giu, 'YHWH'],
	[/\bjésus\b/giu, 'Jésus'],
	[/\bjesus\b/giu, 'Jésus'],
	[/\bdieu\b/giu, 'Dieu'],
	[/\bchrist\b/giu, 'Christ'],
	[/\bmarie\b/giu, 'Marie'],
	// Institutions / scriptures
	[/\béglise\b/giu, 'Église'],
	[/\beglise\b/giu, 'Église'],
	[/\bbible\b/giu, 'Bible'],
	// Place names
	[/\bjérusalem\b/giu, 'Jérusalem'],
	[/\bbethléem\b/giu, 'Bethléem'],
	[/\bnazareth\b/giu, 'Nazareth'],
	[/\bgalilée\b/giu, 'Galilée'],
	[/\bsinaï\b/giu, 'Sinaï'],
	[/\bégypte\b/giu, 'Égypte'],
	[/\bbabylone\b/giu, 'Babylone'],
	[/\bcapharnaüm\b/giu, 'Capharnaüm'],
	[/\brome\b/giu, 'Rome'],
	[/\bisraël\b/giu, 'Israël'],
	[/\bisrael\b/giu, 'Israël'],
	// Liturgical / feasts
	[/\bannonciation\b/giu, 'Annonciation'],
	[/\bmagnificat\b/giu, 'Magnificat'],
	[/\bvisitation\b/giu, 'Visitation'],
	[/\bavent\b/giu, 'Avent'],
	[/\bpentecôte\b/giu, 'Pentecôte'],
	[/\bcarême\b/giu, 'Carême'],
	[/\bpâques\b/giu, 'Pâques'],
	[/\bpâque\b/giu, 'Pâque']
];

function capitalizeProperNouns(s: string): string {
	let out = s;
	for (const [re, replacement] of PROPER_NOUNS) out = out.replace(re, replacement);
	return out;
}

// Source uses ALL CAPS for the headword. Render as initial-cap with the rest
// lowercase, but preserve interior casing of proper nouns we know about.
function titleCaseFrench(s: string): string {
	const lower = capitalizeProperNouns(s.toLowerCase());
	return lower.charAt(0).toUpperCase() + lower.slice(1);
}
function titleCaseLatin(s: string): string {
	const lower = s.toLowerCase().replace(/\s+/g, ' ').trim();
	const cap = lower.charAt(0).toUpperCase() + lower.slice(1);
	return ligateLatin(cap);
}

// "Abandon à la providence : 305, 322, 2115."
//   → { label: "Abandon à la providence", refs: [305, 322, 2115] }
function parseSubEntry(node: ParseNode): GlossaryFrSubEntry | null {
	const fullText = textOf(node).replace(/\s+/g, ' ').trim();
	if (!fullText) return null;
	const refs = extractRefs(node);
	// Source labels usually end with ": <refs>" but some end with ", <refs>"
	// when the prose itself closes on a quoted phrase or proper noun
	// (e.g. Abba's `« Abba Père », 683, 742, 1303, ...`). Strip either form.
	const beforeRefs = fullText.replace(/\s*[,:]\s*\d[\s\d,;.\-–]*\.?$/, '').trim();
	const stripped = beforeRefs.replace(/[.,;:]\s*$/, '').trim();
	if (!stripped) return null;
	return { label: ligateInsideParens(capitalizeProperNouns(cleanParens(stripped))), refs };
}

// "Voir : Consécration, Sacrement(s), Transsubstantiation" — a cross-ref
// sub-entry (no paragraph refs of its own; just a list of other head-words).
const SEE_ALSO_RE = /^Voir\s*:\s*(.+?)\.?$/i;
function parseSeeAlso(text: string): string[] | null {
	const m = text.match(SEE_ALSO_RE);
	if (!m) return null;
	return m[1]!
		.split(/\s*,\s*/)
		.map((s) => s.trim().replace(/[.,;:]\s*$/, ''))
		.filter(Boolean);
}

function letterFor(term: string): string {
	const stripped = term
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toUpperCase();
	const m = stripped.match(/[A-Z]/);
	return m ? m[0] : '?';
}

export function parseGlossaryFr(xmlByFile: Map<string, string>): GlossaryFrEntry[] {
	const out: GlossaryFrEntry[] = [];
	// Sort filenames so the output order matches the alphabet.
	const filenames = [...xmlByFile.keys()].sort();
	for (const filename of filenames) {
		const xml = xmlByFile.get(filename)!;
		const doc = parse(normalizeXhtml(xml)) as unknown as ParseNode;

		// Walk linearly: every level2_para is a head-word; the next level3
		// block (if its parent is the same level2 div) belongs to that head-word.
		const allNodes = [...iter(doc)];
		for (let i = 0; i < allNodes.length; i++) {
			const n = allNodes[i]!;
			if (n.tagName !== 'p' || !hasClass(n, 'level2_para')) continue;

			// Headword text is the FIRST typo_smallcaps span in the paragraph.
			const head = [...iter(n)].find(
				(x) => x.tagName === 'span' && hasClass(x, 'typo_smallcaps')
			);
			if (!head) continue;
			const rawTerm = textOf(head).replace(/\s+/g, ' ').trim();
			if (!rawTerm) continue;
			const { term, latin } = splitTermAndLatin(rawTerm);

			// Direct refs = any <a class="renvois_source"> inside the level2_para
			// itself (i.e. on the headword line).
			const directRefs = extractRefs(n);

			// Some headwords are pure redirects: "UN. VOIR : DIEU" with no
			// level3 block. Pick those up from the level2_para text itself.
			const headInlineSeeAlso: string[] = [];
			const lineText = textOf(n).replace(/\s+/g, ' ').trim();
			// Strip the head-word part to keep only what follows ". VOIR : …".
			const afterHead = lineText.replace(rawTerm, '').trim();
			const seeMatch = afterHead.match(/^[\s.,;:]*Voir(?:\s+les\s+\w+)?\s*[:.]?\s*(.+?)\.?$/i);
			if (seeMatch) {
				const targets = seeMatch[1]!
					.split(/\s*[,;]\s*|\s*:\s*/)
					.map((s) => s.replace(/[.,;:]\s*$/, '').trim())
					.filter((s) => s && !/^voir/i.test(s));
				headInlineSeeAlso.push(...targets);
			}

			// Find sibling level3 blocks until the next level2_para. Sub-entries
			// of the form "Voir : X, Y, Z" are pulled into seeAlso instead.
			const subEntries: GlossaryFrSubEntry[] = [];
			const seeAlso: string[] = [];
			for (let j = i + 1; j < allNodes.length; j++) {
				const m = allNodes[j]!;
				if (m.tagName === 'p' && hasClass(m, 'level2_para')) break;
				if (m.tagName === 'div' && hasClass(m, 'level3')) {
					for (const child of m.childNodes ?? []) {
						if (child.tagName === 'p' && hasClass(child, 'level3_para')) {
							const txt = textOf(child).replace(/\s+/g, ' ').trim();
							const sa = parseSeeAlso(txt);
							if (sa) {
								seeAlso.push(...sa);
								continue;
							}
							const sub = parseSubEntry(child);
							if (sub) subEntries.push(sub);
						}
					}
				}
			}

			out.push({
				letter: letterFor(term),
				term,
				latin,
				directRefs,
				subEntries,
				seeAlso: [...headInlineSeeAlso, ...seeAlso]
			});
		}
	}
	return out;
}
