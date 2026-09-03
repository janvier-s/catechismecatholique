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

// §671 carries two separate sup markers both pointing at 1043. The reverse
// index answers "which paragraphs cite this one", so the citer belongs in it
// once, however many markers the prose spends on it.
it('lists a citer once even when it references the target twice', () => {
	const paragraphs = new Map([
		[671, { cross_refs: ['1043', '769', '1043'] }],
		[769, { cross_refs: [] }],
		[1043, { cross_refs: [] }]
	]);
	expect(buildCitedBy(paragraphs)).toEqual({ 769: [671], 1043: [671] });
});
