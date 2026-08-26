/**
 * CDSE (Compendium de la doctrine sociale de l'Église) builder.
 *
 * Parses the structured DocBook XHTML files inside the EPUB:
 *   - Hierarchy lives in nested <section class="section" epub:type="..."> tags
 *     ("subchapter" = PARTIE, "division" = CHAPITRE / I. / a)).
 *   - Numbered paragraphs are <p>...<span class="numpara">N.</span>...</p>.
 *   - Footnotes: inline <a href="#ftn.XXX" class="footnote"><sup>[n]</sup></a>
 *     and a body block <div id="ftn.XXX" class="footnote">…</div>.
 *
 * We emit one JSON shard per chapter (twelve numbered chapters plus
 * introduction and conclusion), a top-level structure.json, a paragraph
 * locator index, and a CCC-cited-by index built from footnote bodies that
 * cite "Catéchisme de l'Église catholique, N".
 */
import { slugify } from '../slug.ts';

export interface CdseChapterRef {
	slug: string;
	n: number | null; // numbered chapter (1..12) or null for intro/conclusion
	title: string;
	paragraphRange: [number, number] | null;
}

export interface CdsePartRef {
	slug: string;
	kind: 'front' | 'intro' | 'part' | 'conclusion' | 'index';
	title: string;
	chapters: CdseChapterRef[];
}

export interface CdseStructure {
	parts: CdsePartRef[];
	totalParagraphs: number;
}

export type CdseBlock =
	| { kind: 'heading'; level: number; anchor: string; title: string }
	| { kind: 'paragraph'; n: number; anchor: string; html: string; footnoteRefs: number[] };

export interface CdseFootnote {
	n: number;
	html: string;
	cccRefs: number[];
}

export interface CdseChapter {
	slug: string;
	n: number | null;
	title: string;
	partSlug: string;
	partTitle: string;
	blocks: CdseBlock[];
	footnotes: CdseFootnote[];
}

export interface CdseBuildResult {
	structure: CdseStructure;
	chapters: Record<string, CdseChapter>;
	paragraphs: Record<string, { chapterSlug: string; partSlug: string }>;
	citedByCcc: Record<string, number[]>;
}

interface ContentFileSpec {
	file: string;
	contents: string;
	/** Named `kind` to match FILE_TO_PART and every read below · the interface
	 *  had drifted to `partKind`, which nothing ever set or read. */
	kind: CdsePartRef['kind'];
	partTitle: string;
	partSlug: string;
}

