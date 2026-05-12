/**
 * Catéchisme pour Adultes des Évêques de France (1991) — Markdown → JSON
 * builder.
 *
 * Source: a hand-cleaned markdown dump from catho.org. Structure is flat —
 * a top `# Catéchisme...` H1 followed by 416 `##` chapters with
 * `**N**`-numbered paragraphs (1..688). A handful of chapter titles arrived
 * with a stray leading `[` from a malformed wikilink in the original
 * source; we strip it.
 *
 * Output:
 *   structure.json — table-of-contents (slug, ordinal, title, paragraph
 *                    range) for the 416 chapters
 *   chapters/c-N.json — body shard for each chapter
 */
export type CpaBlock = { kind: 'paragraph'; n?: number; html: string };

export interface CpaChapter {
	slug: string; // local anchor id within the section page (e.g. "c-12")
	ordinal: number; // global chapter ordinal
	title: string;
	paraRange: [number, number];
	blocks: CpaBlock[];
}

export interface CpaChapterRef {
	slug: string;
	ordinal: number;
	title: string;
	paraRange: [number, number];
}

/** Section header — top-level grouping that bundles 1..N chapters. The
 *  source markdown encodes these as bare `## Section title` lines with no
 *  body between them and the next `##`. Sections are the unit of
 *  navigation: each section gets its own reader page with all its
 *  chapters inline, anchored as `#c-N`. */
export interface CpaSection {
	slug: string;
	ordinal: number;
	title: string;
	paraRange: [number, number] | null;
	chapters: CpaChapterRef[];
}

export interface CpaSectionFull {
	slug: string;
	ordinal: number;
	title: string;
	paraRange: [number, number] | null;
	chapters: CpaChapter[];
	prev?: { slug: string; title: string };
	next?: { slug: string; title: string };
}

export interface CpaStructure {
	slug: 'catechisme-adultes';
	title: string;
	subtitle: string;
	author: string;
	date: string;
	source: string;
	sections: CpaSection[];
	totalChapters: number;
	totalParagraphs: number;
}

export interface CpaBuildResult {
	structure: CpaStructure;
	sections: Record<string, CpaSectionFull>;
}

/** Minimal inline markdown → HTML: bold (**…**), italic (*…*), preserve
 *  punctuation. The source uses bold only for paragraph numbers and a few
 *  inline emphasis runs; italic for biblical references. */
