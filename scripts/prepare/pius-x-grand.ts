import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, serialize } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { numberedSlug } from './slug.ts';

// ─── parse5 helpers ───────────────────────────────────────────────────────────

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
function findOne(node: ParseNode, pred: (n: ParseNode) => boolean): ParseNode | undefined {
	for (const n of iter(node)) if (pred(n)) return n;
}

function normalizeWs(s: string): string {
	return s.replace(/\s+/g, ' ').replace(/ /g, ' ').trim();
}

// Inner HTML of a node. parse5 v8's serialize(node) returns the innerHTML of
// an element (children only, without the outer tag), which handles text nodes
// and mixed content correctly. Calling serialize on a bare text node returns ""
// so we must always serialize the *parent* element, not iterate children.
function innerContent(node: ParseNode): string {
	return normalizeWs(serialize(node as unknown as DefaultTreeAdapterMap['parentNode'])).replace(
		/\s+xmlns(?::\w+)?="[^"]*"/g,
		''
	);
}

// Extract the title part of an h1/h2 heading, stripping the span.h-ch kicker.
function headingTitle(node: ParseNode): { kicker: string; title: string } {
	const hCh = findOne(node, (n) => hasClass(n, 'h-ch'));
	const kicker = hCh ? normalizeWs(textOf(hCh)) : '';
	let full = normalizeWs(textOf(node));
	if (kicker)
		full = full
			.slice(kicker.length)
			.replace(/^\s*[-—–.]\s*/, '')
			.trim();
	return { kicker, title: full };
}

// ─── Output types ─────────────────────────────────────────────────────────────

interface PiusXQA {
	n: number;
	q: string; // inner HTML of question (may contain <i> etc.)
	a: string; // joined outer HTML of answer <p> elements
}

interface PiusXSection {
	title: string | null; // null = chapter has no h3 subsections
	qa: PiusXQA[];
}

interface PiusXNav {
	href: string;
	title: string;
	kind: 'chapter' | 'part';
}

interface PiusXChapterFile {
	corpus: 'pius-x-grand';
	part_slug: string;
	part_title: string;
	part_ordinal: number;
	slug: string;
	title: string;
	ordinal: number;
	sections: PiusXSection[];
	qa_range: [number, number];
	prev?: PiusXNav;
	next?: PiusXNav;
}

interface PiusXStructureChapter {
	slug: string;
	title: string;
	ordinal: number;
	qa_range: [number, number];
	sections: { title: string | null; qa_range: [number, number] }[];
}

interface PiusXStructurePart {
	slug: string;
	title: string;
	ordinal: number;
	chapters: PiusXStructureChapter[];
}

export interface PiusXQAContext {
	corpus: 'pius-x-grand';
	part: { slug: string; title: string; ordinal: number };
	chapter: { slug: string; title: string; ordinal: number };
}

// ─── Parser ───────────────────────────────────────────────────────────────────

interface RawQA {
	q: string;
	aParts: string[]; // collected answer <p> elements
}

interface RawSection {
	title: string | null;
	qaItems: RawQA[];
}

interface RawChapter {
	title: string;
	sections: RawSection[];
}

interface RawPart {
	title: string;
	ordinal: number; // 0 = preliminary lesson, 1-5 = parts
	chapters: RawChapter[];
}