/** Strip XML/HTML tags to plain whitespace-collapsed text. */
function plainText(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Decode the handful of named entities CDSE actually uses. */
function decodeEntities(s: string): string {
	return s
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'");
}

/**
 * Parse the inner heading text from a `<section>` opener. Section opening
 * blocks always wrap the heading in `<div class="titlepage">…<hN>title</hN>`.
 * We pull the first <h2..h6> and clean it up. The "numsection" span
 * (e.g. "I. : ", "a) : ") is kept so the original numbering survives.
 */
function extractSectionTitle(sectionHtml: string): string {
	const m = sectionHtml.match(/<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/i);
	if (!m) return '';
	// Collapse <br/> to a single space so things like "PREMIER CHAPITRE<br/>LE
	// DESSEIN D'AMOUR" read as one title.
	return plainText(m[1] ?? '');
}

/** Roman number -> integer (only for the values we encounter: I..XII). */
const ROMAN: Record<string, number> = {
	I: 1,
	II: 2,
	III: 3,
	IV: 4,
	V: 5,
	VI: 6,
	VII: 7,
	VIII: 8,
	IX: 9,
	X: 10,
	XI: 11,
	XII: 12
};

const CHAPTER_LABEL_RE =
	/^(?:(PREMIER|DEUXIÈME|TROISIÈME|QUATRIÈME|CINQUIÈME|SIXIÈME|SEPTIÈME|HUITIÈME|NEUVIÈME|DIXIÈME|ONZIÈME|DOUZIÈME)\s+CHAPITRE)/;

const ORDINAL_TO_N: Record<string, number> = {
	PREMIER: 1,
	DEUXIÈME: 2,
	TROISIÈME: 3,
	QUATRIÈME: 4,
	CINQUIÈME: 5,
	SIXIÈME: 6,
	SEPTIÈME: 7,
	HUITIÈME: 8,
	NEUVIÈME: 9,
	DIXIÈME: 10,
	ONZIÈME: 11,
	DOUZIÈME: 12
};

void ROMAN; // reserved for potential future use

/**
 * Find all top-level `<section …>` blocks at the current scan position.
 * The CDSE XHTML is well-formed enough that section tags balance, so we walk
 * the string and track depth on the fly.
 */
function findSections(html: string): { start: number; end: number; openTag: string }[] {
	const out: { start: number; end: number; openTag: string }[] = [];
	const re = /<section\b[^>]*>|<\/section>/g;
	let m: RegExpExecArray | null;
	const stack: { start: number; openTag: string }[] = [];
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

/** Find immediate-child sections inside a section's inner content. */
function childSections(inner: string): { start: number; end: number; openTag: string }[] {
	return findSections(inner);
}

function sliceInner(
	section: { start: number; end: number; openTag: string },
	html: string
): string {
	const open = section.openTag.length;
	return html.substring(section.start + open, section.end - '</section>'.length);
}

/** Extract CCC paragraph numbers cited in a footnote body. */
const CCC_CITATION_RE =
	/Cat[ée]chisme de l['’]?[EÉ]glise catholique[^.;<]*?((?:\d+(?:[, .-]+\d+)*))/gi;

function extractCccRefs(footnoteHtml: string): number[] {
	const text = plainText(footnoteHtml);
	const refs = new Set<number>();
	let m: RegExpExecArray | null;
	const re = new RegExp(CCC_CITATION_RE.source, CCC_CITATION_RE.flags);
	while ((m = re.exec(text))) {
		const numList = m[1] ?? '';
		for (const n of numList.match(/\d+/g) ?? []) {
			const v = parseInt(n, 10);
			if (Number.isFinite(v) && v >= 1 && v <= 2865) refs.add(v);
		}
	}
	return [...refs].sort((a, b) => a - b);
}

/**
 * Extract footnote bodies from a chapter's HTML. CDSE puts them inline
 * (immediately following the section that references them) as
 * `<div id="ftn.XXX" class="footnote"><p><a><sup>[N] </sup></a>body…</p></div>`.
 */
function extractFootnotes(html: string): CdseFootnote[] {
	const re = /<div\s+id="ftn\.([^"]+)"\s+class="footnote"[^>]*>([\s\S]*?)<\/div>/g;
	const out: CdseFootnote[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) {
		const inner = m[2] ?? '';
		// Pull the [N] number from the leading <sup class="para">[N] </sup>.
		const numMatch = inner.match(/<sup[^>]*class="para"[^>]*>\s*\[(\d+)\]/);
		const n = numMatch ? parseInt(numMatch[1]!, 10) : 0;
		// Strip the leading backlink/sup so the body starts with prose.
		const body = inner
			.replace(
				/<p[^>]*>\s*<a[^>]*class="para"[^>]*>\s*<sup[^>]*>\s*\[\d+\][\s\u00a0]*<\/sup>\s*<\/a>/,
				'<p>'
			)
			.trim();
		out.push({ n, html: body, cccRefs: extractCccRefs(body) });
	}
	return out.filter((f) => f.n > 0);
}

/**
 * Pull the numbered paragraphs out of a chapter (or any) HTML scope. We
 * preserve the original markup for each paragraph except: strip the numpara
 * span (number is captured separately) and rewrite inline footnote refs into
 * a stable `<sup class="cdse-fn-ref" data-fn="N">N</sup>` shape that the
 * reader can hook tooltips to.
 */
function extractParagraphs(
	html: string
): { n: number; anchor: string; html: string; footnoteRefs: number[] }[] {
	const out: { n: number; anchor: string; html: string; footnoteRefs: number[] }[] = [];
	// Match <p ...> ... <span class="numpara">N.</span> ... </p>
	const re = /<p\b([^>]*)>([\s\S]*?<span\s+class="numpara">(\d+)\.<\/span>[\s\S]*?)<\/p>/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) {
		const attrs = m[1] ?? '';
		const inner = m[2] ?? '';
		const n = parseInt(m[3] ?? '0', 10);
		if (!Number.isFinite(n) || n === 0) continue;

		const idMatch = attrs.match(/\bid="([^"]+)"/);
		const anchor = idMatch ? idMatch[1]! : `p${n}`;

		// Strip numpara span — readers render the number themselves.
		let body = inner.replace(/<span\s+class="numpara">\d+\.<\/span>\s*/, '');

		// Rewrite inline footnote anchors and capture their numbers.
		const fnNums: number[] = [];
		body = body.replace(
			/<a[^>]*href="#ftn\.[^"]*"[^>]*class="footnote"[^>]*>[\s\S]*?<sup[^>]*>\s*\[(\d+)\]\s*<\/sup>[\s\S]*?<\/a>/g,
			(_full, num) => {
				const fn = parseInt(num, 10);
				if (Number.isFinite(fn)) fnNums.push(fn);
				return `<sup class="cdse-fn-ref" data-fn="${fn}">${fn}</sup>`;
			}
		);

		body = `<p>${body.trim()}</p>`;
		out.push({ n, anchor, html: body, footnoteRefs: fnNums });
	}
	return out;
}

