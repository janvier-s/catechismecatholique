/**
 * Generic Vatican II EPUB → JSON builder.
 *
 * Source structure (per vatican.va canonical numbering):
 *  - Each §N is a section: optional title + 0+ continuation prose
 *    paragraphs. Title comes from inside the numpara <p> (style A) or
 *    the immediately preceding bold-only <p> (style B, SC §1 "Préambule").
 *  - Numbered paragraphs are normally introduced by
 *    <span class="numpara">N.</span>. Three other encodings appear in
 *    practice; we accept them all:
 *      A. Standard:  <p>...<span class="numpara">N.</span>...</p>
 *      B. Alt-form:  <p>...<span class="emphasis"><em><span class="bold">
 *                    <strong>N. [title-text]</strong>...</p>
 *                    (LG §64, GS §7/§31, SC §13/§14/§18/§26/§40)
 *      C. Plain:     <p>N. [title-text] [body...]</p>  — no markup.
 *                    (IM §23/§24, GS §17). We accept this only when N
 *                    is exactly the previously-seen-N plus one, to
 *                    avoid mis-detecting prose that starts with a digit.
 *  - Standalone bold-only <p>s between numbered sections become chapter
 *    or section divider headings (e.g. "CHAPITRE PREMIER",
 *    "I. Nature de la liturgie…").
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
 * Title detection: a paragraph body is a "pure title" when its prose,
 * minus the numpara marker and footnote anchors, consists entirely of
 * bold/strong/em wrappers with no plain prose left over.
 */
function detectTitle(body: string): string | null {
	let core = body.replace(/<a[^>]*class="footnote"[^>]*>[\s\S]*?<\/a>/g, '');
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
	let lastSeenN = 0; // For style-C (plain) detection.

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

	function visitParagraphs(scope: string) {
		type Item = {
			body: string; // raw original
			numpara?: number;
			stripped?: string; // body with numpara markup removed
			titleText?: string;
			isPureTitle: boolean;
		};
		const rawBodies = collectParagraphs(scope);

		// PASS 1 — deterministic numpara detection (forms A and B). We
		// record which N is claimed by which raw <p> index so the plain
		// form (C) in pass 2 can't steal a digit that's really a
		// sub-list marker inside an existing section.
		const deterministic = new Map<number, { idx: number; body: string }>();
		for (let i = 0; i < rawBodies.length; i++) {
			const body = rawBodies[i]!;
			let m: RegExpExecArray | null;
			m = /<span\s+class="numpara">(\d+)\.<\/span>\s*/.exec(body);
			if (m) {
				const n = parseInt(m[1]!, 10);
				if (!deterministic.has(n)) {
					const stripped = body.substring(0, m.index) + body.substring(m.index + m[0].length);
					deterministic.set(n, { idx: i, body: stripped });
				}
				continue;
			}
			m =
				/^(\s*<span[^>]*class="emphasis"[^>]*><em><span[^>]*class="bold"[^>]*><strong>)(\d+)\.\s*/.exec(
					body
				);
			if (m) {
				const n = parseInt(m[2]!, 10);
				if (!deterministic.has(n)) {
					deterministic.set(n, { idx: i, body: body.replace(m[0], m[1]!) });
				}
			}
		}
		const claimedByIdx = new Map<number, { n: number; body: string }>();
		for (const [n, v] of deterministic) claimedByIdx.set(v.idx, { n, body: v.body });

		// PASS 2 — walk in order, accepting plain-form C only when N ==
		// runningLast + 1 AND N isn't deterministically claimed elsewhere.
		const items: Item[] = [];
		let runningLast = lastSeenN;
		for (let i = 0; i < rawBodies.length; i++) {
			const body = rawBodies[i]!;
			const det = claimedByIdx.get(i);
			if (det) {
				const titleText = detectTitle(det.body);
				items.push({
					body,
					numpara: det.n,
					stripped: det.body,
					titleText: titleText ?? undefined,
					isPureTitle: !!titleText
				});
				runningLast = Math.max(runningLast, det.n);
				continue;
			}
			const pm = /^(\s*(?:<[^>]+>\s*)*)(\d+)\.\s+/.exec(body);
			if (pm) {
				const n = parseInt(pm[2]!, 10);
				if (n === runningLast + 1 && !deterministic.has(n)) {
					const stripped = body.replace(pm[0], pm[1] ?? '');
					const titleText = detectTitle(stripped);
					items.push({
						body,
						numpara: n,
						stripped,
						titleText: titleText ?? undefined,
						isPureTitle: !!titleText
					});
					runningLast = n;
					continue;
				}
			}
			const titleText = detectTitle(body);
			items.push({
				body,
				titleText: titleText ?? undefined,
				isPureTitle: !!titleText
			});
		}

		let i = 0;
		// Bold-only <p> seen with no consumer yet. If the next item is a
		// numpara <p> whose body is prose, this pending title attaches to it.
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
					const inner = cur.stripped ?? cur.body;
					const rw = rewriteFootnoteRefs(inner);
					bodies.push(`<p>${rw.html.trim()}</p>`);
					refs.push(...rw.refs);
				}
				let j = i + 1;
				while (j < items.length && items[j]!.numpara === undefined && !items[j]!.isPureTitle) {
					const rw = rewriteFootnoteRefs(items[j]!.body);
					bodies.push(`<p>${rw.html.trim()}</p>`);
					refs.push(...rw.refs);
					j++;
				}
				emitSection(cur.numpara, title, bodies, refs);
				lastSeenN = Math.max(lastSeenN, cur.numpara);
				i = j;
				continue;
			}
			if (cur.isPureTitle) {
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
			// Prose <p> outside any section (preface before §1, signature
			// pages). Skip rather than emit as a stray paragraph — these
			// almost always are: "Moi, Paul, évêque…", "(Suivent les
			// signatures des Pères)", or stray footnote stubs.
			i++;
		}
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
