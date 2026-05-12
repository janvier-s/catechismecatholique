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
	/** First/last paragraph number rendered in this chapter, or null when the
	 *  chapter has no numbered paragraphs (Introduction sections etc.). */
	paraRange: [number, number] | null;
}

export interface CpaStructure {
	slug: 'catechisme-adultes';
	title: string;
	subtitle: string;
	author: string;
	date: string;
	source: string;
	chapters: CpaChapterRef[];
	totalChapters: number;
	totalParagraphs: number;
}

export interface CpaChapter {
	slug: string;
	ordinal: number;
	title: string;
	paraRange: [number, number] | null;
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

	interface PendingChapter {
		ordinal: number;
		title: string;
		blocks: CpaBlock[];
		paraNumbers: number[];
	}

	const chaptersArr: PendingChapter[] = [];
	let current: PendingChapter | null = null;
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

		// New chapter
		if (line.startsWith('## ')) {
			flushPara();
			const title = cleanChapterTitle(line.replace(/^##\s+/, ''));
			current = {
				ordinal: chaptersArr.length + 1,
				title,
				blocks: [],
				paraNumbers: []
			};
			chaptersArr.push(current);
			continue;
		}
		// Skip the document-level title and stray blockquote intro line.
		if (line.startsWith('# ') || line.startsWith('> ')) continue;
		// Sub-headings aren't expected in this source, but skip defensively.
		if (line.startsWith('### ')) continue;

		if (!current) continue;

		if (line === '') {
			flushPara();
			continue;
		}

		// New numbered paragraph
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

	// Build final shape with prev/next + paragraph ranges
	const chaptersMap: Record<string, CpaChapter> = {};
	const refs: CpaChapterRef[] = [];
	let totalParagraphs = 0;
	for (const pc of chaptersArr) {
		const slug = `c-${pc.ordinal}`;
		const paraRange: [number, number] | null = pc.paraNumbers.length
			? [Math.min(...pc.paraNumbers), Math.max(...pc.paraNumbers)]
			: null;
		totalParagraphs += pc.paraNumbers.length;
		const ch: CpaChapter = {
			slug,
			ordinal: pc.ordinal,
			title: pc.title,
			paraRange,
			blocks: pc.blocks
		};
		chaptersMap[slug] = ch;
		refs.push({ slug, ordinal: pc.ordinal, title: pc.title, paraRange });
	}
	// Wire prev/next on chapter records
	for (let i = 0; i < refs.length; i++) {
		const r = refs[i]!;
		const prev = refs[i - 1];
		const next = refs[i + 1];
		const c = chaptersMap[r.slug]!;
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
		chapters: refs,
		totalChapters: refs.length,
		totalParagraphs
	};

	return { structure, chapters: chaptersMap };
}
