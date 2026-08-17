import { describe, it, expect } from 'vitest';
import { match } from '../../src/params/int';

describe('int matcher', () => {
	it('matches bare digit strings', () => {
		expect(match('27')).toBe(true);
		expect(match('0')).toBe(true);
		expect(match('2865')).toBe(true);
	});

	it('rejects non-digit input', () => {
		expect(match('27a')).toBe(false);
		expect(match('-27')).toBe(false);
		expect(match('27.5')).toBe(false);
		expect(match('')).toBe(false);
		expect(match('27-30')).toBe(false);
	});
});
