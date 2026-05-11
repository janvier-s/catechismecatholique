/**
 * Generic Vatican II EPUB → JSON builder.
 *
 * Source structure (per vatican.va canonical numbering):
 *  - Each §N is a section with: an optional bold title, plus 0+ prose
 *    paragraphs as its body. The EPUB inconsistently encodes the title
 *    either INSIDE the numpara <p> (style A) or in a SEPARATE bold <p>
 *    immediately before the numpara <p> (style B, SC §1 "Préambule").
 *  - Numbered paragraphs are introduced by <span class="numpara">N.</span>.
 *  - Standalone bold-only <p>s between numparas are chapter/section
 *    dividers (e.g. "CHAPITRE PREMIER", "I. Nature de la liturgie…").
 *  - The outermost <section> in each file carries the doc-title page
 *    salutation; we drop the first heading we produce.
 */
import { slugify } from '../slug.ts';

export type VatIIBlock =
	| { kind: 'heading'; level: number; anchor: string; title: string }
	| {
			kind: 'paragraph';
			n: number;
			anchor: string;
			title?: string;
			html: string;
			footnoteRefs: number[];
	  };

export interface VatIIFootnote {
	n: number;
	html: string;
}

export interface VatIITocEntry {
	level: number;
	anchor: string;
	title: string;
	n?: number;
}

export interface VatIIDocOutput {
	blocks: VatIIBlock[];
	footnotes: VatIIFootnote[];
	toc: VatIITocEntry[];
	totalParagraphs: number;
}

interface SectionRange {
	start: number;
	end: number;
	openTag: string;
}

function plainText(html: string): string {
	return html
		.replace(/<br\b[^>]*\/?>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

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

function extractSectionTitle(sectionHtml: string): string {
	const m = sectionHtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
	return m ? plainText(m[1] ?? '') : '';
}

function collectParagraphs(scope: string): string[] {
	const out: string[] = [];
	const re = /<p\b[^>]*>((?:(?!<\/?p\b)[\s\S])*?)<\/p>/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(scope))) out.push(m[1] ?? '');
	return out;
}

/**
 * Extract a paragraph's canonical number marker. Normally tagged
 * <span class="numpara">N.</span>, but in some paragraphs (e.g. SC §13,
 * §14, §18, §26, §40) the marker is encoded as a leading nested-bold-strong
 * "<emphasis><em><bold><strong>N.</strong>". We try both forms.
 */
function detectNumpara(body: string): { n: number; markup: string } | null {
	const m1 = body.match(/<span\s+class="numpara">(\d+)\.<\/span>\s*/);
	if (m1) return { n: parseInt(m1[1]!, 10), markup: m1[0] };
	const m2 = body.match(
		/^\s*<span[^>]*class="emphasis"[^>]*><em><span[^>]*class="bold"[^>]*><strong>(\d+)\.<\/strong><\/span><\/em><\/span>\s*/
	);
	if (m2) return { n: parseInt(m2[1]!, 10), markup: m2[0] };
	return null;
}

function detectTitle(body: string): string | null {
	const np = detectNumpara(body);
	let core = np ? body.substring(np.markup.length) : body;
	core = core.replace(/<span\s+class="numpara">\d+\.<\/span>\s*/, '');
	core = core.replace(/<a[^>]*class="footnote"[^>]*>[\s\S]*?<\/a>/g, '');
	const hadBoldWrappers =
		/<(?:strong|b|em|i)\b/.test(core) || /<span\s+class="(?:bold|emphasis)"/.test(core);
	if (!hadBoldWrappers) return null;
	const stripped = core
		.replace(/<\/?strong\b[^>]*>/g, '')
		.replace(/<\/?em\b[^>]*>/g, '')
		.replace(/<\/?b\b[^>]*>/g, '')
		.replace(/<\/?i\b[^>]*>/g, '')
		.replace(/<span\s+class="(?:bold|emphasis)"[^>]*>/g, '')
		.replace(/<\/span>/g, '')
		.replace(/<br\b[^>]*\/?>/g, ' ');
	if (/<[a-z]/i.test(stripped)) return null;
	const text = stripped
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	if (text.length < 3 || text.length > 280) return null;
	return text.replace(/\s{2,}/g, ' ').trim();
}

