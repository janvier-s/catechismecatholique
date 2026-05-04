import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
	parseRange,
	expandRange,
	parseCccLinks,
	parseCommentaryFile,
	buildConcordancePericopes
} from '../../../scripts/prepare/concordance';
import type { BookInfo } from '../../../src/lib/utils/bibleBookSlug';
import type { NclSectionMap } from '../../../src/lib/data/types';

const FIX = join(__dirname, 'concordance-fixtures');

describe('parseRange', () => {
	it('parses a single verse', () => {
		expect(parseRange('1:1')).toEqual({ fromCh: 1, toCh: 1, fromV: 1, toV: 1 });
	});

	it('parses a same-chapter verse range', () => {
		expect(parseRange('1:26-29')).toEqual({ fromCh: 1, toCh: 1, fromV: 26, toV: 29 });
	});

	it('parses a chapter range with em-dash', () => {
		expect(parseRange('1—3')).toEqual({ fromCh: 1, toCh: 3, fromV: null, toV: null });
	});

	it('parses a chapter range with hyphen', () => {
		expect(parseRange('1-3')).toEqual({ fromCh: 1, toCh: 3, fromV: null, toV: null });
	});

	it('parses a cross-chapter verse range with em-dash', () => {
		expect(parseRange('1:1—11:26')).toEqual({ fromCh: 1, toCh: 11, fromV: 1, toV: 26 });
	});

	it('parses a single chapter', () => {
		expect(parseRange('5')).toEqual({ fromCh: 5, toCh: 5, fromV: null, toV: null });
	});

	it('returns null for unrecognized input', () => {
		expect(parseRange('foo')).toBeNull();
		expect(parseRange('')).toBeNull();
	});

	it('strips sub-verse letter suffixes from single verse', () => {
		expect(parseRange('19:25a')).toEqual({ fromCh: 19, toCh: 19, fromV: 25, toV: 25 });
		expect(parseRange('19:25b')).toEqual({ fromCh: 19, toCh: 19, fromV: 25, toV: 25 });
	});

	it('strips sub-verse letter suffix from end of verse range', () => {
		expect(parseRange('19:25-26a')).toEqual({ fromCh: 19, toCh: 19, fromV: 25, toV: 26 });
	});
});

describe('expandRange', () => {
	const ncl = {
		GEN: {
			'1': { '1': 'a', '2': 'b', '3': 'c' },
			'2': { '1': 'd', '2': 'e' }
		}
	};

	it('expands a same-chapter verse range', () => {
		expect(expandRange('GEN', { fromCh: 1, toCh: 1, fromV: 1, toV: 2 }, ncl)).toEqual([
			{ ch: 1, v: 1 },
			{ ch: 1, v: 2 }
		]);
	});

	it('expands a chapter range to every verse', () => {
		expect(expandRange('GEN', { fromCh: 1, toCh: 2, fromV: null, toV: null }, ncl)).toEqual([
			{ ch: 1, v: 1 },
			{ ch: 1, v: 2 },
			{ ch: 1, v: 3 },
			{ ch: 2, v: 1 },
			{ ch: 2, v: 2 }
		]);
	});

	it('expands a cross-chapter verse range', () => {
		expect(expandRange('GEN', { fromCh: 1, toCh: 2, fromV: 2, toV: 1 }, ncl)).toEqual([
			{ ch: 1, v: 2 },
			{ ch: 1, v: 3 },
			{ ch: 2, v: 1 }
		]);
	});

	it('skips verses missing from the NCL', () => {
		expect(expandRange('GEN', { fromCh: 1, toCh: 1, fromV: 5, toV: 7 }, ncl)).toEqual([]);
	});

	it('returns [] when the book is missing', () => {
		expect(expandRange('XYZ', { fromCh: 1, toCh: 1, fromV: 1, toV: 1 }, ncl)).toEqual([]);
	});

	it('expands a cross-chapter range that fully spans a middle chapter', () => {
		const ncl3 = {
			GEN: {
				'1': { '1': 'a', '2': 'b' },
				'2': { '1': 'c', '2': 'd' },
				'3': { '1': 'e', '2': 'f' }
			}
		};
		expect(expandRange('GEN', { fromCh: 1, toCh: 3, fromV: 2, toV: 1 }, ncl3)).toEqual([
			{ ch: 1, v: 2 },
			{ ch: 2, v: 1 },
			{ ch: 2, v: 2 },
			{ ch: 3, v: 1 }
		]);
	});
});

