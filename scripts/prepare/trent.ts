import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, serialize } from 'parse5';
import { numberedSlug, slugify } from './slug.ts';

// ─── parse5 node helpers ──────────────────────────────────────────────────────

interface ParseNode {
	tagName?: string;
	nodeName: string;
	childNodes?: ParseNode[];
	attrs?: { name: string; value: string }[];
	value?: string;
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
function innerHtml(node: ParseNode): string {
	return serialize(node as Parameters<typeof serialize>[0]);
}
function findOne(node: ParseNode, pred: (n: ParseNode) => boolean): ParseNode | undefined {
	for (const n of iter(node)) if (pred(n)) return n;
}
function findAll(node: ParseNode, pred: (n: ParseNode) => boolean): ParseNode[] {
	const out: ParseNode[] = [];
	for (const n of iter(node)) if (pred(n)) out.push(n);
	return out;
}

// ─── Output types ─────────────────────────────────────────────────────────────

interface TrentNav {
	href: string;
	title: string;
	kind: 'section' | 'chapter';
}

interface TrentParagraphData {
	number: number;
	html: string;
}

interface TrentFootnote {
	n: number;
	text: string;
}

interface TrentSectionFile {
	corpus: 'trent';
	chapter_number: number;
	chapter_slug: string;
	chapter_title: string;
	part_slug: string;
	part_title: string;
	slug: string;
	title: string;
	ordinal: number;
	paragraph_numbers: number[];
	paragraphs: TrentParagraphData[];
	footnotes: TrentFootnote[];
	prev?: TrentNav;
	next?: TrentNav;
}

interface TrentChapterSection {
	slug: string;
	title: string;
	ordinal: number;
	paragraph_range: [number, number];
}

interface TrentChapterFile {
	corpus: 'trent';
	number: number;
	slug: string;
	title: string;
	part_slug: string;
	part_title: string;
	sections: TrentChapterSection[];
	prev?: TrentNav;
	next?: TrentNav;
}

interface TrentStructureChapter {
	number: number;
	slug: string;
	title: string;
	paragraph_range: [number, number];
	section_count: number;
}

interface TrentStructurePart {
	slug: string;
	title: string;
	chapters: TrentStructureChapter[];
}

interface TrentStructure {
	parts: TrentStructurePart[];
	total_paragraphs: number;
}

export interface TrentParagraphContext {
	corpus: 'trent';
	part: { slug: string; title: string };
	chapter: { number: number; slug: string; title: string };
	section: { slug: string; title: string; ordinal: number };
}

// ─── Part assignment ──────────────────────────────────────────────────────────

const PARTS: { slug: string; title: string; chapters: [number, number] }[] = [
	{ slug: 'prologue', title: 'Prologue', chapters: [0, 0] },
	{ slug: 'symbole', title: 'Le Symbole de Foi', chapters: [1, 13] },
	{ slug: 'sacrements', title: 'Les Sacrements', chapters: [14, 27] },
	{ slug: 'commandements', title: 'Les Commandements de Dieu', chapters: [28, 37] },
	{ slug: 'oraison-dominicale', title: "L'Oraison Dominicale", chapters: [38, 46] }
];

function partFor(chapNum: number): { slug: string; title: string } {
	for (const p of PARTS) {
		if (chapNum >= p.chapters[0] && chapNum <= p.chapters[1]) {
			return { slug: p.slug, title: p.title };
		}
	}
	throw new Error(`No part found for chapter ${chapNum}`);
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function normalizeWs(s: string): string {
	return s
		.replace(/\s+/g, ' ')
		.replace(/\u00a0/g, ' ')
		.trim();
}

// Simple sentence case: first letter upper, rest lower.
function toSentenceCase(s: string): string {
	if (!s) return s;
	return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Strip Roman numeral prefix like "I — ", "I. — ", "II.— ", "II — " etc.
const ROMAN_PREFIX_RE = /^([IVXLCDM]+)\.?\s*[—–-]+\s*/;

// Proper-noun substitutions to fix lowercased theological terms.
const TITLE_SUBS: Array<[RegExp, string]> = [
	[/eglise|église/gi, 'Église'],
	[/jesus-christ|jésus-christ/gi, 'Jésus-Christ'],
	[/\bchrist\b/gi, 'Christ'],
	[/saint-esprit/gi, 'Saint-Esprit'],
	[/eucharistie/gi, 'Eucharistie'],
	[/\bseigneur\b/gi, 'Seigneur'],
	[/\btrinité\b|trinite\b/gi, 'Trinité'],
	[/vierge marie/gi, 'Vierge Marie'],
	[/\bmarie\b/gi, 'Marie'],
	[/\bdieu\b/gi, 'Dieu'],
	[/décalogue|decalogue/gi, 'Décalogue'],
	[/apôtres|apotres/gi, 'Apôtres']
];

function applyTitleSubs(s: string): string {
	let out = s;
	for (const [re, r] of TITLE_SUBS) out = out.replace(re, r);
	return out;
}

function cleanSectionTitle(raw: string): string {
	const stripped = normalizeWs(raw)
		.replace(/\[.*?\]/g, '')
		.trim();
	const m = stripped.match(ROMAN_PREFIX_RE);
	if (m) {
		const roman = m[1]!.toUpperCase();
		const body = stripped.slice(m[0].length);
		return `${roman} — ${applyTitleSubs(toSentenceCase(body))}`;
	}
	return applyTitleSubs(toSentenceCase(stripped));
}

// ─── Footnote extraction ──────────────────────────────────────────────────────

function buildFootnoteMap(doc: ParseNode): Map<number, string> {
	const map = new Map<number, string>();
	for (const ol of findAll(doc, (n) => n.tagName === 'ol' && hasClass(n, 'references'))) {
		for (const li of (ol.childNodes ?? []).filter((n) => n.tagName === 'li')) {
			const id = attr(li, 'id') ?? '';
			const match = id.match(/^cite_note-(\d+)$/);
			if (!match) continue;
			const n = parseInt(match[1]!, 10);
			const refText = findOne(li, (x) => hasClass(x, 'reference-text'));
			if (refText) {
				map.set(n, normalizeWs(textOf(refText)));
			}
		}
	}
	return map;
}

// ─── Paragraph HTML cleaning ──────────────────────────────────────────────────

// Replace footnote <sup class="reference"> with trentRef sups, remove page spans.
function cleanParagraphHtml(html: string): { html: string; refNums: number[] } {
	const refNums: number[] = [];

	// Remove page-number spans (empty display elements)
	let result = html.replace(
		/<span[^>]+class="[^"]*(?:pagenum|ws-pagenum)[^"]*"[^>]*>.*?<\/span>/gs,
		''
	);

	// Convert footnote reference sups to simplified trentRef sups
	result = result.replace(
		/<sup[^>]+class="reference"[^>]+id="cite_ref-(\d+)"[^>]*>.*?<\/sup>/gs,
		(_, n) => {
			const num = parseInt(n, 10);
			refNums.push(num);
			return `<sup class="trentRef" data-n="${num}">${num}</sup>`;
		}
	);

	// Remove empty spans left by processing
	result = result.replace(/<span[^>]*>\s*<\/span>/g, '');

	// Normalize whitespace
	result = normalizeWs(result);

	return { html: result, refNums };
}

// ─── Chapter parsing ──────────────────────────────────────────────────────────

interface RawSection {
	title: string; // cleaned
	paragraphHtmls: string[];
}

interface ParsedChapter {
	number: number;
	title: string;
	sections: RawSection[];
	footnoteMap: Map<number, string>;
}

// Shared section splitter: walk direct children of a content div, split by
// div.mw-heading.mw-heading2 headings and collect p paragraphs.
function splitIntoSections(contentDiv: ParseNode): RawSection[] {
	const sections: RawSection[] = [];
	let current: RawSection | null = null;

	for (const child of contentDiv.childNodes ?? []) {
		if (child.tagName === 'div' && hasClass(child, 'mw-heading')) {
			const headingText = normalizeWs(textOf(child))
				.replace(/\[.*?\]/g, '')
				.trim();
			if (current) sections.push(current);
			current = { title: cleanSectionTitle(headingText), paragraphHtmls: [] };
		} else if (child.tagName === 'h2' && !hasClass(child, 'tmp')) {
			// Some chapters may still use bare h2 (not wrapped in mw-heading div)
			const headingText = normalizeWs(textOf(child))
				.replace(/\[.*?\]/g, '')
				.trim();
			if (current) sections.push(current);
			current = { title: cleanSectionTitle(headingText), paragraphHtmls: [] };
		} else if (child.tagName === 'p') {
			const text = normalizeWs(textOf(child));
			if (text.startsWith('==')) continue; // wiki-markup heading leaked into a <p>
			if (text.length > 15) {
				if (!current) current = { title: 'Introduction', paragraphHtmls: [] };
				current.paragraphHtmls.push(innerHtml(child));
			}
		}
	}
	if (current && current.paragraphHtmls.length > 0) sections.push(current);
	return sections.filter((s) => s.paragraphHtmls.length > 0);
}

// Find the prp-pages-output div that contains actual text content (has mw-heading
// or meaningful p children). Chapters 1-46 have two prp divs; the second is content.
function findContentDiv(doc: ParseNode): ParseNode | undefined {
	const prps = findAll(doc, (n) => n.tagName === 'div' && hasClass(n, 'prp-pages-output'));
	// Pick the prp-pages-output that has at least one mw-heading child
	for (const prp of [...prps].reverse()) {
		const hasMwHeading = (prp.childNodes ?? []).some(
			(c) => c.tagName === 'div' && hasClass(c, 'mw-heading')
		);
		const hasMeaningfulP = (prp.childNodes ?? []).some(
			(c) => c.tagName === 'p' && normalizeWs(textOf(c)).length > 15
		);
		if (hasMwHeading || hasMeaningfulP) return prp;
	}
	return prps[prps.length - 1]; // fallback: last prp
}

function parseChapter0(html: string): ParsedChapter {
	const doc = parse(html) as unknown as ParseNode;
	const footnoteMap = buildFootnoteMap(doc);
	const contentDiv = findContentDiv(doc);
	if (!contentDiv) throw new Error('Chapitre_0: no prp-pages-output div');

	return {
		number: 0,
		title: 'Préface des auteurs du Catéchisme',
		sections: splitIntoSections(contentDiv),
		footnoteMap
	};
}

function parseChapter(html: string, chapNum: number): ParsedChapter {
	const doc = parse(html) as unknown as ParseNode;
	const footnoteMap = buildFootnoteMap(doc);

	// Chapter title: from tableItem mw-selflink (sentence-case content title)
	const tableItem = findOne(doc, (n) => n.tagName === 'div' && hasClass(n, 'tableItem'));
	let chapterTitle = `Chapitre ${chapNum}`;
	if (tableItem) {
		const selflink = findOne(tableItem, (n) => n.tagName === 'a' && hasClass(n, 'mw-selflink'));
		if (selflink) {
			chapterTitle = applyTitleSubs(normalizeWs(textOf(selflink)));
		}
	}

	const contentDiv = findContentDiv(doc);
	if (!contentDiv) throw new Error(`Chapter ${chapNum}: no prp-pages-output div`);

	return {
		number: chapNum,
		title: chapterTitle,
		sections: splitIntoSections(contentDiv),
		footnoteMap
	};
}

// ─── Slug helpers ─────────────────────────────────────────────────────────────

// Articles / prepositions stripped from interior slug segments (conjunctions like "et" stay).
const INTERIOR_SLUG_STOPS = new Set([
	'au',
	'aux',
	'd',
	'de',
	'des',
	'du',
	'en',
	'l',
	'la',
	'le',
	'les',
	'un',
	'une'
]);

// Chapter slug: strip ALL article/preposition segments (not conjunctions) for cleaner URLs.
function chapterSlugBody(title: string, max: number): string {
	const raw = slugify(title);
	const segments = raw.split('-').filter((p) => p && !INTERIOR_SLUG_STOPS.has(p));
	const body = segments.join('-') || raw;
	if (body.length <= max) return body;
	const cut = body.lastIndexOf('-', max);
	return cut > 0 ? body.slice(0, cut) : body.slice(0, max);
}

// Section slug: strip the Roman-numeral prefix ("II — ") so the body drives the slug.
// shortSlug will then naturally drop any leading article ("du", "la", etc.).
function sectionTitleBody(cleanTitle: string): string {
	return cleanTitle.replace(ROMAN_PREFIX_RE, '') || cleanTitle;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function prepareTrent(args: { sourceDir: string; outDir: string }): {
	totalParagraphs: number;
	totalChapters: number;
	totalSections: number;
} {
	const { sourceDir, outDir } = args;

	const chaptersDir = join(outDir, 'chapters');
	const sectionsDir = join(outDir, 'sections');
	const ctxDir = join(outDir, 'paragraph-context');
	mkdirSync(chaptersDir, { recursive: true });
	mkdirSync(sectionsDir, { recursive: true });
	mkdirSync(ctxDir, { recursive: true });

	// Discover and sort chapter HTML files numerically
	const htmlFiles = readdirSync(sourceDir)
		.filter((f) => f.endsWith('.html') && f.startsWith('Chapitre_'))
		.sort((a, b) => {
			const numA = parseInt(a.match(/Chapitre_(\d+)/)?.[1] ?? '0', 10);
			const numB = parseInt(b.match(/Chapitre_(\d+)/)?.[1] ?? '0', 10);
			return numA - numB;
		});

	// Parse all chapters
	const parsed: ParsedChapter[] = [];
	for (const fname of htmlFiles) {
		const chapNum = parseInt(fname.match(/Chapitre_(\d+)/)?.[1] ?? '0', 10);
		const html = readFileSync(join(sourceDir, fname), 'utf8');
		try {
			if (chapNum === 0) {
				parsed.push(parseChapter0(html));
			} else {
				parsed.push(parseChapter(html, chapNum));
			}
		} catch (e) {
			const err = e as Error;
			throw new Error(`Error parsing ${fname}: ${err.message}`, { cause: e });
		}
	}

	// Sort by chapter number (should already be sorted but just in case)
	parsed.sort((a, b) => a.number - b.number);

	// Assign slugs for all chapters (collision-safe across all chapters)
	const chapterSlugs = new Set<string>();
	const chapterSlugMap = new Map<number, string>(); // chapNum → slug
	for (const ch of parsed) {
		const slug = numberedSlug(ch.number, chapterSlugBody(ch.title, 15), 15, chapterSlugs);
		chapterSlugMap.set(ch.number, slug);
	}

	// Number paragraphs sequentially across all chapters and sections
	let paraCounter = 1;

	// Build all section data (with paragraph numbers assigned)
	interface AssignedSection {
		chapterNum: number;
		chapterSlug: string;
		chapterTitle: string;
		sectionSlug: string;
		sectionTitle: string;
		ordinal: number;
		paragraphs: TrentParagraphData[];
		footnotes: TrentFootnote[];
		paragraphRange: [number, number];
	}

	const allSections: AssignedSection[] = [];

	for (const ch of parsed) {
		const chSlug = chapterSlugMap.get(ch.number)!;
		const sectionSlugs = new Set<string>();

		for (let si = 0; si < ch.sections.length; si++) {
			const sec = ch.sections[si]!;
			const ordinal = si + 1;
			const sectionSlug = numberedSlug(ordinal, sectionTitleBody(sec.title), 15, sectionSlugs);

			const refsUsed = new Set<number>();
			const paragraphs: TrentParagraphData[] = [];

			for (const rawHtml of sec.paragraphHtmls) {
				const { html: cleanedHtml, refNums } = cleanParagraphHtml(rawHtml);
				for (const n of refNums) refsUsed.add(n);
				paragraphs.push({ number: paraCounter++, html: cleanedHtml });
			}

			// Collect only footnotes referenced in this section
			const footnotes: TrentFootnote[] = [];
			for (const n of [...refsUsed].sort((a, b) => a - b)) {
				const text = ch.footnoteMap.get(n);
				if (text) footnotes.push({ n, text });
			}

			const firstPara = paragraphs[0]!.number;
			const lastPara = paragraphs[paragraphs.length - 1]!.number;

			allSections.push({
				chapterNum: ch.number,
				chapterSlug: chSlug,
				chapterTitle: ch.title,
				sectionSlug,
				sectionTitle: sec.title,
				ordinal,
				paragraphs,
				footnotes,
				paragraphRange: [firstPara, lastPara]
			});
		}
	}

	const totalParagraphs = paraCounter - 1;

	// Build a flat list of all section nav targets
	interface NavTarget {
		href: string;
		title: string;
		chapterNum: number;
		chapterTitle: string;
		sectionOrdinal: number;
	}
	const navTargets: NavTarget[] = allSections.map((s) => ({
		href: `/trente/${s.chapterSlug}/${s.sectionSlug}`,
		title: s.sectionTitle,
		chapterNum: s.chapterNum,
		chapterTitle: s.chapterTitle,
		sectionOrdinal: s.ordinal
	}));

	// Write section files (with prev/next)
	for (let i = 0; i < allSections.length; i++) {
		const s = allSections[i]!;
		const prev = i > 0 ? navTargets[i - 1]! : undefined;
		const next = i < allSections.length - 1 ? navTargets[i + 1]! : undefined;

		const isFirstInChapter = i === 0 || allSections[i - 1]!.chapterNum !== s.chapterNum;
		const isLastInChapter =
			i === allSections.length - 1 || allSections[i + 1]!.chapterNum !== s.chapterNum;

		const prevNav: TrentNav | undefined = prev
			? {
					href: prev.href,
					title: prev.title,
					kind:
						prev.chapterNum !== s.chapterNum ? 'chapter' : isFirstInChapter ? 'chapter' : 'section'
				}
			: undefined;
		void isFirstInChapter;

		const nextNav: TrentNav | undefined = next
			? {
					href: next.href,
					title: next.title,
					kind:
						next.chapterNum !== s.chapterNum ? 'chapter' : isLastInChapter ? 'chapter' : 'section'
				}
			: undefined;
		void isLastInChapter;

		const sectionFile: TrentSectionFile = {
			corpus: 'trent',
			chapter_number: s.chapterNum,
			chapter_slug: s.chapterSlug,
			chapter_title: s.chapterTitle,
			part_slug: partFor(s.chapterNum).slug,
			part_title: partFor(s.chapterNum).title,
			slug: s.sectionSlug,
			title: s.sectionTitle,
			ordinal: s.ordinal,
			paragraph_numbers: s.paragraphs.map((p) => p.number),
			paragraphs: s.paragraphs,
			footnotes: s.footnotes,
			...(prevNav && { prev: prevNav }),
			...(nextNav && { next: nextNav })
		};

		const sectionChDir = join(sectionsDir, s.chapterSlug);
		mkdirSync(sectionChDir, { recursive: true });
		writeFileSync(join(sectionChDir, `${s.sectionSlug}.json`), JSON.stringify(sectionFile));
	}

	// Build chapter files
	const chaptersByNum = new Map<number, AssignedSection[]>();
	for (const s of allSections) {
		if (!chaptersByNum.has(s.chapterNum)) chaptersByNum.set(s.chapterNum, []);
		chaptersByNum.get(s.chapterNum)!.push(s);
	}

	const chapterFiles: TrentChapterFile[] = [];
	for (const ch of parsed) {
		const chSlug = chapterSlugMap.get(ch.number)!;
		const sections = chaptersByNum.get(ch.number) ?? [];
		const part = partFor(ch.number);

		// Prev/next chapter nav
		const prevChapter = parsed.find((c) => c.number === ch.number - 1);
		const nextChapter = parsed.find((c) => c.number === ch.number + 1);

		// For prev: link to last section of prev chapter; for next: link to first section of next chapter
		const prevSections = prevChapter ? (chaptersByNum.get(prevChapter.number) ?? []) : [];
		const nextSections = nextChapter ? (chaptersByNum.get(nextChapter.number) ?? []) : [];
		const prevLastSection = prevSections[prevSections.length - 1];
		const nextFirstSection = nextSections[0];

		const chapterFile: TrentChapterFile = {
			corpus: 'trent',
			number: ch.number,
			slug: chSlug,
			title: ch.title,
			part_slug: part.slug,
			part_title: part.title,
			sections: sections.map((s) => ({
				slug: s.sectionSlug,
				title: s.sectionTitle,
				ordinal: s.ordinal,
				paragraph_range: s.paragraphRange
			})),
			...(prevLastSection && {
				prev: {
					href: `/trente/${prevLastSection.chapterSlug}/${prevLastSection.sectionSlug}`,
					title: prevChapter!.title,
					kind: 'chapter'
				}
			}),
			...(nextFirstSection && {
				next: {
					href: `/trente/${nextFirstSection.chapterSlug}/${nextFirstSection.sectionSlug}`,
					title: nextChapter!.title,
					kind: 'chapter'
				}
			})
		};

		chapterFiles.push(chapterFile);
		writeFileSync(join(chaptersDir, `${chSlug}.json`), JSON.stringify(chapterFile));
	}

	// Build paragraph-context shards
	for (const s of allSections) {
		const part = partFor(s.chapterNum);
		const ctx: TrentParagraphContext = {
			corpus: 'trent',
			part: { slug: part.slug, title: part.title },
			chapter: { number: s.chapterNum, slug: s.chapterSlug, title: s.chapterTitle },
			section: { slug: s.sectionSlug, title: s.sectionTitle, ordinal: s.ordinal }
		};
		for (const p of s.paragraphs) {
			writeFileSync(join(ctxDir, `${p.number}.json`), JSON.stringify(ctx));
		}
	}

	// Build structure.json
	const structureParts: TrentStructurePart[] = PARTS.map((pt) => ({
		slug: pt.slug,
		title: pt.title,
		chapters: parsed
			.filter((ch) => ch.number >= pt.chapters[0] && ch.number <= pt.chapters[1])
			.map((ch) => {
				const sections = chaptersByNum.get(ch.number) ?? [];
				const firstSec = sections[0];
				const lastSec = sections[sections.length - 1];
				return {
					number: ch.number,
					slug: chapterSlugMap.get(ch.number)!,
					title: ch.title,
					paragraph_range: [firstSec?.paragraphRange[0] ?? 0, lastSec?.paragraphRange[1] ?? 0] as [
						number,
						number
					],
					sections: sections.map((s) => ({
						slug: s.sectionSlug,
						title: s.sectionTitle,
						ordinal: s.ordinal,
						paragraph_range: s.paragraphRange
					}))
				};
			})
	}));

	const structure: TrentStructure = {
		parts: structureParts,
		total_paragraphs: totalParagraphs
	};
	writeFileSync(join(outDir, 'structure.json'), JSON.stringify(structure, null, 2));

	return {
		totalParagraphs,
		totalChapters: parsed.length,
		totalSections: allSections.length
	};
}
