import type { ConcordanceVerseIndex } from '../../src/lib/data/types';
import type { BookInfo } from '../../src/lib/utils/bibleBookSlug';

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
// Didache HTML uses double-quoted href attributes exclusively; we don't
// match single-quoted forms.
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
		if (hi < lo) continue;
		if (hi - lo > 500) {
			console.warn(`[concordance] dropping suspiciously large paragraph range: ${lo}-${hi}`);
			continue;
		}
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

export interface CommentaryEntry {
	range: string; // raw range token, dashes already normalized
	ccc: number[]; // sorted ascending, deduplicated
}

export interface CommentaryFile {
	bookName: string; // e.g. "Genesis", "1 Corinthians", "the Gospel of John"
	entries: CommentaryEntry[];
}

const COMMENTARY_HEADING_RE =
	/<p\s+class="calibre_3"[^>]*>\s*(?:<[^>]+>\s*)*Commentary on ([^<]+?)\s*(?:<[^>]+>\s*)*<\/p>/i;

const BIBLE_BACKLINK_RE = /^index_split_\d+\.html#filepos\d+$/i;

/**
 * Match a single commentary paragraph: a <p class="calibre_6"> or
 * <p class="calibre_16"> whose first <a> is a back-link to the Bible
 * text (index_split_NNN.html#filepos...). Returns the paragraph's
 * inner HTML and the leading range token, or null if not a commentary
 * entry.
 */
const ENTRY_BLOCK_RE = /<p\s+class="calibre_(?:6|16)"[^>]*>([\s\S]*?)<\/p>/gi;