function parseFile(html: string, fileOrdinal: number): RawPart {
	const doc = parse(html) as unknown as ParseNode;
	const body = findOne(doc, (n) => n.tagName === 'body');
	if (!body) throw new Error(`File ${fileOrdinal}: no body element`);

	let partTitle = '';
	const chapters: RawChapter[] = [];

	// Mutable state
	let currentChapter: RawChapter | null = null;
	let currentSection: RawSection | null = null;
	let pendingQ: string | null = null;
	let pendingAParts: string[] = [];

	function flushQA() {
		if (pendingQ === null) return;
		const qa: RawQA = { q: pendingQ, aParts: pendingAParts };
		pendingQ = null;
		pendingAParts = [];
		if (!currentSection) {
			// Ensure there's a default section
			if (!currentChapter) throw new Error(`QA encountered before any chapter`);
			currentSection = { title: null, qaItems: [] };
			currentChapter.sections.push(currentSection);
		}
		currentSection.qaItems.push(qa);
	}

	function flushChapter() {
		flushQA();
		if (currentChapter) chapters.push(currentChapter);
		currentChapter = null;
		currentSection = null;
	}

	for (const child of body.childNodes ?? []) {
		const tag = child.tagName;
		if (!tag) continue;

		if (tag === 'h1') {
			flushChapter();
			const { title } = headingTitle(child);
			partTitle = title;
			// Preliminary lesson: no h2 chapters, treat h1 content as single chapter
			if (fileOrdinal === 0) {
				currentChapter = { title, sections: [] };
			}
		} else if (tag === 'h2') {
			flushChapter();
			const { title } = headingTitle(child);
			currentChapter = { title, sections: [] };
			currentSection = null;
		} else if (tag === 'h3') {
			flushQA();
			const sectionTitle = normalizeWs(textOf(child));
			currentSection = { title: sectionTitle, qaItems: [] };
			if (!currentChapter) throw new Error(`h3 before h2 in file ${fileOrdinal}`);
			currentChapter.sections.push(currentSection);
		} else if (tag === 'p') {
			if (hasClass(child, 'qst')) {
				flushQA();
				pendingQ = innerContent(child);
			} else if (pendingQ !== null) {
				// Wrap each answer paragraph with its class so the renderer can style lists.
				const cls = attr(child, 'class');
				const tag = cls ? `<p class="${cls}">` : '<p>';
				pendingAParts.push(`${tag}${innerContent(child)}</p>`);
			}
			// Ignore non-answer p elements (e.g. before first question)
		}
	}
	flushChapter();

	return { title: partTitle, ordinal: fileOrdinal, chapters };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function preparePiusXGrand(args: { sourceDir: string; outDir: string }): {
	totalQA: number;
	totalChapters: number;
	totalParts: number;
} {
	const { sourceDir, outDir } = args;

	const chaptersDir = join(outDir, 'chapters');
	const ctxDir = join(outDir, 'qa-context');
	mkdirSync(chaptersDir, { recursive: true });
	mkdirSync(ctxDir, { recursive: true });

	// Discover and sort source HTML files by prefix ordinal
	const htmlFiles = readdirSync(sourceDir)
		.filter((f) => f.endsWith('.html'))
		.sort((a, b) => {
			const n = (s: string) => parseInt(s.match(/part(\d+)/)?.[1] ?? '0', 10);
			return n(a) - n(b);
		});

	// Parse all files into raw parts
	const rawParts: RawPart[] = htmlFiles.map((fname, idx) => {
		const html = readFileSync(join(sourceDir, fname), 'utf8');
		return parseFile(html, idx);
	});

	// Assign global sequential Q numbers and build slug maps
	let qaCounter = 1;
	const partSlugs = new Set<string>();

	interface AssignedChapter {
		partSlug: string;
		partTitle: string;
		partOrdinal: number;
		slug: string;
		title: string;
		ordinal: number;
		sections: PiusXSection[];
		qaRange: [number, number];
	}

	const allChapters: AssignedChapter[] = [];
	const allStructParts: PiusXStructurePart[] = [];

	const PART_SLUG_OVERRIDES: Record<number, string> = {
		1: '1-credo'
	};

	for (const part of rawParts) {
		const partSlug =
			part.ordinal === 0
				? '0-lecon-preliminaire'
				: (PART_SLUG_OVERRIDES[part.ordinal] ??
					numberedSlug(part.ordinal, part.title, 15, partSlugs));
		if (PART_SLUG_OVERRIDES[part.ordinal]) partSlugs.add(partSlug);

		const chapterSlugs = new Set<string>();
		const structChapters: PiusXStructureChapter[] = [];

		for (let ci = 0; ci < part.chapters.length; ci++) {
			const rawCh = part.chapters[ci]!;
			const ordinal = ci + 1;
			const chSlug = numberedSlug(ordinal, rawCh.title, 15, chapterSlugs);

			const sections: PiusXSection[] = [];
			let firstQN = -1;
			let lastQN = -1;

			for (const rawSec of rawCh.sections) {
				const qa: PiusXQA[] = [];
				for (const rawQA of rawSec.qaItems) {
					const n = qaCounter++;
					if (firstQN === -1) firstQN = n;
					lastQN = n;
					qa.push({ n, q: rawQA.q, a: rawQA.aParts.join('') });
				}
				if (qa.length > 0 || rawSec.title !== null) {
					sections.push({ title: rawSec.title, qa });
				}
			}

			// Filter out empty null-title intro sections (chapters that only have h3 sections)
			const filteredSections = sections.filter((s) => s.qa.length > 0);
			if (filteredSections.length === 0) continue; // skip empty chapters

			const qaRange: [number, number] = [firstQN, lastQN];

			allChapters.push({
				partSlug,
				partTitle: part.title,
				partOrdinal: part.ordinal,
				slug: chSlug,
				title: rawCh.title,
				ordinal,
				sections: filteredSections,
				qaRange
			});

			structChapters.push({
				slug: chSlug,
				title: rawCh.title,
				ordinal,
				qa_range: qaRange,
				sections: filteredSections.map((s) => {
					const first = s.qa[0]?.n ?? firstQN;
					const last = s.qa[s.qa.length - 1]?.n ?? lastQN;
					return { title: s.title, qa_range: [first, last] as [number, number] };
				})
			});
		}

		allStructParts.push({
			slug: partSlug,
			title: part.title,
			ordinal: part.ordinal,
			chapters: structChapters
		});
	}

	const totalQA = qaCounter - 1;

	// Build nav target list (flat list of all chapters in order)
	interface NavTarget {
		href: string;
		title: string;
		partSlug: string;
		partTitle: string;
		partOrdinal: number;
		chapterOrdinal: number;
	}
	const navTargets: NavTarget[] = allChapters.map((ch) => ({
		href: `/pius-x-grand/${ch.partSlug}/${ch.slug}`,
		title: ch.title,
		partSlug: ch.partSlug,
		partTitle: ch.partTitle,
		partOrdinal: ch.partOrdinal,
		chapterOrdinal: ch.ordinal
	}));

	// Write chapter files with prev/next
	for (let i = 0; i < allChapters.length; i++) {
		const ch = allChapters[i]!;
		const prevNav = navTargets[i - 1];
		const nextNav = navTargets[i + 1];

		const file: PiusXChapterFile = {
			corpus: 'pius-x-grand',
			part_slug: ch.partSlug,
			part_title: ch.partTitle,
			part_ordinal: ch.partOrdinal,
			slug: ch.slug,
			title: ch.title,
			ordinal: ch.ordinal,
			sections: ch.sections,
			qa_range: ch.qaRange,
			...(prevNav && {
				prev: {
					href: prevNav.href,
					title: prevNav.title,
					kind: prevNav.partSlug !== ch.partSlug ? 'part' : 'chapter'
				}
			}),
			...(nextNav && {
				next: {
					href: nextNav.href,
					title: nextNav.title,
					kind: nextNav.partSlug !== ch.partSlug ? 'part' : 'chapter'
				}
			})
		};

		const chDir = join(chaptersDir, ch.partSlug);
		mkdirSync(chDir, { recursive: true });
		writeFileSync(join(chDir, `${ch.slug}.json`), JSON.stringify(file));

		// Write Q&A context shards
		for (const sec of ch.sections) {
			for (const qa of sec.qa) {
				const ctx: PiusXQAContext = {
					corpus: 'pius-x-grand',
					part: { slug: ch.partSlug, title: ch.partTitle, ordinal: ch.partOrdinal },
					chapter: { slug: ch.slug, title: ch.title, ordinal: ch.ordinal }
				};
				writeFileSync(join(ctxDir, `${qa.n}.json`), JSON.stringify(ctx));
			}
		}
	}

	// Write structure.json
	const structure = { parts: allStructParts, total_qa: totalQA };
	writeFileSync(join(outDir, 'structure.json'), JSON.stringify(structure, null, 2));

	return {
		totalQA,
		totalChapters: allChapters.length,
		totalParts: allStructParts.length
	};
}
