import { describe, it, expect } from 'vitest';
import {
	ligateLatin,
	ligateInsideParens,
	cleanParens,
	capitalizeProperNouns
} from '../../../scripts/prepare/glossary-fr';

describe('ligateLatin', () => {
	it('replaces lowercase ae and oe with ligatures', () => {
		expect(ligateLatin('foedus vetus')).toBe('fœdus vetus');
		expect(ligateLatin('aetas')).toBe('ætas');
	});

	it('preserves case when the letter is uppercase', () => {
		expect(ligateLatin('Aetas')).toBe('Ætas');
		expect(ligateLatin('AETAS')).toBe('ÆTAS');
		expect(ligateLatin('OEcumenicus')).toBe('Œcumenicus');
	});
});

describe('ligateInsideParens', () => {
	it('only ligatures inside parens, leaves outside untouched', () => {
		// "coexistant" is French and must stay un-ligatured.
		expect(ligateInsideParens('coexistant (foedus vetus)')).toBe('coexistant (fœdus vetus)');
	});

	it('leaves strings without parens untouched', () => {
		expect(ligateInsideParens('coexistant')).toBe('coexistant');
	});
});

describe('cleanParens', () => {
	it('tightens whitespace at the start of parens', () => {
		expect(cleanParens('( foedus vetus)')).toBe('(foedus vetus)');
	});

	it('tightens whitespace at the end of parens', () => {
		expect(cleanParens('(foedus vetus )')).toBe('(foedus vetus)');
	});

	it('tightens whitespace on both sides', () => {
		expect(cleanParens('( foedus vetus )')).toBe('(foedus vetus)');
	});

	it('drops a trailing period after the closing paren', () => {
		expect(cleanParens('Some entry (gula).')).toBe('Some entry (gula)');
	});
});

describe('capitalizeProperNouns', () => {
	it('matches case-insensitively and restores canonical form', () => {
		expect(capitalizeProperNouns('jésus')).toBe('Jésus');
		expect(capitalizeProperNouns('JÉSUS')).toBe('Jésus');
		expect(capitalizeProperNouns('JESUS')).toBe('Jésus');
	});

	it('handles multi-word patterns', () => {
		// "esprit saint" should match the multi-word rule and preserve the
		// space between the two capitalized words.
		expect(capitalizeProperNouns('esprit saint')).toBe('Esprit Saint');
		expect(capitalizeProperNouns('nouveau testament')).toBe('Nouveau Testament');
		expect(capitalizeProperNouns('ancien testament')).toBe('Ancien Testament');
	});

	it('upper-cases YHWH', () => {
		expect(capitalizeProperNouns('yhwh')).toBe('YHWH');
		expect(capitalizeProperNouns('Yhwh')).toBe('YHWH');
	});

	it('respects word boundaries', () => {
		// "rome" inside "ramener" must NOT match.
		expect(capitalizeProperNouns('ramener')).toBe('ramener');
	});

	it('repairs missing accents on lowercase forms', () => {
		expect(capitalizeProperNouns('eglise')).toBe('Église');
		expect(capitalizeProperNouns('israel')).toBe('Israël');
	});
});
