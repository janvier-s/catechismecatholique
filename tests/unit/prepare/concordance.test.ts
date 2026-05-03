import { describe, it, expect } from 'vitest';
import { parseRange, expandRange } from '../../../scripts/prepare/concordance';

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
});
