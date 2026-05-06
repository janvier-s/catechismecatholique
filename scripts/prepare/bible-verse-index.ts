import type { BibleVerseIndex } from '../../src/lib/data/types';
import type { BookInfo } from '../../src/lib/utils/bibleBookSlug';

type Ncl = Record<string, Record<string, Record<string, string>>>;
type BibleIdx = Record<string, number[]>;

// Build a quick reverse lookup: any abbr → BookInfo.
function abbrTable(books: BookInfo[]): Map<string, BookInfo> {
	const m = new Map<string, BookInfo>();
	for (const b of books) for (const a of b.abbrs) m.set(a, b);
	return m;
}

// Parses any of:
//   "Jn 1:14"           → { abbr: 'Jn', ch: 1, fromV: 14, toV: 14, fromCh: 1, toCh: 1 }
//   "1 Cor 10:1-6"      → fromV/toV range, single chapter
//   "1 Cor 1-6"         → chapter range, no verse (fromV/toV undefined)
function parseRefKey(key: string): {
	abbr: string;
	fromCh: number;
	toCh: number;
	fromV?: number;
	toV?: number;
} | null {
	// Single verse / verse range / chapter range
	const verseRe = /^([1-3]?\s*[A-Za-zÉéèêÊ]+)\s+(\d+):(\d+)(?:-(\d+))?$/;
	const chapterRe = /^([1-3]?\s*[A-Za-zÉéèêÊ]+)\s+(\d+)-(\d+)$/;
	let m = key.match(verseRe);
	if (m) {
		return {
			abbr: m[1]!.trim(),
			fromCh: parseInt(m[2]!, 10),
			toCh: parseInt(m[2]!, 10),
			fromV: parseInt(m[3]!, 10),
			toV: m[4] ? parseInt(m[4]!, 10) : parseInt(m[3]!, 10)
		};
	}
	m = key.match(chapterRe);
	if (m) {
		return {
			abbr: m[1]!.trim(),
			fromCh: parseInt(m[2]!, 10),
			toCh: parseInt(m[3]!, 10)
		};
	}
	return null;
}

export function buildBibleVerseIndex(
	ncl: Ncl,
	bibleIdx: BibleIdx,
	books: BookInfo[]
): BibleVerseIndex {
	const lookup = abbrTable(books);
	const out: BibleVerseIndex = {};

	const add = (usfx: string, ch: number, v: number, paragraphs: number[]) => {
		const byCh = (out[usfx] ??= {});
		const byV = (byCh[String(ch)] ??= {});
		const arr = (byV[String(v)] ??= []);
		for (const p of paragraphs) if (!arr.includes(p)) arr.push(p);
	};

	for (const [key, paragraphs] of Object.entries(bibleIdx)) {
		const parsed = parseRefKey(key);
		if (!parsed) continue;
		const book = lookup.get(parsed.abbr);
		if (!book) continue;
		const usfx = book.usfx;
		const bookData = ncl[usfx];
		if (!bookData) continue;

		for (let ch = parsed.fromCh; ch <= parsed.toCh; ch++) {
			const chData = bookData[String(ch)];
			if (!chData) continue;
			if (parsed.fromV === undefined) {
				// Chapter range: every verse of every chapter
				for (const v of Object.keys(chData)) {
					add(usfx, ch, parseInt(v, 10), paragraphs);
				}
			} else {
				// parseRefKey always sets toV when fromV is set; no fallback needed.
				for (let v = parsed.fromV; v <= parsed.toV!; v++) {
					if (chData[String(v)]) add(usfx, ch, v, paragraphs);
				}
			}
		}
	}

	// Sort each verse's paragraph list ascending
	for (const usfx of Object.keys(out)) {
		const byCh = out[usfx]!;
		for (const ch of Object.keys(byCh)) {
			const byV = byCh[ch]!;
			for (const v of Object.keys(byV)) byV[v]!.sort((a, b) => a - b);
		}
	}

	return out;
}
