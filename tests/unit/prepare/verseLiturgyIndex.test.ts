import { describe, it, expect } from 'vitest';
import { normalizeReadingRef } from '../../../scripts/prepare/verseLiturgyIndex';

describe('normalizeReadingRef', () => {
	it('prefixes a bookless psalm ref with Ps', () => {
		expect(normalizeReadingRef('79 (80), 2ac.3bc, 15-16a, 18-19', 'psaume')).toBe(
			'Ps 79 (80), 2ac.3bc, 15-16a, 18-19'
		);
	});

	it('prefixes a bookless cantique ref with Ps', () => {
		expect(normalizeReadingRef('97 (98), 1, 2-3ab', 'cantique')).toBe('Ps 97 (98), 1, 2-3ab');
	});

	it('leaves a psalm ref that already names its book alone', () => {
		expect(normalizeReadingRef('Ps 145 (146), 7, 8', 'psaume')).toBe('Ps 145 (146), 7, 8');
	});

	it('leaves a numbered book alone', () => {
		// "2 S 7, 4-5a" opens on a digit but that digit is the book's own
		// number, not a psalm number · prefixing it would corrupt the ref.
		expect(normalizeReadingRef('2 S 7, 4-5a.12-14a.16', 'psaume')).toBe('2 S 7, 4-5a.12-14a.16');
	});

	it('leaves a gospel ref alone', () => {
		expect(normalizeReadingRef('Mt 11, 2-11', 'evangile')).toBe('Mt 11, 2-11');
	});
});