describe('parseCccLinks', () => {
	it('extracts a single paragraph number as a 1-wide range', () => {
		const html = `(CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p1.htm">199</a>)`;
		expect(parseCccLinks(html)).toEqual([{ from: 199, to: 199 }]);
	});

	it('extracts a comma-separated list as separate single-element ranges', () => {
		const html = `<a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p1.htm">280, 289</a>`;
		expect(parseCccLinks(html)).toEqual([
			{ from: 280, to: 280 },
			{ from: 289, to: 289 }
		]);
	});

	it('preserves a paragraph range as a single CccRange', () => {
		const html = `<a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p1.htm">337-340</a>`;
		expect(parseCccLinks(html)).toEqual([{ from: 337, to: 340 }]);
	});

	it('handles multiple anchors with mixed content (singles and ranges, sorted)', () => {
		const html = `(CCC
      <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p1.htm">295-299, 309-310</a>,
      <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p2.htm">2402</a>;
      <a href="http://www.vatican.va/roman_curia/foo.html">CSDC 108</a>)`;
		expect(parseCccLinks(html)).toEqual([
			{ from: 295, to: 299 },
			{ from: 309, to: 310 },
			{ from: 2402, to: 2402 }
		]);
	});

	it('ignores non-catechism vatican links', () => {
		const html = `<a href="http://www.vatican.va/roman_curia/foo">100</a>`;
		expect(parseCccLinks(html)).toEqual([]);
	});

	it('dedupes identical ranges and sorts by `from` ascending', () => {
		const html = `
      <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/x.htm">5, 3</a>
      <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/y.htm">3, 7</a>`;
		expect(parseCccLinks(html)).toEqual([
			{ from: 3, to: 3 },
			{ from: 5, to: 5 },
			{ from: 7, to: 7 }
		]);
	});

	it('returns [] when there are no catechism links', () => {
		expect(parseCccLinks('<p>plain text</p>')).toEqual([]);
	});
});

