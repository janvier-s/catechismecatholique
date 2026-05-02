import { describe, it, expect } from 'vitest';
import { slugify } from '$lib/utils/slug';

describe('slugify', () => {
	it('lowercases and hyphenates', () => {
		expect(slugify('Le Désir de Dieu')).toBe('le-desir-de-dieu');
	});

	it('strips French accents', () => {
		expect(slugify('Élévation')).toBe('elevation');
		expect(slugify('À propos')).toBe('a-propos');
		expect(slugify('Cœur')).toBe('coeur');
	});

	it('strips guillemets and quotes', () => {
		expect(slugify('« Capable » de Dieu')).toBe('capable-de-dieu');
		expect(slugify("L'homme")).toBe('lhomme');
	});

	it('collapses multiple separators', () => {
		expect(slugify('A   B   C')).toBe('a-b-c');
		expect(slugify(' -- A -- B -- ')).toBe('a-b');
	});

	it('handles roman numerals', () => {
		expect(slugify('I. Le désir de Dieu')).toBe('i-le-desir-de-dieu');
	});

	it('handles a real CCC chapter title', () => {
		expect(slugify("L'homme est « capable » de Dieu")).toBe('lhomme-est-capable-de-dieu');
	});
});
