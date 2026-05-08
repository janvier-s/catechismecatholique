import { describe, it, expect } from 'vitest';
import { slugify } from '$lib/utils/slug';
import { shortSlug, numberedSlug } from '../../scripts/prepare/slug';

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

describe('shortSlug', () => {
	it('passes short titles through unchanged', () => {
		expect(shortSlug('Profession de la foi', 30)).toBe('profession-de-la-foi');
	});

	it('truncates at the last hyphen that fits within max', () => {
		const out = shortSlug(
			'Je crois en Dieu le Père tout puissant créateur du ciel et de la terre',
			30
		);
		// Slugified is 70 chars; last hyphen <=30 is after "tout" at position 29.
		expect(out).toBe('je-crois-en-dieu-le-pere-tout');
		expect(out.length).toBeLessThanOrEqual(30);
	});

	it('falls back to a hard cut when no word boundary fits', () => {
		const out = shortSlug('Constantinopolitanopolitanos', 10);
		expect(out.length).toBeLessThanOrEqual(10);
	});

	it('strips French articles at the start (de, la, le, du, des, l, d, à)', () => {
		expect(shortSlug('La célébration du mystère chrétien', 30)).toBe(
			'celebration-du-mystere'
		);
		expect(shortSlug("L'homme est capable de Dieu", 30)).toBe('homme-est-capable-de-dieu');
	});

	it('drops common French stop-words from the start to gain readability', () => {
		expect(shortSlug('Le credo', 30)).toBe('credo');
		expect(shortSlug('Les symboles de la foi', 30)).toBe('symboles-de-la-foi');
	});
});

describe('numberedSlug', () => {
	it('produces "<n>-<shortSlug>" and registers in the taken set', () => {
		const taken = new Set<string>();
		const out = numberedSlug(2, 'Je crois en Jésus-Christ, le Fils unique de Dieu', 30, taken);
		expect(out.startsWith('2-')).toBe(true);
		expect(out.length).toBeLessThanOrEqual(2 + 1 + 30); // "2-" + body
		expect(taken.has(out)).toBe(true);
		expect(taken.size).toBe(1);
	});

	it('disambiguates collisions by appending -2, -3 …', () => {
		const taken = new Set<string>();
		const a = numberedSlug(3, 'Le mystère', 30, taken);
		const b = numberedSlug(3, 'Le mystère', 30, taken);
		expect(a).not.toBe(b);
		expect(b.endsWith('-2')).toBe(true);
	});

	it('handles n=0 by emitting just the slug (no number prefix)', () => {
		const taken = new Set<string>();
		expect(numberedSlug(0, 'Prologue', 30, taken)).toBe('prologue');
	});
});
