import { describe, it, expect } from 'vitest';
import { match } from '../../src/params/qref';

describe('qref matcher', () => {
	it('matches a single number', () => {
		expect(match('1')).toBe(true);
		expect(match('598')).toBe(true);
	});

	it('rejects ranges, slugs, empty', () => {
		expect(match('1-5')).toBe(false);
		expect(match('part-foi')).toBe(false);
		expect(match('')).toBe(false);
		expect(match('27a')).toBe(false);
	});
});