/**
 * Walk a chapter's <section> tree and emit headings + paragraphs in document
 * order. Heading "level" is computed from nesting depth inside the chapter
 * (chapter title itself is not emitted — the reader renders it from the
 * chapter metadata).
 */
function walkChapterBlocks(chapterInner: string, taken: Set<string>): CdseBlock[] {
	const blocks: CdseBlock[] = [];

	function visit(sectionInner: string, depth: number) {
		const subs = childSections(sectionInner);
		if (subs.length === 0) {
			// Leaf section: emit its paragraphs.
			for (const p of extractParagraphs(sectionInner)) {
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
		// Pre-section content (rare but happens — e.g. epigraph before first I.)
		// We still pull paragraphs from the slice between section opens, in case
		// any numbered paragraph sits outside a sub-section.
		let cursor = 0;
		for (const sub of subs) {
			const pre = sectionInner.substring(cursor, sub.start);
			for (const p of extractParagraphs(pre)) {
				blocks.push({
					kind: 'paragraph',
					n: p.n,
					anchor: p.anchor,
					html: p.html,
					footnoteRefs: p.footnoteRefs
				});
			}
			const inner = sliceInner(sub, sectionInner);
			const title = extractSectionTitle(sub.openTag + inner + '</section>');
			const idMatch = sub.openTag.match(/\bid="([^"]+)"/);
			const baseAnchor = idMatch ? idMatch[1]! : `s-${slugify(title).slice(0, 40) || 'sec'}`;
			let anchor = baseAnchor;
			let i = 2;
			while (taken.has(anchor)) anchor = `${baseAnchor}-${i++}`;
			taken.add(anchor);
			blocks.push({ kind: 'heading', level: depth, anchor, title });
			visit(inner, depth + 1);
			cursor = sub.end;
		}
		// Trailing content after the last sub-section.
		const tail = sectionInner.substring(cursor);
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

	visit(chapterInner, 1);
	return blocks;
}

/**
 * Decide chapter slug + number from its title. Titles look like:
 *   "PREMIER CHAPITRE LE DESSEIN D'AMOUR DE DIEU POUR L'HUMANITÉ"
 *   "DEUXIÈME CHAPITRE : MISSION DE L'ÉGLISE ..."
 * For non-numbered chapters (introduction body, conclusion sub-sections),
 * fall back to a title slug.
 */
function chapterSlugAndN(title: string): { slug: string; n: number | null; cleanTitle: string } {
	const m = title.match(CHAPTER_LABEL_RE);
	if (m) {
		const n = ORDINAL_TO_N[m[1]!]!;
		// Strip the leading ordinal + "CHAPITRE" + colon
		const rest = title
			.substring(m[0].length)
			.replace(/^\s*:?\s*/, '')
			.trim();
		return { slug: `chapitre-${n}`, n, cleanTitle: rest };
	}
	return { slug: slugify(title).slice(0, 60) || 'section', n: null, cleanTitle: title };
}

export function buildCdse(args: {
	contentFiles: { file: string; contents: string }[];
}): CdseBuildResult {
	// Classify each content file by part. The EPUB filenames are stable:
	//   ch01.xhtml      = Secrétairerie d'État (front matter)
	//   ch01s02.xhtml   = Présentation (front matter)
	//   ch01s03.xhtml   = Introduction
	//   ch01s04.xhtml   = Première partie
	//   ch01s05.xhtml   = Deuxième partie
	//   ch01s06.xhtml   = Troisième partie
	//   ch01s07.xhtml   = Conclusion
	//   ch01s08.xhtml   = Index des références
	const FILE_TO_PART: Record<
		string,
		{ kind: CdsePartRef['kind']; partTitle: string; partSlug: string }
	> = {
		'ch01.xhtml': { kind: 'front', partTitle: 'Secrétairerie d’État', partSlug: 'secretairerie' },
		'ch01s02.xhtml': { kind: 'front', partTitle: 'Présentation', partSlug: 'presentation' },
		'ch01s03.xhtml': { kind: 'intro', partTitle: 'Introduction', partSlug: 'introduction' },
		'ch01s04.xhtml': { kind: 'part', partTitle: 'Première partie', partSlug: 'partie-1' },
		'ch01s05.xhtml': { kind: 'part', partTitle: 'Deuxième partie', partSlug: 'partie-2' },
		'ch01s06.xhtml': { kind: 'part', partTitle: 'Troisième partie', partSlug: 'partie-3' },
		'ch01s07.xhtml': { kind: 'conclusion', partTitle: 'Conclusion', partSlug: 'conclusion' },
		'ch01s08.xhtml': { kind: 'index', partTitle: 'Index des références', partSlug: 'index' }
	};

	const specs: ContentFileSpec[] = args.contentFiles
		.filter((f) => FILE_TO_PART[f.file])
		.map((f) => {
			const meta = FILE_TO_PART[f.file]!;
			return { ...meta, file: f.file, contents: f.contents };
		});

	const chapters: Record<string, CdseChapter> = {};
	const paragraphs: Record<string, { chapterSlug: string; partSlug: string }> = {};
	const parts: CdsePartRef[] = [];
	const partChapterRefs = new Map<string, CdseChapterRef[]>();
	const citedByCcc: Record<string, number[]> = {};

	for (const spec of specs) {
		// Skip the index file — it's a reference appendix without numbered paragraphs.
		if (spec.kind === 'index') {
			parts.push({ slug: spec.partSlug, kind: spec.kind, title: spec.partTitle, chapters: [] });
			continue;
		}

		const topSections = findSections(spec.contents);
		if (topSections.length === 0) continue;
		// The single top-level <section> is the PARTIE / INTRODUCTION / CONCLUSION wrapper.
		const top = topSections[0]!;
		const partInner = sliceInner(top, spec.contents);

		// Footnotes for the entire part go to whichever chapter cited them
		// (they live inline in the EPUB but functionally belong to the chapter
		// containing the citing paragraph). We extract them once per file and
		// assign each footnote to the chapter that referenced it.
		const allFootnotes = extractFootnotes(partInner);

		const chapterRefs: CdseChapterRef[] = [];
		const childChapters = childSections(partInner);

		// Some parts (intro, conclusion) have a flat sub-section structure that
		// is itself the body (no further nested chapters). Treat the whole part
		// as a single chapter in that case.
		const treatPartAsSingleChapter =
			spec.kind === 'intro' || spec.kind === 'conclusion' || spec.kind === 'front';

		if (treatPartAsSingleChapter || childChapters.length === 0) {
			const slug = spec.partSlug;
			const anchorTaken = new Set<string>();
			const blocks = walkChapterBlocks(partInner, anchorTaken);
			const fnNums = new Set<number>();
			for (const b of blocks)
				if (b.kind === 'paragraph') for (const f of b.footnoteRefs) fnNums.add(f);
			const ourFns = allFootnotes.filter((f) => fnNums.has(f.n));
			const paraNums = blocks.flatMap((b) => (b.kind === 'paragraph' ? [b.n] : []));
			const chapter: CdseChapter = {
				slug,
				n: null,
				title: spec.partTitle,
				partSlug: spec.partSlug,
				partTitle: spec.partTitle,
				blocks,
				footnotes: ourFns
			};
			chapters[slug] = chapter;
			for (const n of paraNums)
				paragraphs[String(n)] = { chapterSlug: slug, partSlug: spec.partSlug };
			// Citer = the CDSE *paragraph* number that referenced a footnote
			// whose body cites a CCC paragraph. Walk paragraphs once.
			const fnByNum = new Map<number, CdseFootnote>();
			for (const fn of ourFns) fnByNum.set(fn.n, fn);
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
			chapterRefs.push({
				slug,
				n: null,
				title: spec.partTitle,
				paragraphRange: paraNums.length > 0 ? [Math.min(...paraNums), Math.max(...paraNums)] : null
			});
		} else {
			// Each child <section epub:type="division"> is a CHAPITRE.
			for (const ch of childChapters) {
				const inner = sliceInner(ch, partInner);
				const title = extractSectionTitle(ch.openTag + inner + '</section>');
				const { slug, n, cleanTitle } = chapterSlugAndN(title);
				const anchorTaken = new Set<string>();
				const blocks = walkChapterBlocks(inner, anchorTaken);
				const fnNums = new Set<number>();
				for (const b of blocks)
					if (b.kind === 'paragraph') for (const f of b.footnoteRefs) fnNums.add(f);
				const ourFns = allFootnotes.filter((f) => fnNums.has(f.n));
				const paraNums = blocks.flatMap((b) => (b.kind === 'paragraph' ? [b.n] : []));
				const chapter: CdseChapter = {
					slug,
					n,
					title: cleanTitle,
					partSlug: spec.partSlug,
					partTitle: spec.partTitle,
					blocks,
					footnotes: ourFns
				};
				chapters[slug] = chapter;
				for (const num of paraNums)
					paragraphs[String(num)] = { chapterSlug: slug, partSlug: spec.partSlug };
				const fnByNum = new Map<number, CdseFootnote>();
				for (const fn of ourFns) fnByNum.set(fn.n, fn);
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
				chapterRefs.push({
					slug,
					n,
					title: cleanTitle,
					paragraphRange:
						paraNums.length > 0 ? [Math.min(...paraNums), Math.max(...paraNums)] : null
				});
			}
		}

		// Front-matter chapters use partSlug as their slug; collapse to one
		// part entry per file. For real parts (1/2/3), the part wraps multiple
		// chapters.
		parts.push({
			slug: spec.partSlug,
			kind: spec.kind,
			title: spec.partTitle,
			chapters: chapterRefs
		});
		partChapterRefs.set(spec.partSlug, chapterRefs);
	}

	// Sort citedByCcc lists.
	for (const k of Object.keys(citedByCcc)) {
		citedByCcc[k] = (citedByCcc[k] ?? []).sort((a, b) => a - b);
	}

	const totalParagraphs = Object.keys(paragraphs).length;

	return {
		structure: { parts, totalParagraphs },
		chapters,
		paragraphs,
		citedByCcc
	};
}

void decodeEntities;
