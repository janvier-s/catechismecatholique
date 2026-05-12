/**
 * Generic Wikisource patristic-text scraper. Used for any work whose
 * Wikisource page renders chapters as `<p>I. …`, `<p>II. …` inside a
 * `<div class="prp-pages-output">` block. Verified on:
 *   - La Didachè (Hemmer 1907)
 *   - Discours catéchétique de saint Grégoire de Nysse (Méridier 1908)
 *
 * Output: per-work `structure.json` (table of contents + metadata) and a
 * shard per chapter under `chapters/c-N.json`.
 */
export interface PatWorkConfig {
	slug: string;
	title: string;
	subtitle?: string;
	author: string;
	date: string; // human label, e.g. "vers 80–100"
	translator: string;
	htmlPath: string;
}

export type PatBlock =
	| { kind: 'paragraph'; n?: number; html: string }
	| { kind: 'subheading'; text: string }
	| { kind: 'epigraph'; html: string };

export interface PatChapterRef {
	slug: string; // "c-1"
	ordinal: number;
	roman: string;
	label: string; // "Chapitre I"
}

export interface PatStructure {
	slug: string;
	title: string;
	subtitle?: string;
	author: string;
	date: string;
	translator: string;
	chapters: PatChapterRef[];
	totalChapters: number;
}

export interface PatChapter {
	slug: string;
	workSlug: string;
	workTitle: string;
	ordinal: number;
	roman: string;
	label: string;
	/** Optional chapter title — present for works whose chapters are titled
	 *  (Cyrille's catéchèses mystagogiques) and absent for those that aren't
	 *  (Didachè, Discours catéchétique). */
	title?: string;
	blocks: PatBlock[];
	prev?: { slug: string; label: string };
	next?: { slug: string; label: string };
}

export interface PatFull {
	structure: PatStructure;
	chapters: PatChapter[]; // ordered, full content
}

export interface PatBuildResult {
	structure: PatStructure;
	chapters: Record<string, PatChapter>;
	full: PatFull;
}

const ROMAN_RE = /^([IVXLCDM]+)\.\s+/;

/** Strip Wikisource scaffolding from a `<p>` inner: remove `<sup>` footnote
 *  marks (Wikisource links to `#cite_note-…`), `<a>` wrappers, `<span>` page
 *  spans, but keep semantic emphasis (`<em>`, `<i>`, `<b>`, `<strong>`). */
function cleanInner(html: string): string {
	let h = html;
	// Drop footnote-marker sups: <sup ...><a ...>[N]</a></sup>
	h = h.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/g, '');
	// Drop Wikisource "page-number" spans and similar invisibles.
	h = h.replace(/<span[^>]*class="ws-[^"]*"[^>]*>[\s\S]*?<\/span>/g, '');
	// Drop the proofread page-break spans entirely with their content (they
	// hold just an empty link to the scanned image).
	h = h.replace(/<span[^>]*class="pagenum[^"]*"[^>]*>[\s\S]*?<\/span>/g, '');
	// Unwrap <a href="…">text</a> → text (we don't want wiki-internal links).
	for (let i = 0; i < 3; i++) {
		const next = h.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/g, '$1');
		if (next === h) break;
		h = next;
	}
	// Unwrap generic <span> wrappers (style-only).
	for (let i = 0; i < 3; i++) {
		const next = h.replace(/<span\b[^>]*>([\s\S]*?)<\/span>/g, '$1');
		if (next === h) break;
		h = next;
	}
	// Drop attrs on remaining tags, keep only href on <a> (already unwrapped).
	h = h.replace(/<(\/?)(\w+)([^>]*)>/g, (_full, slash: string, tag: string) => {
		return slash ? `</${tag}>` : `<${tag}>`;
	});
	// Collapse empty emphasis tags.
	for (let i = 0; i < 3; i++) {
		const next = h.replace(/<(b|i|em|strong|u)>\s*<\/\1>/g, '');
		if (next === h) break;
		h = next;
	}
	// Normalize whitespace.
	h = h.replace(/&nbsp;/g, ' ');
	h = h.replace(/&#160;/g, ' ');
	h = h.replace(/\s+/g, ' ').trim();
	// Convert bracketed verse markers ("[2]", "[3]", …) to small superscript
	// numbers. These mark the Hemmer/Méridier verse divisions inside each
	// chapter — rendered as accent-colored superscripts in the reader.
	h = h.replace(/\[(\d+)\]/g, '<sup class="verse-num">$1</sup>');
	return h;
}