describe('parseCommentaryFile', () => {
	it('returns null for non-commentary files', () => {
		const html = readFileSync(join(FIX, 'genesis-text.html'), 'utf8');
		expect(parseCommentaryFile(html)).toBeNull();
	});

	it('extracts book name and entries from a commentary file', () => {
		const html = readFileSync(join(FIX, 'genesis-commentary.html'), 'utf8');
		const result = parseCommentaryFile(html);
		expect(result).not.toBeNull();
		expect(result!.bookName).toBe('Genesis');
		expect(result!.entries).toEqual([
			{
				range: '1-3',
				ccc: [
					{ from: 121, to: 123 },
					{ from: 199, to: 199 }
				]
			},
			{ range: '1:1', ccc: [{ from: 268, to: 268 }] },
			{ range: '1:26-29', ccc: [{ from: 295, to: 296 }] }
		]);
	});

	it('skips entries with empty ccc lists', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#x">1:1</a> No CCC here.</p>
    </body></html>`;
		const result = parseCommentaryFile(html);
		expect(result!.entries).toEqual([]);
	});
});

describe('buildConcordancePericopes', () => {
	const ncl = {
		GEN: {
			'1': Object.fromEntries(Array.from({ length: 31 }, (_, i) => [String(i + 1), `v${i + 1}`])),
			'2': Object.fromEntries(Array.from({ length: 25 }, (_, i) => [String(i + 1), `v${i + 1}`])),
			'3': Object.fromEntries(Array.from({ length: 24 }, (_, i) => [String(i + 1), `v${i + 1}`]))
		}
	};

	const books: BookInfo[] = [{ usfx: 'GEN', slug: 'genese', frenchName: 'Genèse', abbrs: ['Gn'] }];

	const knownParas = new Set([121, 122, 123, 199, 268, 295, 296, 390, 394, 395]);

	const sections: NclSectionMap = {
		GEN: [
			{ ch: 1, startV: 1, title: 'Création du monde' },
			{ ch: 2, startV: 4, title: "Création de l'homme" },
			{ ch: 3, startV: 1, title: 'La faute et le châtiment' }
		]
	};

	it('emits one pericope per Didache entry, attaches NCL title', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">3:1-24</a> the fall…
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">390, 394-395</a>)</p>
    </body></html>`;
		const r = buildConcordancePericopes([html], ncl, knownParas, books, sections);
		const ch3 = r.byBook.GEN![3]!;
		expect(ch3.pericopes).toHaveLength(1);
		expect(ch3.pericopes[0]).toMatchObject({
			verseRef: 'Genèse 3:1-24',
			startCh: 3,
			endCh: 3,
			startVerse: 1,
			endVerse: 24,
			pericopeTitle: 'La faute et le châtiment',
			cccRanges: [
				{ from: 390, to: 390 },
				{ from: 394, to: 395 }
			]
		});
		expect(ch3.totalEntries).toBe(1);
		expect(ch3.verseEntryCounts['1']).toBe(1);
		expect(ch3.verseEntryCounts['24']).toBe(1);
	});

	it('multi-chapter range is emitted into every chapter it spans', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">1—3</a> overview
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">121-123</a>)</p>
    </body></html>`;
		const r = buildConcordancePericopes([html], ncl, knownParas, books, sections);
		expect(r.byBook.GEN![1]!.pericopes).toHaveLength(1);
		expect(r.byBook.GEN![2]!.pericopes).toHaveLength(1);
		expect(r.byBook.GEN![3]!.pericopes).toHaveLength(1);
		expect(r.byBook.GEN![1]!.pericopes[0]!.verseRef).toBe('Genèse 1—3');
		expect(r.byBook.GEN![2]!.pericopes[0]!.startVerse).toBe(1);
		expect(r.byBook.GEN![2]!.pericopes[0]!.endVerse).toBe(25);
	});

	it('sorts pericopes by startVerse asc, broader first on ties', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">3:1-24</a> chapter
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">390</a>)</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos2">3:1-7</a> first part
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">394</a>)</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos3">3:15</a> protoevangelium
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">395</a>)</p>
    </body></html>`;
		const r = buildConcordancePericopes([html], ncl, knownParas, books, sections);
		const ps = r.byBook.GEN![3]!.pericopes;
		expect(ps.map((p) => p.verseRef)).toEqual(['Genèse 3:1-24', 'Genèse 3:1-7', 'Genèse 3:15']);
	});

	it('builds by-paragraph inverse', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">3:1-24</a>
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">390, 395</a>)</p>
    </body></html>`;
		const r = buildConcordancePericopes([html], ncl, knownParas, books, sections);
		expect(r.byParagraph['390']).toEqual([
			{
				slug: 'genese',
				usfx: 'GEN',
				bookFrenchName: 'Genèse',
				chapter: 3,
				verseRef: 'Genèse 3:1-24',
				pericopeTitle: 'La faute et le châtiment'
			}
		]);
		expect(r.byParagraph['395']).toHaveLength(1);
	});

	it('builds manifest mapping slug → sorted chapter list', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">3:1</a>
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">390</a>)</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos2">1:1</a>
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">268</a>)</p>
    </body></html>`;
		const r = buildConcordancePericopes([html], ncl, knownParas, books, sections);
		expect(r.manifest.genese).toEqual([1, 3]);
	});

	it('records books whose commentary file produced zero entries', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">1:1</a> No CCC here.</p>
    </body></html>`;
		const r = buildConcordancePericopes([html], ncl, knownParas, books, sections);
		expect(r.byBook).toEqual({});
		expect(r.stats.booksWithZeroEntries).toEqual(['Genesis']);
	});
});
