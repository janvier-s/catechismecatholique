/**
 * PGMR (Présentation Générale du Missel Romain, 2002) builder.
 *
 * Parses the vatican.va HTML export (a Word/HTML hybrid) into a clean
 * chapter/paragraph shape. The source has:
 *   - "PR" preamble then 9 chapters marked by text "CHAP. <Roman>" — the
 *     wrapping tag is inconsistent (sometimes <h1>, sometimes mid-<p>),
 *     so we anchor on the text pattern instead.
 *   - 399 numbered paragraphs of shape `<p><b>N.</b> body…</p>`, with a
 *     handful of legitimate gaps in the source numbering.
 *   - Footnotes referenced inline as `<a href="#_ednN"><sup>[n]</sup></a>`
 *     and defined at the document end as `<a name="_ednN">` blocks.
 */
import { slugify } from '../slug.ts';

export interface PgmrChapterRef {
	slug: string;
	n: number | null; // 1..9 for chapters, null for préambule
	title: string;
	paragraphRange: [number, number] | null;
}

export interface PgmrStructure {
	chapters: PgmrChapterRef[];
	totalParagraphs: number;
}

export type PgmrBlock =
	| { kind: 'heading'; level: number; anchor: string; title: string }
	| { kind: 'paragraph'; n: number; anchor: string; html: string; footnoteRefs: number[] };

export interface PgmrFootnote {
	n: number;
	html: string;
	cccRefs: number[];
}

export interface PgmrChapter {
	slug: string;
	n: number | null;
	title: string;
	blocks: PgmrBlock[];
	footnotes: PgmrFootnote[];
}

export interface PgmrBuildResult {
	structure: PgmrStructure;
	chapters: Record<string, PgmrChapter>;
	paragraphs: Record<string, { chapterSlug: string }>;
	citedByCcc: Record<string, number[]>;
}

const ROMAN_TO_N: Record<string, number> = {
	I: 1,
	II: 2,
	III: 3,
	IV: 4,
	V: 5,
	VI: 6,
	VII: 7,
	VIII: 8,
	IX: 9
};

// HTML entities the source actually uses (Word/Office export).
const ENTITIES: Record<string, string> = {
	nbsp: ' ',
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	eacute: 'é',
	egrave: 'è',
	ecirc: 'ê',
	euml: 'ë',
	Eacute: 'É',
	Egrave: 'È',
	Ecirc: 'Ê',
	Euml: 'Ë',
	agrave: 'à',
	acirc: 'â',
	auml: 'ä',
	Agrave: 'À',
	Acirc: 'Â',
	ocirc: 'ô',
	ouml: 'ö',
	ugrave: 'ù',
	ucirc: 'û',
	uuml: 'ü',
	icirc: 'î',
	iuml: 'ï',
	ccedil: 'ç',
	Ccedil: 'Ç',
	aelig: 'æ',
	oelig: 'œ',
	deg: '°',
	hellip: '…',
	laquo: '«',
	raquo: '»',
	ndash: '–',
	mdash: '—',
	rsquo: '’',
	lsquo: '‘',
	rdquo: '”',
	ldquo: '“',
	acute: '´'
};

function decodeEntities(s: string): string {
	return s
		.replace(/&([a-zA-Z]+);/g, (_m, name) => ENTITIES[name] ?? _m)
		.replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

/**
 * Find chapter boundaries. The reliable marker is the literal text
 * `CHAP. <Roman>`. We capture title from the same surrounding line.
 */
interface ChapterBoundary {
	start: number;
	n: number;
	rawTitle: string;
}

function findChapterBoundaries(html: string): ChapterBoundary[] {
	// The document opens with a table-of-contents that mentions every
	// "CHAP. <Roman>" — we must NOT split on those. The real body chapter
	// starts are marked by `<a name="CHAPITRE_<Roman>_…">` anchors. The
	// export emits the anchor twice (once on the <h1> wrapper, once on
	// the heading text itself); we keep only the first occurrence per
	// Roman numeral.
	const re = /<a\s+name="CHAPITRE_(I|II|III|IV|V|VI|VII|VIII|IX)_([^"]+)"/g;
	const seen = new Set<number>();
	const out: ChapterBoundary[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) {
		const n = ROMAN_TO_N[m[1]!]!;
		if (seen.has(n)) continue;
		seen.add(n);
		out.push({ start: m.index, n, rawTitle: m[2] ?? '' });
	}
	return out;
}

