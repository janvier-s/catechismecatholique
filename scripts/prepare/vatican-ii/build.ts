/**
 * Generic Vatican II EPUB → JSON builder.
 *
 * Vatican II EPUBs use the same DocBook XHTML shape as CDSE:
 *   - nested <section class="section" epub:type="..."> for the hierarchy
 *   - numbered paragraphs as <p>...<span class="numpara">N.</span>...</p>
 *   - footnotes inline (<a href="#ftn.XXX" class="footnote"><sup>[n]</sup></a>)
 *     defined as <div id="ftn.XXX" class="footnote">…</div>
 *
 * Each Vatican II doc is short enough (max ~93 paragraphs in Gaudium et Spes)
 * to render on a single page — we emit one shard per doc with all blocks +
 * footnotes inline. The CDSE-style per-chapter split is unnecessary here.
 */
import { slugify } from '../slug.ts';

export type VatIIBlock =
	| { kind: 'heading'; level: number; anchor: string; title: string }
	| { kind: 'paragraph'; n: number; anchor: string; html: string; footnoteRefs: number[] };

export interface VatIIFootnote {
	n: number;
	html: string;
}

export interface VatIIDocOutput {
	blocks: VatIIBlock[];
	footnotes: VatIIFootnote[];
	totalParagraphs: number;
}

interface SectionRange {
	start: number;
	end: number;
	openTag: string;
}

function plainText(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function extractSectionTitle(sectionHtml: string): string {
	const m = sectionHtml.match(/<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/i);
	return m ? plainText(m[1] ?? '') : '';
}

/**
 * Walk balanced <section> tags and return only top-level (depth-0) ranges
 * within the given scope.
 */
function findSections(html: string): SectionRange[] {
	const out: SectionRange[] = [];
	const re = /<section\b[^>]*>|<\/section>/g;
	const stack: { start: number; openTag: string }[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) {
		if (m[0].startsWith('</')) {
			const open = stack.pop();
			if (!open) continue;
			if (stack.length === 0) {
				out.push({ start: open.start, end: m.index + m[0].length, openTag: open.openTag });
			}
		} else {
			stack.push({ start: m.index, openTag: m[0] });
		}
	}
	return out;
}

function sliceInner(s: SectionRange, html: string): string {
	return html.substring(s.start + s.openTag.length, s.end - '</section>'.length);
}

/** Pull numbered paragraphs out of any HTML scope. */
function extractParagraphs(
	html: string
): { n: number; anchor: string; html: string; footnoteRefs: number[] }[] {
	const out: { n: number; anchor: string; html: string; footnoteRefs: number[] }[] = [];
	const re = /<p\b([^>]*)>([\s\S]*?<span\s+class="numpara">(\d+)\.<\/span>[\s\S]*?)<\/p>/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) {
		const attrs = m[1] ?? '';
		const inner = m[2] ?? '';
		const n = parseInt(m[3] ?? '0', 10);
		if (!Number.isFinite(n) || n === 0) continue;

		const idMatch = attrs.match(/\bid="([^"]+)"/);
		const anchor = idMatch ? idMatch[1]! : `p${n}`;

		let body = inner.replace(/<span\s+class="numpara">\d+\.<\/span>\s*/, '');
		const fnNums: number[] = [];
		body = body.replace(
			/<a[^>]*href="#ftn\.[^"]*"[^>]*class="footnote"[^>]*>[\s\S]*?<sup[^>]*>\s*\[(\d+)\]\s*<\/sup>[\s\S]*?<\/a>/g,
			(_full, num) => {
				const fn = parseInt(num, 10);
				if (Number.isFinite(fn)) fnNums.push(fn);
				return `<sup class="vat-ii-fn-ref" data-fn="${fn}">${fn}</sup>`;
			}
		);
		out.push({ n, anchor, html: `<p>${body.trim()}</p>`, footnoteRefs: fnNums });
	}
	return out;
}

/** Footnote bodies from the entire doc concatenation. */
function extractFootnotes(html: string): VatIIFootnote[] {
	const re = /<div\s+id="ftn\.([^"]+)"\s+class="footnote"[^>]*>([\s\S]*?)<\/div>/g;
	const out: VatIIFootnote[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) {
		const inner = m[2] ?? '';
		const numMatch = inner.match(/<sup[^>]*class="para"[^>]*>\s*\[(\d+)\]/);
		const n = numMatch ? parseInt(numMatch[1]!, 10) : 0;
		if (n === 0) continue;
		const body = inner
			.replace(
				/<p[^>]*>\s*<a[^>]*class="para"[^>]*>\s*<sup[^>]*>\s*\[\d+\][\s\u00a0]*<\/sup>\s*<\/a>/,
				'<p>'
			)
			.trim();
		out.push({ n, html: body });
	}
	return out;
}

/**
 * Recursively walk one or more concatenated <section> trees and emit
 * headings + paragraphs in document order. Heading "level" reflects the
 * nesting depth (the outermost section in a file is depth 1).
 */
export function buildVatIIDoc(args: { contentFiles: string[] }): VatIIDocOutput {
	const blocks: VatIIBlock[] = [];
	const takenAnchors = new Set<string>();

	function visit(scope: string, depth: number) {
		const subs = findSections(scope);
		if (subs.length === 0) {
			for (const p of extractParagraphs(scope)) {
				blocks.push({
					kind: 'paragraph',
					n: p.n,
					anchor: p.anchor,
					html: p.html,
					footnoteRefs: p.footnoteRefs
				});
			}
			return;
		}
		let cursor = 0;
		for (const sub of subs) {
			const pre = scope.substring(cursor, sub.start);
			for (const p of extractParagraphs(pre)) {
				blocks.push({
					kind: 'paragraph',
					n: p.n,
					anchor: p.anchor,
					html: p.html,
					footnoteRefs: p.footnoteRefs
				});
			}
			const inner = sliceInner(sub, scope);
			const title = extractSectionTitle(sub.openTag + inner + '</section>');
			const idMatch = sub.openTag.match(/\bid="([^"]+)"/);
			const baseAnchor = idMatch ? idMatch[1]! : `s-${slugify(title).slice(0, 40) || 'sec'}`;
			let anchor = baseAnchor;
			let i = 2;
			while (takenAnchors.has(anchor)) anchor = `${baseAnchor}-${i++}`;
			takenAnchors.add(anchor);
			if (title) blocks.push({ kind: 'heading', level: depth, anchor, title });
			visit(inner, depth + 1);
			cursor = sub.end;
		}
		const tail = scope.substring(cursor);
		for (const p of extractParagraphs(tail)) {
			blocks.push({
				kind: 'paragraph',
				n: p.n,
				anchor: p.anchor,
				html: p.html,
				footnoteRefs: p.footnoteRefs
			});
		}
	}

	const concatenated = args.contentFiles.join('\n');
	for (const file of args.contentFiles) visit(file, 1);

	const footnotes = extractFootnotes(concatenated);
	// Keep only footnotes actually referenced in the body so we don't
	// inflate the shard with dead entries.
	const used = new Set<number>();
	for (const b of blocks) if (b.kind === 'paragraph') for (const fn of b.footnoteRefs) used.add(fn);
	const filtered = footnotes.filter((f) => used.has(f.n)).sort((a, b) => a.n - b.n);

	const totalParagraphs = blocks.filter((b) => b.kind === 'paragraph').length;
	return { blocks, footnotes: filtered, totalParagraphs };
}
