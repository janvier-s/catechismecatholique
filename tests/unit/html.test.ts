import { describe, it, expect } from 'vitest';
import { stripHtml } from '../../src/lib/utils/html';

describe('stripHtml', () => {
	it('drops footnote markers entirely, not just the tag', () => {
		expect(stripHtml('Texte<sup class="srcRef docRef" data-idx="a">a</sup>.')).toBe('Texte.');
	});

	it('strips remaining tags and collapses whitespace', () => {
		expect(stripHtml('<span>Bonjour</span><br/><span>le monde</span>')).toBe('Bonjour le monde');
	});
});
