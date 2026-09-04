import { describe, it, expect } from 'vitest';
import { mergeVerseSpans, filterBlocksToSpan } from '../../../src/lib/utils/paragraphExcerpt';
import type { NclBlock } from '../../../src/lib/data/types';

describe('mergeVerseSpans', () => {
	it('keeps disjoint spans separate', () => {
		expect(
			mergeVerseSpans([
				{ from: 8, to: 10 },
				{ from: 3, to: 5 }
			])
		).toEqual([
			{ from: 3, to: 5 },
			{ from: 8, to: 10 }
		]);
	});

	it('merges adjacent spans (no verse skipped between them)', () => {
		expect(
			mergeVerseSpans([
				{ from: 3, to: 5 },
				{ from: 6, to: 8 }
			])
		).toEqual([{ from: 3, to: 8 }]);
	});

	it('merges overlapping spans', () => {
		expect(
			mergeVerseSpans([
				{ from: 3, to: 6 },
				{ from: 5, to: 8 }
			])
		).toEqual([{ from: 3, to: 8 }]);
	});

	it('merges a single-verse group next to a range', () => {
		expect(
			mergeVerseSpans([
				{ from: 16, to: 16 },
				{ from: 17, to: 17 }
			])
		).toEqual([{ from: 16, to: 17 }]);
	});
});

describe('filterBlocksToSpan', () => {
	const blocks: NclBlock[] = [
		{
			kind: 'prose',
			verses: [
				{ v: 1, html: 'one' },
				{ v: 2, html: 'two' },
				{ v: 3, html: 'three' }
			]
		},
		{
			kind: 'poetry',
			level: 1,
			verses: [
				{ v: 4, html: 'four' },
				{ v: 5, html: 'five' }
			]
		}
	];

	it('keeps only verses within the span, preserving block shape', () => {
		expect(filterBlocksToSpan(blocks, { from: 2, to: 4 })).toEqual([
			{
				kind: 'prose',
				verses: [
					{ v: 2, html: 'two' },
					{ v: 3, html: 'three' }
				]
			},
			{ kind: 'poetry', level: 1, verses: [{ v: 4, html: 'four' }] }
		]);
	});

	it('drops blocks left with no matching verse', () => {
		expect(filterBlocksToSpan(blocks, { from: 4, to: 5 })).toEqual([
			{
				kind: 'poetry',
				level: 1,
				verses: [
					{ v: 4, html: 'four' },
					{ v: 5, html: 'five' }
				]
			}
		]);
	});

	it('returns an empty array when nothing matches', () => {
		expect(filterBlocksToSpan(blocks, { from: 99, to: 100 })).toEqual([]);
	});
});