function extractRangeAndBody(inner: string): { range: string; body: string } | null {
	const m = inner.match(/^\s*(?:<[^>]+>\s*)*<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
	if (!m) return null;
	if (!BIBLE_BACKLINK_RE.test(m[1]!)) return null;
	const range = stripTags(m[2]!);
	return { range: normalizeDashes(range), body: inner };
}

export function parseCommentaryFile(html: string): CommentaryFile | null {
	const head = html.match(COMMENTARY_HEADING_RE);
	if (!head) return null;
	const bookName = head[1]!.replace(/\s+/g, ' ').trim();

	const entries: CommentaryEntry[] = [];
	let m: RegExpExecArray | null;
	ENTRY_BLOCK_RE.lastIndex = 0;
	while ((m = ENTRY_BLOCK_RE.exec(html))) {
		const inner = m[1]!;
		const entry = extractRangeAndBody(inner);
		if (!entry) continue;
		const ccc = parseCccLinks(entry.body);
		if (ccc.length === 0) continue;
		entries.push({ range: entry.range, ccc });
	}

	return { bookName, entries };
}

export interface BuildStats {
	filesScanned: number;
	commentaryFiles: number;
	entriesProcessed: number;
	unknownBooks: string[];
	unknownParagraphs: number[];
	unparseableRanges: string[];
}

export interface BuildResult {
	index: ConcordanceVerseIndex;
	stats: BuildStats;
}

export const DIDACHE_BOOK_TO_USFX: Record<string, string> = {
	Genesis: 'GEN',
	Exodus: 'EXO',
	Leviticus: 'LEV',
	Numbers: 'NUM',
	Deuteronomy: 'DEU',
	Joshua: 'JOS',
	Judges: 'JDG',
	Ruth: 'RUT',
	'1 Samuel': '1SA',
	'2 Samuel': '2SA',
	'1 Kings': '1KI',
	'2 Kings': '2KI',
	'1 Chronicles': '1CH',
	'2 Chronicles': '2CH',
	Ezra: 'EZR',
	Nehemiah: 'NEH',
	Tobit: 'TOB',
	Judith: 'JDT',
	Esther: 'EST',
	'1 Maccabees': '1MA',
	'2 Maccabees': '2MA',
	Job: 'JOB',
	'the Psalms': 'PSA',
	Proverbs: 'PRO',
	Ecclesiastes: 'ECC',
	'the Song of Solomon': 'SNG',
	'the Wisdom of Solomon': 'WIS',
	Sirach: 'SIR',
	Isaiah: 'ISA',
	Jeremiah: 'JER',
	Lamentations: 'LAM',
	Baruch: 'BAR',
	Ezekiel: 'EZK',
	Daniel: 'DAN',
	Hosea: 'HOS',
	Joel: 'JOL',
	Amos: 'AMO',
	Obadiah: 'OBA',
	Jonah: 'JON',
	Micah: 'MIC',
	Nahum: 'NAM',
	Habakkuk: 'HAB',
	Zephaniah: 'ZEP',
	Haggai: 'HAG',
	Zechariah: 'ZEC',
	Malachi: 'MAL',
	Matthew: 'MAT',
	Mark: 'MRK',
	Luke: 'LUK',
	'the Gospel of John': 'JHN',
	'the Acts of the Apostles': 'ACT',
	Romans: 'ROM',
	'1 Corinthians': '1CO',
	'2 Corinthians': '2CO',
	Galatians: 'GAL',
	Ephesians: 'EPH',
	Philippians: 'PHP',
	Colossians: 'COL',
	'1 Thessalonians': '1TH',
	'2 Thessalonians': '2TH',
	'1 Timothy': '1TI',
	'2 Timothy': '2TI',
	Titus: 'TIT',
	Philemon: 'PHM',
	Hebrews: 'HEB',
	James: 'JAS',
	'1 Peter': '1PE',
	'2 Peter': '2PE',
	'1 John': '1JN',
	'2 John': '2JN',
	'3 John': '3JN',
	Jude: 'JUD',
	Revelation: 'REV'
};

export function buildConcordance(
	htmlFiles: string[],
	ncl: Ncl,
	knownParas: Set<number>,
	books: BookInfo[]
): BuildResult {
	const validUsfx = new Set(books.map((b) => b.usfx));
	const stats: BuildStats = {
		filesScanned: htmlFiles.length,
		commentaryFiles: 0,
		entriesProcessed: 0,
		unknownBooks: [],
		unknownParagraphs: [],
		unparseableRanges: []
	};
	const unknownBookSet = new Set<string>();
	const unknownParaSet = new Set<number>();
	const unparseableSet = new Set<string>();

	const index: ConcordanceVerseIndex = {};

	const add = (usfx: string, ch: number, v: number, paras: number[]) => {
		const byCh = (index[usfx] ??= {});
		const byV = (byCh[String(ch)] ??= {});
		const arr = (byV[String(v)] ??= []);
		for (const p of paras) if (!arr.includes(p)) arr.push(p);
	};

	for (const html of htmlFiles) {
		const file = parseCommentaryFile(html);
		if (!file) continue;
		stats.commentaryFiles++;

		const usfx = DIDACHE_BOOK_TO_USFX[file.bookName];
		if (!usfx || !validUsfx.has(usfx)) {
			unknownBookSet.add(file.bookName);
			continue;
		}

		for (const entry of file.entries) {
			const range = parseRange(entry.range);
			if (!range) {
				unparseableSet.add(entry.range);
				continue;
			}

			const filteredParas: number[] = [];
			for (const p of entry.ccc) {
				if (knownParas.has(p)) filteredParas.push(p);
				else unknownParaSet.add(p);
			}
			if (filteredParas.length === 0) continue;

			const targets = expandRange(usfx, range, ncl);
			for (const { ch, v } of targets) {
				add(usfx, ch, v, filteredParas);
			}
			stats.entriesProcessed++;
		}
	}

	// Sort each verse's array
	for (const usfx of Object.keys(index)) {
		const byCh = index[usfx]!;
		for (const ch of Object.keys(byCh)) {
			const byV = byCh[ch]!;
			for (const v of Object.keys(byV)) byV[v]!.sort((a, b) => a - b);
		}
	}

	stats.unknownBooks = Array.from(unknownBookSet).sort();
	stats.unknownParagraphs = Array.from(unknownParaSet).sort((a, b) => a - b);
	stats.unparseableRanges = Array.from(unparseableSet).sort();

	return { index, stats };
}