function cleanTitle(raw: string): string {
	// Anchor names are underscore-joined caps with HTML entities. Decode and
	// re-space, then collapse multiple spaces and trim. The first word
	// (e.g. "IMPORTANCE") starts the chapter title proper.
	const text = decodeEntities(raw).replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
	return text;
}

/** Find numbered paragraphs of shape `<p ...><b>N.</b> body…</p>`. */
function extractParagraphs(scope: string): { n: number; html: string; footnoteRefs: number[] }[] {
	const out: { n: number; html: string; footnoteRefs: number[] }[] = [];
	// Match <p ...>(any inline tags)*<b>N.</b>...</p>
	const re = /<p\b[^>]*>\s*(?:<[^>]+>\s*)*<b>\s*(\d{1,4})\.\s*<\/b>([\s\S]*?)<\/p>/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(scope))) {
		const n = parseInt(m[1]!, 10);
		if (!Number.isFinite(n) || n === 0) continue;
		let body = (m[2] ?? '').trim();

		// Rewrite inline footnote refs.
		const fnNums: number[] = [];
		body = body.replace(
			/<a[^>]*href="#_edn(\d+)"[^>]*>(?:<sup[^>]*>)?\[?(\d+)\]?(?:<\/sup>)?<\/a>/gi,
			(_full, _href, numStr) => {
				const fn = parseInt(numStr, 10);
				if (Number.isFinite(fn)) fnNums.push(fn);
				return `<sup class="pgmr-fn-ref" data-fn="${fn}">${fn}</sup>`;
			}
		);

		// Strip a stray leading `&nbsp;` and Word/Office cruft.
		body = body
			.replace(/<o:p>\s*<\/o:p>/gi, '')
			.replace(/^\s*(?:&nbsp;|\u00a0|\s)+/, '')
			.trim();

		// Decode named entities (browser would normally do this on render,
		// but we want the JSON snapshot to be readable + matchable).
		body = decodeEntities(body);

		out.push({ n, html: `<p>${body}</p>`, footnoteRefs: fnNums });
	}
	return out;
}

