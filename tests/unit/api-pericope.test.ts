import { describe, it, expect } from 'vitest';
import { resolvePericope, unionParagraphs, parseRefs, MAX_REFS } from '$lib/server/api/pericope';
import type { BibleVerseIndex } from '$lib/data/types';

const index: BibleVerseIndex = {
	LUK: { '7': { '11': [994], '12': [994], '16': [1503] } },
	MAT: {
		'26': { '14': [1], '26': [2], '75': [3] },
		'27': { '1': [4], '66': [5], '67': [6] }
	},
	REV: { '4': { '2': [10], '8': [11] } }
};

describe('resolvePericope', () => {
	it('unions the paragraphs across a verse range', () => {
		const r = resolvePericope('Lc 7, 11-16', index);
		expect(r).toMatchObject({ ref: 'Lc 7, 11-16', book_slug: 'luc', paragraphs: [994, 1503] });
	});

	it('reports the per-verse breakdown for the verses it covered', () => {
		const r = resolvePericope('Lc 7, 11-16', index) as { verses: Record<string, number[]> };
		expect(r.verses).toEqual({ '11': [994], '12': [994], '16': [1503] });
	});

	it('takes the whole chapter when no verse is given', () => {
		expect(resolvePericope('Ap 4', index)).toMatchObject({ paragraphs: [10, 11] });
	});

	it('walks from the start verse to the end of the chapter and into the next', () => {
		// Mt 26:14 to the end of 26, then all of 27 up to verse 66. 27:67 is out.
		expect(resolvePericope('Mt 26, 14 – 27, 66', index)).toMatchObject({
			paragraphs: [1, 2, 3, 4, 5]
		});
	});

	it('returns an empty list, not an error, when nothing cites the passage', () => {
		expect(resolvePericope('Ap 4, 1', index)).toMatchObject({ paragraphs: [], verses: {} });
	});

	it('returns a coded error for a reference it cannot parse', () => {
		expect(resolvePericope('n’importe quoi', index)).toEqual({
			ref: 'n’importe quoi',
			error: expect.stringContaining('Référence'),
			code: 'bad_reference'
		});
	});

	it('deduplicates a paragraph cited by several verses of the range', () => {
		const r = resolvePericope('Lc 7, 11-12', index) as { paragraphs: number[] };
		expect(r.paragraphs).toEqual([994]);
	});
});

describe('parseRefs', () => {
	it('reads repeated ref parameters', () => {
		const p = new URLSearchParams([
			['ref', 'Lc 7, 11-16'],
			['ref', 'Jn 3, 16']
		]);
		expect(parseRefs(p)).toEqual({ ok: true, refs: ['Lc 7, 11-16', 'Jn 3, 16'] });
	});

	it('splits a semicolon-separated list, so one parameter can carry many', () => {
		const p = new URLSearchParams([['ref', 'Lc 7, 11-16; Jn 3, 16']]);
		expect(parseRefs(p)).toEqual({ ok: true, refs: ['Lc 7, 11-16', 'Jn 3, 16'] });
	});

	it('refuses a request with no ref at all', () => {
		expect(parseRefs(new URLSearchParams())).toMatchObject({ ok: false, code: 'bad_reference' });
	});

	it('refuses more refs than the cap', () => {
		const p = new URLSearchParams();
		for (let i = 0; i <= MAX_REFS; i++) p.append('ref', `Jn 3, ${i + 1}`);
		expect(parseRefs(p)).toMatchObject({ ok: false, code: 'too_many_refs' });
	});

	it('accepts exactly the cap', () => {
		const p = new URLSearchParams();
		for (let i = 0; i < MAX_REFS; i++) p.append('ref', `Jn 3, ${i + 1}`);
		expect(parseRefs(p)).toMatchObject({ ok: true });
	});
});

describe('unionParagraphs', () => {
	it('merges and dedupes the paragraphs across every ref', () => {
		const items = [
			{ ref: 'a', paragraphs: [994, 1503] },
			{ ref: 'b', paragraphs: [219, 994] }
		];
		expect(unionParagraphs(items as never)).toEqual([219, 994, 1503]);
	});

	it('ignores refs that failed to parse', () => {
		const items = [
			{ ref: 'a', paragraphs: [994] },
			{ ref: 'bogus', error: 'illisible', code: 'bad_reference' }
		];
		expect(unionParagraphs(items as never)).toEqual([994]);
	});

	it('returns an empty list when nothing is cited', () => {
		expect(unionParagraphs([])).toEqual([]);
	});
});
