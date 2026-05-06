import { describe, it, expect } from 'vitest';
import { buildCitedBy } from '../../../scripts/prepare/cited-by';

describe('buildCitedBy', () => {
	it('inverts cross_refs', () => {
		const paragraphs = new Map<number, { cross_refs: string[] }>([
			[10, { cross_refs: ['20', '30'] }],
			[20, { cross_refs: [] }],
			[30, { cross_refs: ['10'] }]
		]);
		const result = buildCitedBy(paragraphs);
		expect(result[20]).toEqual([10]);
		expect(result[30]).toEqual([10]);
		expect(result[10]).toEqual([30]);
	});

	it('skips refs to nonexistent paragraphs', () => {
		const paragraphs = new Map<number, { cross_refs: string[] }>([[1, { cross_refs: ['99999'] }]]);
		const result = buildCitedBy(paragraphs);
		expect(result[99999]).toBeUndefined();
	});
});
