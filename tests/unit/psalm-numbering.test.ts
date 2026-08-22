import { describe, it, expect } from 'vitest';
import { vulgatePsalmLabel } from '$lib/utils/psalm-numbering';

describe('vulgatePsalmLabel', () => {
	it('returns null where the two traditions agree, so no redundant label renders', () => {
		for (const n of [1, 2, 5, 8, 148, 149, 150]) {
			expect(vulgatePsalmLabel(n)).toBeNull();
		}
	});

	it('maps the straight offset stretches to n - 1', () => {
		expect(vulgatePsalmLabel(11)).toBe('10');
		expect(vulgatePsalmLabel(50)).toBe('49');
		expect(vulgatePsalmLabel(113)).toBe('112');
		expect(vulgatePsalmLabel(117)).toBe('116');
		expect(vulgatePsalmLabel(146)).toBe('145');
	});

	it('collapses the psalms the Vulgate merged onto a single number', () => {
		// Vulgate 9 covers Hebrew 9 and 10. Hebrew 9 gets no label because the
		// digit is unchanged and "(Vg 9)" beside "Psaume 9" reads as noise.
		expect(vulgatePsalmLabel(9)).toBeNull();
		expect(vulgatePsalmLabel(10)).toBe('9');
		// Vulgate 113 covers Hebrew 114 and 115.
		expect(vulgatePsalmLabel(114)).toBe('113');
		expect(vulgatePsalmLabel(115)).toBe('113');
	});

	it('shows a range for the psalms the Vulgate split in two', () => {
		// Hebrew 116 became Vulgate 114 + 115.
		expect(vulgatePsalmLabel(116)).toBe('114-115');
		// Hebrew 147 became Vulgate 146 + 147.
		expect(vulgatePsalmLabel(147)).toBe('146-147');
	});

	it('returns null outside the psalter rather than inventing a number', () => {
		expect(vulgatePsalmLabel(0)).toBeNull();
		expect(vulgatePsalmLabel(151)).toBeNull();
		expect(vulgatePsalmLabel(-3)).toBeNull();
	});

	it('never returns the number it was given, which would be a no-op label', () => {
		for (let n = 1; n <= 150; n++) {
			expect(vulgatePsalmLabel(n)).not.toBe(String(n));
		}
	});
});