function rewriteFootnoteRefs(body: string): { html: string; refs: number[] } {
	const refs: number[] = [];
	const out = body.replace(
		/<a[^>]*href="#ftn\.[^"]*"[^>]*class="footnote"[^>]*>[\s\S]*?<sup[^>]*>\s*\[(\d+)\]\s*<\/sup>[\s\S]*?<\/a>/g,
		(_full, num) => {
			const fn = parseInt(num, 10);
			if (Number.isFinite(fn)) refs.push(fn);
			return `<sup class="vat-ii-fn-ref" data-fn="${fn}">${fn}</sup>`;
		}
	);
	return { html: out, refs };
}

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
				/<p[^>]*>\s*<a[^>]*class="para"[^>]*>\s*<sup[^>]*>\s*\[\d+\][\s ]*<\/sup>\s*<\/a>/,
				'<p>'
			)
			.trim();
		out.push({ n, html: body });
	}
	return out;
}

function levelFromTitle(title: string): number {
	const upper = title.toUpperCase();
	if (/CHAPITRE\b/.test(upper)) return 2;
	if (/^[IVXLC]+\b[\s.:-]/.test(title)) return 3;
	if (/^[A-Z]\.\s/.test(title)) return 3;
	return 3;
}

export function buildVatIIDoc(args: { contentFiles: string[] }): VatIIDocOutput {
	const blocks: VatIIBlock[] = [];
	const toc: VatIITocEntry[] = [];
	const takenAnchors = new Set<string>();
	let firstHeadingSkipped = false;

	function uniqueAnchor(base: string): string {
		let anchor = base;
		let i = 2;
		while (takenAnchors.has(anchor)) anchor = `${base}-${i++}`;
		takenAnchors.add(anchor);
		return anchor;
	}

	function emitHeading(title: string, level: number) {
		if (!title) return;
		if (!firstHeadingSkipped) {
			firstHeadingSkipped = true;
			return;
		}
		const anchor = uniqueAnchor(`h-${slugify(title).slice(0, 50) || 'sec'}`);
		blocks.push({ kind: 'heading', level, anchor, title });
		toc.push({ level, anchor, title });
	}

	function emitSection(n: number, title: string | undefined, bodies: string[], refs: number[]) {
		const anchor = `p${n}`;
		blocks.push({
			kind: 'paragraph',
			n,
			anchor,
			...(title ? { title } : {}),
			html: bodies.join('\n'),
			footnoteRefs: refs
		});
		if (title) toc.push({ level: levelFromTitle(title), anchor, title, n });
	}

	/**
	 * Two-pass walk of a scope's <p> list: gather paragraph metadata, then
	 * emit numbered sections with their titles (resolved from either inside
	 * the numpara or the immediately preceding bold-only <p>) and any
	 * leftover bold-only <p>s as chapter dividers.
	 */
	function visitParagraphs(scope: string) {
		type Item = {
			body: string;
			numpara?: number;
			numparaMarkup?: string;
			titleText?: string;
			isPureTitle: boolean; // entire body is title-styled (no leftover prose)
		};
		const items: Item[] = collectParagraphs(scope).map((body) => {
			const np = detectNumpara(body);
			const titleText = detectTitle(body);
			return {
				body,
				numpara: np ? np.n : undefined,
				numparaMarkup: np ? np.markup : undefined,
				titleText: titleText ?? undefined,
				isPureTitle: !!titleText
			};
		});

		let i = 0;
		// Bold-only <p> seen with no numpara consumer yet. If the next item
		// is a numpara <p> whose body is prose (no embedded title), this
		// pending bold paragraph IS that section's title (style B).
		let pendingTitle: string | null = null;

		while (i < items.length) {
			const cur = items[i]!;
			if (cur.numpara !== undefined) {
				const title = cur.isPureTitle
					? cur.titleText
					: (cur.titleText ?? pendingTitle ?? undefined);
				pendingTitle = null;
				const bodies: string[] = [];
				const refs: number[] = [];
				if (!cur.isPureTitle) {
					// The numpara <p> carries prose (possibly with a leading
					// bold accent). Strip the numpara markup (whichever form
					// detectNumpara matched) and keep the rest as the first
					// body fragment.
					const innerBody = cur.numparaMarkup
						? cur.body.substring(cur.body.indexOf(cur.numparaMarkup) + cur.numparaMarkup.length)
						: cur.body;
					const rw = rewriteFootnoteRefs(innerBody);
					bodies.push(`<p>${rw.html.trim()}</p>`);
					refs.push(...rw.refs);
				}
				// Slurp following non-numpara, non-title items as body.
				let j = i + 1;
				while (j < items.length && items[j]!.numpara === undefined && !items[j]!.isPureTitle) {
					const rw = rewriteFootnoteRefs(items[j]!.body);
					bodies.push(`<p>${rw.html.trim()}</p>`);
					refs.push(...rw.refs);
					j++;
				}
				emitSection(cur.numpara, title, bodies, refs);
				i = j;
				continue;
			}
			if (cur.isPureTitle) {
				// Look ahead: is the next numpara <p> body prose (not pure
				// title)? If so, this bold <p> is its title (style B).
				let k = i + 1;
				while (k < items.length && items[k]!.numpara === undefined && !items[k]!.isPureTitle) k++;
				if (k < items.length && items[k]!.numpara !== undefined && !items[k]!.isPureTitle) {
					pendingTitle = cur.titleText!;
				} else {
					emitHeading(cur.titleText!, levelFromTitle(cur.titleText!));
				}
				i++;
				continue;
			}
			// Prose <p> outside any section. Edge case (preface before §1).
			// Attach to next section's body if pendingTitle is set? Otherwise
			// emit as standalone n=0 paragraph.
			const rw = rewriteFootnoteRefs(cur.body);
			blocks.push({
				kind: 'paragraph',
				n: 0,
				anchor: uniqueAnchor('p-pre'),
				html: `<p>${rw.html.trim()}</p>`,
				footnoteRefs: rw.refs
			});
			i++;
		}
		// Any unconsumed pendingTitle becomes a heading.
		if (pendingTitle) emitHeading(pendingTitle, levelFromTitle(pendingTitle));
	}

	function visit(scope: string, depth: number) {
		const subs = findSections(scope);
		if (subs.length === 0) {
			visitParagraphs(scope);
			return;
		}
		let cursor = 0;
		for (const sub of subs) {
			visitParagraphs(scope.substring(cursor, sub.start));
			const inner = sliceInner(sub, scope);
			const title = extractSectionTitle(sub.openTag + inner + '</section>');
			if (title) emitHeading(title, Math.max(2, depth));
			visit(inner, depth + 1);
			cursor = sub.end;
		}
		visitParagraphs(scope.substring(cursor));
	}

	const concatenated = args.contentFiles.join('\n');
	for (const file of args.contentFiles) visit(file, 1);

	const footnotes = extractFootnotes(concatenated);
	const used = new Set<number>();
	for (const b of blocks) if (b.kind === 'paragraph') for (const fn of b.footnoteRefs) used.add(fn);
	const filtered = footnotes.filter((f) => used.has(f.n)).sort((a, b) => a.n - b.n);

	const totalParagraphs = blocks.filter((b) => b.kind === 'paragraph' && b.n > 0).length;
	return { blocks, footnotes: filtered, toc, totalParagraphs };
}
