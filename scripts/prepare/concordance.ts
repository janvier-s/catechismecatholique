// referenced in later tasks (M3-M5)
// import type { ConcordanceVerseIndex } from '../../src/lib/data/types';
// import type { BookInfo } from '../../src/lib/utils/bibleBookSlug';

export interface ParsedRange {
	fromCh: number;
	toCh: number;
	fromV: number | null;
	toV: number | null;
}

type Ncl = Record<string, Record<string, Record<string, string>>>;

/** Normalize em-dash (U+2014) and en-dash (U+2013) to hyphen. */
function normalizeDashes(s: string): string {
	return s.replace(/[–—]/g, '-');
}

/**
 * Parse a Didache verse-range token into structured form.
 * Returns null if no recognized form matches.
 */
export function parseRange(input: string): ParsedRange | null {
	const s = normalizeDashes(input).trim();
	if (!s) return null;

	// Cross-chapter verse range: "1:1-11:26"
	let m = s.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
	if (m) {
		return {
			fromCh: +m[1]!,
			toCh: +m[3]!,
			fromV: +m[2]!,
			toV: +m[4]!
		};
	}

	// Same-chapter verse range: "1:26-29"
	m = s.match(/^(\d+):(\d+)-(\d+)$/);
	if (m) {
		return {
			fromCh: +m[1]!,
			toCh: +m[1]!,
			fromV: +m[2]!,
			toV: +m[3]!
		};
	}

	// Single verse: "1:1"
	m = s.match(/^(\d+):(\d+)$/);
	if (m) {
		return {
			fromCh: +m[1]!,
			toCh: +m[1]!,
			fromV: +m[2]!,
			toV: +m[2]!
		};
	}

	// Chapter range: "1-3"
	m = s.match(/^(\d+)-(\d+)$/);
	if (m) {
		return {
			fromCh: +m[1]!,
			toCh: +m[2]!,
			fromV: null,
			toV: null
		};
	}

	// Single chapter: "5"
	m = s.match(/^(\d+)$/);
	if (m) {
		return {
			fromCh: +m[1]!,
			toCh: +m[1]!,
			fromV: null,
			toV: null
		};
	}

	return null;
}

/**
 * Expand a parsed range into the list of (ch, v) pairs that exist in `ncl`.
 * Skips verses absent from the NCL (e.g. variant numbering).
 */
export function expandRange(
	usfx: string,
	range: ParsedRange,
	ncl: Ncl
): { ch: number; v: number }[] {
	const bookData = ncl[usfx];
	if (!bookData) return [];

	const out: { ch: number; v: number }[] = [];
	for (let ch = range.fromCh; ch <= range.toCh; ch++) {
		const chData = bookData[String(ch)];
		if (!chData) continue;

		let lo: number, hi: number;
		if (range.fromV === null) {
			// Whole chapter
			const verseNums = Object.keys(chData)
				.map(Number)
				.sort((a, b) => a - b);
			if (verseNums.length === 0) continue;
			lo = verseNums[0]!;
			hi = verseNums[verseNums.length - 1]!;
		} else if (range.fromCh === range.toCh) {
			// Same-chapter range
			lo = range.fromV;
			hi = range.toV!;
		} else if (ch === range.fromCh) {
			// First chapter of cross-chapter range: from fromV to end of chapter
			lo = range.fromV;
			const verseNums = Object.keys(chData).map(Number);
			hi = Math.max(...verseNums);
		} else if (ch === range.toCh) {
			// Last chapter of cross-chapter range: from 1 to toV
			lo = 1;
			hi = range.toV!;
		} else {
			// Middle chapter: every verse
			const verseNums = Object.keys(chData)
				.map(Number)
				.sort((a, b) => a - b);
			if (verseNums.length === 0) continue;
			lo = verseNums[0]!;
			hi = verseNums[verseNums.length - 1]!;
		}

		for (let v = lo; v <= hi; v++) {
			if (chData[String(v)]) out.push({ ch, v });
		}
	}
	return out;
}

const CCC_HREF_RE = /vatican\.va\/archive\/ccc_css\/archive\/catechism\//i;
const ANCHOR_RE = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

/**
 * Strip nested HTML tags from anchor inner text and return the visible content.
 * Preserves digits, commas, hyphens, en-dash, em-dash, whitespace.
 */
function stripTags(html: string): string {
	return html.replace(/<[^>]+>/g, '').trim();
}

/**
 * Parse a single anchor's text payload into a list of paragraph numbers.
 * Examples:
 *   "199"          → [199]
 *   "280, 289"     → [280, 289]
 *   "337-340"      → [337, 338, 339, 340]
 *   "295-299, 309-310" → [295,296,297,298,299,309,310]
 */
function parseParagraphList(text: string): number[] {
	const cleaned = normalizeDashes(text).replace(/\s+/g, '');
	if (!cleaned) return [];
	const out: number[] = [];
	for (const part of cleaned.split(',')) {
		const m = part.match(/^(\d+)(?:-(\d+))?$/);
		if (!m) continue;
		const lo = +m[1]!;
		const hi = m[2] ? +m[2]! : lo;
		if (hi < lo || hi - lo > 200) continue; // sanity guard
		for (let n = lo; n <= hi; n++) out.push(n);
	}
	return out;
}

/**
 * Walk every <a> in the given HTML fragment; for those whose href points to
 * the CCC, parse the inner text as a paragraph list and accumulate. Result
 * is sorted ascending and deduplicated.
 */
export function parseCccLinks(html: string): number[] {
	const set = new Set<number>();
	let m: RegExpExecArray | null;
	ANCHOR_RE.lastIndex = 0;
	while ((m = ANCHOR_RE.exec(html))) {
		const href = m[1]!;
		if (!CCC_HREF_RE.test(href)) continue;
		const inner = stripTags(m[2]!);
		for (const n of parseParagraphList(inner)) set.add(n);
	}
	return Array.from(set).sort((a, b) => a - b);
}