/** Pull the chapter-leading Roman + "." off the start of a paragraph (so the
 *  Roman shows once in the chapter heading, not at the start of the body). */
function stripLeadingRoman(html: string): { roman: string; rest: string } | null {
	const m = ROMAN_RE.exec(html);
	if (!m) return null;
	return { roman: m[1]!, rest: html.slice(m[0].length).trim() };
}

export function buildPatristiqueWork(args: {
	html: string;
	config: Omit<PatWorkConfig, 'htmlPath'>;
}): PatBuildResult {
	const { html: s, config } = args;

	// Wikisource bakes the rendered chapter into `<div class="prp-pages-output">`.
	const bodyMatch =
		s.match(/<div class="prp-pages-output"[^>]*>([\s\S]*?)<noscript>/) ||
		s.match(/<div class="prp-pages-output"[^>]*>([\s\S]*?)<div class="printfooter"/);
	if (!bodyMatch) throw new Error(`No prp-pages-output found in ${config.slug}`);
	const body = bodyMatch[1]!;

	// Collect every <p>…</p> in document order.
	const paragraphs: string[] = [];
	const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/g;
	let pm: RegExpExecArray | null;
	while ((pm = pRe.exec(body))) paragraphs.push(pm[1] ?? '');

	// Stream paragraphs: a paragraph starting with "I." / "II." / etc. opens
	// a new chapter; subsequent paragraphs accumulate into the current
	// chapter's body until the next Roman-prefixed paragraph.
	const chapters: PatChapter[] = [];
	let current: { roman: string; ordinal: number; blocks: PatBlock[] } | null = null;
	let ordinal = 0;

	for (const raw of paragraphs) {
		const cleaned = cleanInner(raw);
		if (!cleaned) continue;
		const head = stripLeadingRoman(cleaned);
		if (head) {
			// flush previous
			if (current) {
				chapters.push({
					slug: `c-${current.ordinal}`,
					workSlug: config.slug,
					workTitle: config.title,
					ordinal: current.ordinal,
					roman: current.roman,
					label: `Chapitre ${current.roman}`,
					blocks: current.blocks
				});
			}
			ordinal += 1;
			current = { roman: head.roman, ordinal, blocks: [] };
			if (head.rest) current.blocks.push({ kind: 'paragraph', html: head.rest });
		} else if (current) {
			current.blocks.push({ kind: 'paragraph', html: cleaned });
		}
		// Pre-chapter content (front-matter blurb before "I.") is dropped —
		// the Wikisource header template lives there and isn't part of the work.
	}
	if (current) {
		chapters.push({
			slug: `c-${current.ordinal}`,
			workSlug: config.slug,
			workTitle: config.title,
			ordinal: current.ordinal,
			roman: current.roman,
			label: `Chapitre ${current.roman}`,
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
	const full: PatFull = { structure: null!, chapters };
	// (structure is filled in below, then assigned to full.structure)

	const structure: PatStructure = {
		slug: config.slug,
		title: config.title,
		...(config.subtitle ? { subtitle: config.subtitle } : {}),
		author: config.author,
		date: config.date,
		translator: config.translator,
		totalChapters: chapters.length,
		chapters: chapters.map((c) => ({
			slug: c.slug,
			ordinal: c.ordinal,
			roman: c.roman,
			label: c.label
		}))
	};

	full.structure = structure;
	return { structure, chapters: chapterMap, full };
}
