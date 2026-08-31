import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { matchConcordance } from '../../../scripts/prepare/concordanceMatcher';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'concordance-matcher-fixtures');

describe('matchConcordance', () => {
	it('collects cccRanges from every pericope overlapping the ref', () => {
		const result = matchConcordance({ slug: 'ephesiens', chapter: 1, ranges: [[1, 10]] }, FIXTURES);
		expect(result).toEqual([
			{ from: 442, to: 442 },
			{ from: 257, to: 258 },
			{ from: 381, to: 381 }
		]);
	});

	it('excludes pericopes outside the cited verse range', () => {
		const result = matchConcordance({ slug: 'luc', chapter: 4, ranges: [[16, 20]] }, FIXTURES);
		expect(result).toEqual([
			{ from: 453, to: 453 },
			{ from: 695, to: 695 }
		]);
	});

	it('matches across multiple disjoint ranges (compound refs)', () => {
		const result = matchConcordance(
			{
				slug: 'luc',
				chapter: 4,
				ranges: [
					[18, 19],
					[24, 24]
				]
			},
			FIXTURES
		);
		expect(result).toEqual([
			{ from: 453, to: 453 },
			{ from: 695, to: 695 },
			{ from: 558, to: 558 }
		]);
	});

	it('returns an empty array when the chapter file does not exist', () => {
		expect(matchConcordance({ slug: 'genese', chapter: 999, ranges: [[1, 1]] }, FIXTURES)).toEqual(
			[]
		);
	});
});
