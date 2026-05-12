/**
 * Markdown → JSON builder for the patristic pipeline. Used by works whose
 * source we hand-cleaned to a pre-structured markdown file rather than a
 * Wikisource HTML page — specifically the Catéchèses mystagogiques of
 * Saint Cyrille de Jérusalem.
 *
 * Expected markdown shape:
 *
 *   # <Work title>
 *
 *   *<work-level subtitle>*
 *
 *   ---
 *
 *   ## <Chapter title> — <optional dash-separated subtitle>
 *
 *   *<italic byline — epistle reading or epigraph>*
 *
 *   ### <Optional subheading>
 *
 *   **1.** <paragraph body…>
 *
 *   **2.** <paragraph body…>
 *
 *   ### <Another subheading>
 *
 *   **3.** <body…>
 *
 *   ---
 *
 *   ## <Next chapter>
 *   …
 */
import type {
	PatBlock,
	PatBuildResult,
	PatChapter,
	PatFull,
	PatStructure,
	PatWorkConfig
} from './build.ts';

const ROMAN: Record<number, string> = {
	1: 'I',
	2: 'II',
	3: 'III',
	4: 'IV',
	5: 'V',
	6: 'VI',
	7: 'VII',
	8: 'VIII',
	9: 'IX',
	10: 'X'
};

/** Minimal markdown-inline → HTML: bold, italic, code. We deliberately keep
 *  the surface small because the source files are hand-cleaned and use only
 *  a few markers. */