/** Extract footnote definitions from the document tail. */
function extractFootnotes(fullHtml: string): PgmrFootnote[] {
	const out: PgmrFootnote[] = [];
	// Vatican.va Word export: `<a name="_ednN">[N]</a> body…` until the
	// next `<a name="_ednM">` marker.
	const markers: { n: number; index: number }[] = [];
	const markerRe = /<a\s+name="_edn(\d+)"/g;
	let m: RegExpExecArray | null;
	while ((m = markerRe.exec(fullHtml))) {
		markers.push({ n: parseInt(m[1]!, 10), index: m.index });
	}
	for (let i = 0; i < markers.length; i++) {
		const cur = markers[i]!;
		const next = markers[i + 1];
		const slice = fullHtml.substring(cur.index, next ? next.index : fullHtml.length);
		// Strip the leading anchor tag itself + the `[N]` label.
		const body =
			slice
				.replace(/^<a\s+name="_edn\d+"[^>]*>(?:\[\d+\])?<\/a>\s*/i, '')
				.replace(/<a\s+href="#_ednref\d+"[^>]*>(?:\[\d+\])?<\/a>\s*/gi, '')
				.split(/<\/p\s*>/i)[0] ?? '';
		const text = decodeEntities(body)
			.replace(/<o:p>\s*<\/o:p>/gi, '')
			.replace(/\s+/g, ' ')
			.trim();
		if (text.length === 0) continue;
		// CCC citations in footnote bodies.
		const cccRefs = new Set<number>();
		for (const match of text.matchAll(
			/Cat[ée]chisme de l['’]?[EÉ]glise catholique[^.;]*?((?:\d+(?:[, ]+\d+)*))/gi
		)) {
			for (const num of (match[1] ?? '').match(/\d+/g) ?? []) {
				const v = parseInt(num, 10);
				if (Number.isFinite(v) && v >= 1 && v <= 2865) cccRefs.add(v);
			}
		}
		out.push({ n: cur.n, html: text, cccRefs: [...cccRefs].sort((a, b) => a - b) });
	}
	return out;
}

export function buildPgmr(args: { html: string }): PgmrBuildResult {
	const html = args.html;
	const boundaries = findChapterBoundaries(html);
	if (boundaries.length === 0) {
		throw new Error('PGMR: no CHAP. markers found — source format changed?');
	}

	// Find the preamble start. The body opens with
	// `<a name="PR&Eacute;AMBULE">` — anything before that is the table of
	// contents (which mentions every "CHAP. <Roman>" and would otherwise
	// pollute the preamble slice).
	const slices: { slug: string; n: number | null; title: string; html: string }[] = [];
	const preamMatch = /<a\s+name="PR[^"]*"/i.exec(html);
	const preStart = preamMatch ? preamMatch.index : 0;
	const preEnd = boundaries[0]!.start;
	slices.push({
		slug: 'preambule',
		n: null,
		title: 'Préambule',
		html: html.substring(preStart, preEnd)
	});
	for (let i = 0; i < boundaries.length; i++) {
		const cur = boundaries[i]!;
		const next = boundaries[i + 1];
		const sliceHtml = html.substring(cur.start, next ? next.start : html.length);
		const title = cleanTitle(cur.rawTitle);
		slices.push({
			slug: `chapitre-${cur.n}`,
			n: cur.n,
			title,
			html: sliceHtml
		});
	}

	// Footnotes are at the document tail. We extract them globally then
	// route each one to whichever chapter referenced it.
	const allFootnotes = extractFootnotes(html);
	const fnByNum = new Map<number, PgmrFootnote>();
	for (const f of allFootnotes) fnByNum.set(f.n, f);

	const chapters: Record<string, PgmrChapter> = {};
	const paragraphs: Record<string, { chapterSlug: string }> = {};
	const chapterRefs: PgmrChapterRef[] = [];
	const citedByCcc: Record<string, number[]> = {};

	for (const slice of slices) {
		const paras = extractParagraphs(slice.html);
		const blocks: PgmrBlock[] = paras.map((p) => ({
			kind: 'paragraph',
			n: p.n,
			anchor: `p${p.n}`,
			html: p.html,
			footnoteRefs: p.footnoteRefs
		}));
		const fnNumsUsed = new Set<number>();
		for (const b of blocks)
			if (b.kind === 'paragraph') for (const fn of b.footnoteRefs) fnNumsUsed.add(fn);
		const ourFns: PgmrFootnote[] = [];
		for (const n of [...fnNumsUsed].sort((a, b) => a - b)) {
			const fn = fnByNum.get(n);
			if (fn) ourFns.push(fn);
		}
		// Citer = the PGMR paragraph that references a footnote whose body
		// cites a CCC paragraph.
		for (const b of blocks) {
			if (b.kind !== 'paragraph') continue;
			for (const fnNum of b.footnoteRefs) {
				const fn = fnByNum.get(fnNum);
				if (!fn) continue;
				for (const ccc of fn.cccRefs) {
					const key = String(ccc);
					const arr = citedByCcc[key] ?? (citedByCcc[key] = []);
					if (!arr.includes(b.n)) arr.push(b.n);
				}
			}
		}

		chapters[slice.slug] = {
			slug: slice.slug,
			n: slice.n,
			title: slice.title,
			blocks,
			footnotes: ourFns
		};
		const paraNums = blocks.flatMap((b) => (b.kind === 'paragraph' ? [b.n] : []));
		for (const num of paraNums) paragraphs[String(num)] = { chapterSlug: slice.slug };
		chapterRefs.push({
			slug: slice.slug,
			n: slice.n,
			title: slice.title,
			paragraphRange: paraNums.length > 0 ? [Math.min(...paraNums), Math.max(...paraNums)] : null
		});
	}

	for (const k of Object.keys(citedByCcc)) {
		citedByCcc[k] = (citedByCcc[k] ?? []).sort((a, b) => a - b);
	}

	void slugify; // reserved for future heading anchoring
	return {
		structure: { chapters: chapterRefs, totalParagraphs: Object.keys(paragraphs).length },
		chapters,
		paragraphs,
		citedByCcc
	};
}
