import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
	parseRange,
	expandRange,
	parseCccLinks,
	parseCommentaryFile,
	buildConcordance
} from '../../../scripts/prepare/concordance';
import type { BookInfo } from '../../../src/lib/utils/bibleBookSlug';

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
	it('extracts a single paragraph number', () => {
		const html = `(CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p1.htm">199</a>)`;
		expect(parseCccLinks(html)).toEqual([199]);
	});

	it('extracts a comma-separated list', () => {
		const html = `<a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p1.htm">280, 289</a>`;
		expect(parseCccLinks(html)).toEqual([280, 289]);
	});

	it('expands a paragraph range', () => {
		const html = `<a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p1.htm">337-340</a>`;
		expect(parseCccLinks(html)).toEqual([337, 338, 339, 340]);
	});

	it('handles multiple anchors with mixed content', () => {
		const html = `(CCC
      <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p1.htm">295-299, 309-310</a>,
      <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p2.htm">2402</a>;
      <a href="http://www.vatican.va/roman_curia/foo.html">CSDC 108</a>)`;
		expect(parseCccLinks(html)).toEqual([295, 296, 297, 298, 299, 309, 310, 2402]);
	});

	it('ignores non-catechism vatican links', () => {
		const html = `<a href="http://www.vatican.va/roman_curia/foo">100</a>`;
		expect(parseCccLinks(html)).toEqual([]);
	});

	it('deduplicates and sorts ascending', () => {
		const html = `
      <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/x.htm">5, 3</a>
      <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/y.htm">3, 7</a>`;
		expect(parseCccLinks(html)).toEqual([3, 5, 7]);
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
			{ range: '1-3', ccc: [121, 122, 123, 199] },
			{ range: '1:1', ccc: [268] },
			{ range: '1:26-29', ccc: [295, 296] }
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

describe('buildConcordance', () => {
	const ncl = {
		GEN: {
			'1': Object.fromEntries(Array.from({ length: 31 }, (_, i) => [String(i + 1), `v${i + 1}`]))
		}
	};

	const books: BookInfo[] = [{ usfx: 'GEN', slug: 'genese', frenchName: 'Genèse', abbrs: ['Gn'] }];

	const knownParas = new Set([121, 122, 123, 199, 268, 295, 296]);

	it('builds a per-verse index from a single commentary file', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6" id="x"><a href="index_split_018.html#filepos1">1:1</a> Foo
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">268</a>)</p>
      <p class="calibre_6" id="y"><a href="index_split_018.html#filepos2">1:26-29</a> Bar
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">295-296</a>)</p>
    </body></html>`;
		const result = buildConcordance([html], ncl, knownParas, books);
		expect(result.index.GEN!['1']!['1']).toEqual([268]);
		expect(result.index.GEN!['1']!['26']).toEqual([295, 296]);
		expect(result.index.GEN!['1']!['27']).toEqual([295, 296]);
		expect(result.index.GEN!['1']!['28']).toEqual([295, 296]);
		expect(result.index.GEN!['1']!['29']).toEqual([295, 296]);
		expect(result.index.GEN!['1']!['2']).toBeUndefined();
		expect(result.stats.entriesProcessed).toBe(2);
		expect(result.stats.unknownBooks).toEqual([]);
		expect(result.stats.unknownParagraphs).toEqual([]);
	});

	it('records unknown CCC paragraph numbers and drops them', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">1:1</a>
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">268, 99999</a>)</p>
    </body></html>`;
		const result = buildConcordance([html], ncl, knownParas, books);
		expect(result.index.GEN!['1']!['1']).toEqual([268]);
		expect(result.stats.unknownParagraphs).toEqual([99999]);
	});

	it('records unknown book names and drops their entries', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Frobotz</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">1:1</a>
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">268</a>)</p>
    </body></html>`;
		const result = buildConcordance([html], ncl, knownParas, books);
		expect(result.index).toEqual({});
		expect(result.stats.unknownBooks).toEqual(['Frobotz']);
		expect(result.stats.booksWithZeroEntries).toEqual([]);
	});

	it('records books whose commentary file produced zero entries', () => {
		const html = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">1:1</a> No CCC here.</p>
    </body></html>`;
		const result = buildConcordance([html], ncl, knownParas, books);
		expect(result.index).toEqual({});
		expect(result.stats.booksWithZeroEntries).toEqual(['Genesis']);
	});

	it('merges multiple commentary files for the same book', () => {
		const a = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos1">1:1</a>
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">268</a>)</p>
    </body></html>`;
		const b = `<html><body>
      <p class="calibre_3">Commentary on Genesis</p>
      <p class="calibre_6"><a href="index_split_018.html#filepos2">1:1</a>
        (CCC <a href="http://www.vatican.va/archive/ccc_css/archive/catechism/p.htm">295</a>)</p>
    </body></html>`;
		const result = buildConcordance([a, b], ncl, knownParas, books);
		expect(result.index.GEN!['1']!['1']).toEqual([268, 295]);
	});
});