function mdInline(s: string): string {
	let h = s;
	// Strong (**…**) and bold-italic (***…***) — process strong first.
	h = h.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
	h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	h = h.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
	// Escape leftover lone ampersands so the output is well-formed.
	h = h.replace(/&(?![a-z]+;|#\d+;)/gi, '&amp;');
	return h;
}

/** Strip leading "**N.**" if present, returning the paragraph number and the
 *  remaining body. */
function stripLeadingNumber(line: string): { n?: number; body: string } {
	const m = /^\*\*(\d+)\.\*\*\s+(.*)$/s.exec(line);
	if (!m) return { body: line };
	return { n: parseInt(m[1]!, 10), body: m[2]! };
}

/** Split chapter heading "Première catéchèse mystagogique — Title" into
 *  the formal label part and the after-dash title. */
function splitHeading(s: string): { label: string; title?: string } {
	const m = /^(.*?)\s*[—–-]\s*(.+)$/.exec(s);
	if (m) return { label: m[1]!.trim(), title: m[2]!.trim() };
	return { label: s.trim() };
}

export function buildPatristiqueMarkdown(args: {
	markdown: string;
	config: Omit<PatWorkConfig, 'htmlPath'>;
}): PatBuildResult {
	const lines = args.markdown.split(/\r?\n/);

	// Walk top to bottom. Each `## ` opens a chapter; collect blocks until the
	// next `## `. Within a chapter, paragraphs are merged from consecutive
	// non-empty lines until a blank line or a new block marker (### / **N**).
	const chapters: PatChapter[] = [];
	let current: {
		ordinal: number;
		roman: string;
		label: string;
		title?: string;
		blocks: PatBlock[];
	} | null = null;
	let pendingPara: { n?: number; parts: string[] } | null = null;
	let pendingEpigraph: string[] | null = null;

	function flushPara() {
		if (!current || !pendingPara) return;
		const html = mdInline(pendingPara.parts.join(' ').trim());
		if (html) {
			const block: PatBlock = pendingPara.n
				? { kind: 'paragraph', n: pendingPara.n, html }
				: { kind: 'paragraph', html };
			current.blocks.push(block);
		}
		pendingPara = null;
	}
	function flushEpigraph() {
		if (!current || !pendingEpigraph) return;
		const text = pendingEpigraph.join(' ').trim();
		// The italic markers wrap the whole epigraph in markdown form
		// (`*…*`). Strip them so we don't double-wrap.
		const inner = text.replace(/^\*([\s\S]*)\*$/, '$1').trim();
		if (inner) current.blocks.push({ kind: 'epigraph', html: mdInline(inner) });
		pendingEpigraph = null;
	}
	function flushAll() {
		flushPara();
		flushEpigraph();
	}

	for (const rawLine of lines) {
		const line = rawLine.trimEnd();

		// Chapter break — flush, then open the new chapter.
		if (line.startsWith('## ')) {
			flushAll();
			if (current) {
				chapters.push({
					slug: `c-${current.ordinal}`,
					workSlug: args.config.slug,
					workTitle: args.config.title,
					ordinal: current.ordinal,
					roman: current.roman,
					label: current.label,
					...(current.title ? { title: current.title } : {}),
					blocks: current.blocks
				});
			}
			const headingText = line.replace(/^##\s+/, '').trim();
			const { label, title } = splitHeading(headingText);
			const ordinal = chapters.length + 1;
			const roman = ROMAN[ordinal] ?? String(ordinal);
			current = {
				ordinal,
				roman,
				// Prefer the source's own label ("Première catéchèse mystagogique")
				// when it's there; otherwise fall back to "Catéchèse N".
				label: label || `Catéchèse ${roman}`,
				...(title ? { title } : {}),
				blocks: []
			};
			continue;
		}

		// Skip the document-level h1, the work subtitle paragraph, and
		// horizontal rules — none of them belong inside a chapter.
		if (line.startsWith('# ')) continue;
		if (line.startsWith('---')) continue;

		if (!current) continue;

		// Subheading inside a chapter.
		if (line.startsWith('### ')) {
			flushAll();
			current.blocks.push({ kind: 'subheading', text: line.replace(/^###\s+/, '').trim() });
			continue;
		}

		// Blank line — paragraph break.
		if (line === '') {
			flushAll();
			continue;
		}

		// First non-empty line of a chapter that starts with "*" and ends
		// with "*" (and is NOT "**N**" — bold) is the italic byline.
		if (
			!pendingPara &&
			!pendingEpigraph &&
			current.blocks.length === 0 &&
			line.startsWith('*') &&
			!line.startsWith('**')
		) {
			pendingEpigraph = [line];
			continue;
		}

		// Multi-line epigraph continuation.
		if (pendingEpigraph) {
			pendingEpigraph.push(line);
			continue;
		}

		// New paragraph (starts with **N.**) or continuation.
		if (/^\*\*\d+\.\*\*/.test(line)) {
			flushPara();
			const { n, body } = stripLeadingNumber(line);
			pendingPara = { n, parts: [body] };
		} else if (pendingPara) {
			pendingPara.parts.push(line);
		} else {
			// Unnumbered paragraph (rare, but allowed).
			pendingPara = { parts: [line] };
		}
	}
	// Tail flush.
	flushAll();
	if (current) {
		chapters.push({
			slug: `c-${current.ordinal}`,
			workSlug: args.config.slug,
			workTitle: args.config.title,
			ordinal: current.ordinal,
			roman: current.roman,
			label: current.label,
			...(current.title ? { title: current.title } : {}),
			blocks: current.blocks
		});
	}

	// Wire prev/next.
	for (let i = 0; i < chapters.length; i++) {
		const c = chapters[i]!;
		const prev = chapters[i - 1];
		const next = chapters[i + 1];
		if (prev) c.prev = { slug: prev.slug, label: prev.label };
		if (next) c.next = { slug: next.slug, label: next.label };
	}

	const chapterMap: Record<string, PatChapter> = {};
	for (const c of chapters) chapterMap[c.slug] = c;
	const structure: PatStructure = {
		slug: args.config.slug,
		title: args.config.title,
		...(args.config.subtitle ? { subtitle: args.config.subtitle } : {}),
		author: args.config.author,
		date: args.config.date,
		translator: args.config.translator,
		totalChapters: chapters.length,
		chapters: chapters.map((c) => ({
			slug: c.slug,
			ordinal: c.ordinal,
			roman: c.roman,
			label: c.label
		}))
	};
	const full: PatFull = { structure, chapters };
	return { structure, chapters: chapterMap, full };
}
