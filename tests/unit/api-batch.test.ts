import { describe, it, expect } from 'vitest';
import { parseNumbers, MAX_ITEMS } from '$lib/server/api/batch';

describe('parseNumbers', () => {
	it('parses an explicit comma-separated list', () => {
		expect(parseNumbers('1,2,3', null)).toEqual({ ok: true, numbers: [1, 2, 3] });
	});

	it('deduplicates and sorts', () => {
		expect(parseNumbers('3,1,3', null)).toEqual({ ok: true, numbers: [1, 3] });
	});

	it('parses an inclusive range', () => {
		expect(parseNumbers(null, '10-13')).toEqual({ ok: true, numbers: [10, 11, 12, 13] });
	});

	it('rejects a range whose end precedes its start', () => {
		const r = parseNumbers(null, '13-10');
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('paragraph_out_of_range');
	});

	it('rejects a malformed range', () => {
		const r = parseNumbers(null, '10..25');
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('paragraph_out_of_range');
	});

	it('rejects a number outside 1..2865', () => {
		const r = parseNumbers('0', null);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('paragraph_out_of_range');
	});

	it('accepts both ends of the valid paragraph range', () => {
		expect(parseNumbers('1,2865', null)).toEqual({ ok: true, numbers: [1, 2865] });
	});

	it('rejects a paragraph one past the end of the Catechism', () => {
		const r = parseNumbers('2866', null);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('paragraph_out_of_range');
	});

	it('rejects a non-numeric entry', () => {
		const r = parseNumbers('1,deux', null);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('paragraph_out_of_range');
	});

	// A distinct code from too_many_blocks: a client that asked for 51
	// paragraphs needs to shrink its range, not its include list.
	it('rejects more than MAX_ITEMS paragraphs with its own code', () => {
		const r = parseNumbers(null, `1-${MAX_ITEMS + 1}`);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('too_many_paragraphs');
	});

	// Boundary from the other side. Without this, mutating the cap check from
	// `>` to `>=` would wrongly reject exactly MAX_ITEMS and no test would say so.
	it('accepts exactly MAX_ITEMS paragraphs', () => {
		const r = parseNumbers(null, `1-${MAX_ITEMS}`);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.numbers).toHaveLength(MAX_ITEMS);
	});

	it('requires either numbers or range', () => {
		const r = parseNumbers(null, null);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('paragraph_out_of_range');
	});

	it('treats whitespace-only parameters as absent', () => {
		const r = parseNumbers('   ', '  ');
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('paragraph_out_of_range');
	});
});