function mdInline(s: string): string {
	let h = s;
	h = h.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
	h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	h = h.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
	// Escape lone ampersands so the output is well-formed.
	h = h.replace(/&(?![a-z]+;|#\d+;)/gi, '&amp;');
	return h;
}

/** Strip a leading `**N**` paragraph marker (with optional `.` after) and
 *  return the number plus the body. */
function stripLeadingNumber(line: string): { n?: number; body: string } {
	const m = /^\*\*(\d+)\*\*\.?\s*(.*)$/s.exec(line);
	if (!m) return { body: line };
	return { n: parseInt(m[1]!, 10), body: m[2]! };
}

/** Clean a chapter heading: strip the stray leading `[` artifact (some H2s
 *  arrived as `## [Title` from a malformed wikilink in the upstream dump). */
function cleanChapterTitle(s: string): string {
	return s.replace(/^\[\s*/, '').trim();
}

export function buildCpa(args: { markdown: string }): CpaBuildResult {
	const lines = args.markdown.split(/\r?\n/);

	// First pass: collect every H2 with its body paragraphs. The source has
	// two kinds of H2: section dividers (no `**N**` paragraphs follow) and
	// real chapters (paragraphs do follow). We separate them in the second
	// pass.
	interface RawH2 {
		title: string;
		blocks: CpaBlock[];
		paraNumbers: number[];
	}

	const rawH2s: RawH2[] = [];
	let current: RawH2 | null = null;
	let pendingPara: { n?: number; parts: string[] } | null = null;

	function flushPara() {
		if (!current || !pendingPara) return;
		const html = mdInline(pendingPara.parts.join(' ').trim());
		if (!html) {
			pendingPara = null;
			return;
		}
		const block: CpaBlock = pendingPara.n
			? { kind: 'paragraph', n: pendingPara.n, html }
			: { kind: 'paragraph', html };
		current.blocks.push(block);
		if (pendingPara.n !== undefined) current.paraNumbers.push(pendingPara.n);
		pendingPara = null;
	}

	for (const raw of lines) {
		const line = raw.trimEnd();
		if (line.startsWith('## ')) {
			flushPara();
			current = {
				title: cleanChapterTitle(line.replace(/^##\s+/, '')),
				blocks: [],
				paraNumbers: []
			};
			rawH2s.push(current);
			continue;
		}
		if (line.startsWith('# ') || line.startsWith('> ') || line.startsWith('### ')) continue;
		if (!current) continue;
		if (line === '') {
			flushPara();
			continue;
		}
		if (/^\*\*\d+\*\*/.test(line)) {
			flushPara();
			const { n, body } = stripLeadingNumber(line);
			pendingPara = { n, parts: [body] };
		} else if (pendingPara) {
			pendingPara.parts.push(line);
		} else {
			pendingPara = { parts: [line] };
		}
	}
	flushPara();

	// Second pass: group raw H2s into sections + chapters.
	//   - An H2 with body paragraphs is a CHAPTER.
	//   - An H2 with no body paragraphs is a SECTION header — every chapter
	//     that follows belongs to it until the next section header.
	//   - The lone "Introduction" up top has paragraphs but no section
	//     preceding it; we wrap it in a synthetic "Introduction" section.
	const sectionsFull: CpaSectionFull[] = [];
	let currentSection: { ref: CpaSection; full: CpaSectionFull } | null = null;
	let chapterOrdinal = 0;
	let totalParagraphs = 0;

	function slugify(s: string): string {
		return s
			.normalize('NFKD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[’‘'`]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.replace(/-{2,}/g, '-')
			.slice(0, 50);
	}
	const usedSlugs = new Set<string>();
	function uniqueSectionSlug(base: string): string {
		let slug = base || 'section';
		let i = 2;
		while (usedSlugs.has(slug)) slug = `${base}-${i++}`;
		usedSlugs.add(slug);
		return slug;
	}

	function openSection(title: string) {
		const slug = uniqueSectionSlug(slugify(title));
		const ordinal = sectionsFull.length + 1;
		const full: CpaSectionFull = {
			slug,
			ordinal,
			title,
			paraRange: null,
			chapters: []
		};
		sectionsFull.push(full);
		currentSection = {
			ref: { slug, ordinal, title, paraRange: null, chapters: [] },
			full
		};
	}

	for (const h2 of rawH2s) {
		const isChapter = h2.paraNumbers.length > 0;
		if (!isChapter) {
			openSection(h2.title);
			continue;
		}
		if (!currentSection) openSection('Introduction');
		const section = currentSection!;
		chapterOrdinal += 1;
		totalParagraphs += h2.paraNumbers.length;
		const slug = `c-${chapterOrdinal}`;
		const paraRange: [number, number] = [Math.min(...h2.paraNumbers), Math.max(...h2.paraNumbers)];
		const ref: CpaChapterRef = { slug, ordinal: chapterOrdinal, title: h2.title, paraRange };
		section.ref.chapters.push(ref);
		section.full.chapters.push({
			slug,
			ordinal: chapterOrdinal,
			title: h2.title,
			paraRange,
			blocks: h2.blocks
		});
	}

	// Compute each section's overall paragraph range from its chapters' ranges
	// and wire prev/next pointers between adjacent sections.
	for (const sec of sectionsFull) {
		if (sec.chapters.length > 0) {
			const lo = Math.min(...sec.chapters.map((c) => c.paraRange[0]));
			const hi = Math.max(...sec.chapters.map((c) => c.paraRange[1]));
			sec.paraRange = [lo, hi];
		}
	}
	for (let i = 0; i < sectionsFull.length; i++) {
		const s = sectionsFull[i]!;
		const prev = sectionsFull[i - 1];
		const next = sectionsFull[i + 1];
		if (prev) s.prev = { slug: prev.slug, title: prev.title };
		if (next) s.next = { slug: next.slug, title: next.title };
	}

	// Build the slim structure (refs only) for the index/sidebar.
	const sections: CpaSection[] = sectionsFull.map((s) => ({
		slug: s.slug,
		ordinal: s.ordinal,
		title: s.title,
		paraRange: s.paraRange,
		chapters: s.chapters.map((c) => ({
			slug: c.slug,
			ordinal: c.ordinal,
			title: c.title,
			paraRange: c.paraRange
		}))
	}));

	const fullMap: Record<string, CpaSectionFull> = {};
	for (const s of sectionsFull) fullMap[s.slug] = s;

	const structure: CpaStructure = {
		slug: 'catechisme-adultes',
		title: 'Catéchisme pour Adultes des Évêques de France',
		subtitle: 'Catéchisme pour adultes catholiques',
		author: 'Conférence des Évêques de France',
		date: '1991',
		source: 'catho.org',
		sections,
		totalChapters: chapterOrdinal,
		totalParagraphs
	};

	return { structure, sections: fullMap };
}
