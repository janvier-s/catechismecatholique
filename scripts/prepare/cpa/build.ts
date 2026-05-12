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

export interface CpaChapterRef {
	slug: string;
	ordinal: number;
	title: string;
	/** First/last paragraph number in this chapter. */
	paraRange: [number, number];
}

/** Section header — a top-level grouping that bundles 1..N chapters. The
 *  source markdown encodes these as `## Section title` lines with no body
 *  between them and the next `##`. Sections themselves don't have reader
 *  pages, only the chapters under them do. */
export interface CpaSection {
	slug: string;
	ordinal: number;
	title: string;
	chapters: CpaChapterRef[];
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

export interface CpaChapter {
	slug: string;
	ordinal: number;
	title: string;
	paraRange: [number, number];
	sectionSlug: string;
	sectionTitle: string;
	blocks: CpaBlock[];
	prev?: { slug: string; title: string };
	next?: { slug: string; title: string };
}

export interface CpaBuildResult {
	structure: CpaStructure;
	chapters: Record<string, CpaChapter>;
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
	const sections: CpaSection[] = [];
	const chaptersMap: Record<string, CpaChapter> = {};
	let currentSection: CpaSection | null = null;
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
			.slice(0, 60);
	}
	function uniqueSectionSlug(base: string): string {
		let slug = `s-${sections.length + 1}-${base}`.slice(0, 60).replace(/-+$/, '');
		// Ensure uniqueness — slugify collisions are vanishingly rare here,
		// but stay defensive.
		let i = 2;
		while (sections.some((s) => s.slug === slug)) slug = `${slug}-${i++}`;
		return slug;
	}

	for (const h2 of rawH2s) {
		const isChapter = h2.paraNumbers.length > 0;
		if (!isChapter) {
			// Section header
			const sectionSlug = uniqueSectionSlug(slugify(h2.title));
			currentSection = {
				slug: sectionSlug,
				ordinal: sections.length + 1,
				title: h2.title,
				chapters: []
			};
			sections.push(currentSection);
			continue;
		}
		// Chapter — ensure we have a section to attach to.
		if (!currentSection) {
			currentSection = {
				slug: uniqueSectionSlug('introduction'),
				ordinal: sections.length + 1,
				title: 'Introduction',
				chapters: []
			};
			sections.push(currentSection);
		}
		chapterOrdinal += 1;
		totalParagraphs += h2.paraNumbers.length;
		const slug = `c-${chapterOrdinal}`;
		const paraRange: [number, number] = [Math.min(...h2.paraNumbers), Math.max(...h2.paraNumbers)];
		const ref: CpaChapterRef = { slug, ordinal: chapterOrdinal, title: h2.title, paraRange };
		currentSection.chapters.push(ref);
		chaptersMap[slug] = {
			slug,
			ordinal: chapterOrdinal,
			title: h2.title,
			paraRange,
			sectionSlug: currentSection.slug,
			sectionTitle: currentSection.title,
			blocks: h2.blocks
		};
	}

	// Wire prev/next across the global chapter sequence so the reader can
	// navigate seamlessly from one chapter to the next regardless of which
	// section they fall under.
	const flat: CpaChapter[] = [];
	for (const s of sections) for (const r of s.chapters) flat.push(chaptersMap[r.slug]!);
	for (let i = 0; i < flat.length; i++) {
		const c = flat[i]!;
		const prev = flat[i - 1];
		const next = flat[i + 1];
		if (prev) c.prev = { slug: prev.slug, title: prev.title };
		if (next) c.next = { slug: next.slug, title: next.title };
	}

	const structure: CpaStructure = {
		slug: 'catechisme-adultes',
		title: 'Catéchisme pour Adultes des Évêques de France',
		subtitle: 'Catéchisme pour adultes catholiques',
		author: 'Conférence des Évêques de France',
		date: '1991',
		source: 'catho.org',
		sections,
		totalChapters: flat.length,
		totalParagraphs
	};

	return { structure, chapters: chaptersMap };
}
