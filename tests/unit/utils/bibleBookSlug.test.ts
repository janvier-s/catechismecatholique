import { describe, it, expect } from 'vitest';
import { bookBySlug, bookByUsfx, bookByAbbr } from '$lib/utils/bibleBookSlug';

describe('bookBySlug', () => {
	it('finds matthieu', () => {
		expect(bookBySlug('matthieu')?.usfx).toBe('MAT');
	});
	it('returns undefined for unknown slug', () => {
		expect(bookBySlug('nonexistent')).toBeUndefined();
	});
});

describe('bookByUsfx', () => {
	it('finds MAT', () => {
		expect(bookByUsfx('MAT')?.slug).toBe('matthieu');
	});
});

describe('bookByAbbr', () => {
	it('matches Mt → Matthieu', () => {
		expect(bookByAbbr('Mt')?.usfx).toBe('MAT');
	});
	it('matches Gn → Genèse', () => {
		expect(bookByAbbr('Gn')?.usfx).toBe('GEN');
	});
	it('matches multi-token "1 Co" → 1 Corinthiens', () => {
		expect(bookByAbbr('1 Co')?.usfx).toBe('1CO');
	});
	it('returns undefined for unknown abbr', () => {
		expect(bookByAbbr('XYZ')).toBeUndefined();
	});
});
