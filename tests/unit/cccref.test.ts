import { describe, it, expect } from 'vitest';
import { match } from '../../src/params/cccref';

describe('cccref matcher', () => {
	it('matches single paragraph numbers', () => {
		expect(match('27')).toBe(true);
		expect(match('1')).toBe(true);
		expect(match('2865')).toBe(true);
	});

	it('matches paragraph ranges', () => {
		expect(match('27-30')).toBe(true);
		expect(match('1-2865')).toBe(true);
	});

	it('rejects non-numeric and slug-like inputs', () => {
		expect(match('profession-de-la-foi')).toBe(false);
		expect(match('27a')).toBe(false);
		expect(match('-27')).toBe(false);
		expect(match('27-')).toBe(false);
		expect(match('')).toBe(false);
	});
});
