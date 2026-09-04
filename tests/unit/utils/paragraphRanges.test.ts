import { describe, it, expect } from 'vitest';
import { compactRanges } from '../../../src/lib/utils/paragraphRanges';

describe('compactRanges', () => {
	it('groups consecutive numbers into a range', () => {
		expect(compactRanges([1, 2, 3])).toEqual(['1-3']);
	});

	it('keeps non-consecutive numbers separate', () => {
		expect(compactRanges([1, 3, 5])).toEqual(['1', '3', '5']);
	});

	it('mixes ranges and singles', () => {
		expect(compactRanges([1, 2, 3, 5, 7, 8])).toEqual(['1-3', '5', '7-8']);
	});

	it('sorts and dedupes unordered input', () => {
		expect(compactRanges([8, 1, 2, 7, 3, 2])).toEqual(['1-3', '7-8']);
	});

	it('returns an empty array for no input', () => {
		expect(compactRanges([])).toEqual([]);
	});
});
