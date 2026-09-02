import { describe, it, expect } from 'vitest';
import { buildThemeVocabulary, paragraphsForTheme } from '$lib/server/api/themesIndex';

// Index is passed in, so this suite is free of module-level memoisation.
// Paragraph keys are deliberately out of numeric order to prove sorting.
const INDEX = {
	'30': [{ name: 'Amour', slug: 'amour' }],
	'26': [
		{ name: 'Foi', slug: 'foi' },
		{ name: 'Église', slug: 'eglise' }
	],
	'27': [{ name: 'Foi', slug: 'foi' }]
};

describe('buildThemeVocabulary', () => {
	it('counts paragraphs per theme', () => {
		const v = buildThemeVocabulary(INDEX);
		expect(v.find((t) => t.slug === 'foi')).toEqual({
			name: 'Foi',
			slug: 'foi',
			count: 2,
			glossary_url: '/glossaire/foi'
		});
	});

	it('sorts by French collation, so an accented initial does not sort last', () => {
		const v = buildThemeVocabulary(INDEX);
		// A naive codepoint sort would put "Église" after "Foi".
		expect(v.map((t) => t.slug)).toEqual(['amour', 'eglise', 'foi']);
	});

	it('lists each theme exactly once', () => {
		const v = buildThemeVocabulary(INDEX);
		expect(v).toHaveLength(3);
		expect(new Set(v.map((t) => t.slug)).size).toBe(3);
	});

	it('returns an empty vocabulary for an empty index', () => {
		expect(buildThemeVocabulary({})).toEqual([]);
	});
});

describe('paragraphsForTheme', () => {
	it('returns the sorted paragraph list for a known slug', () => {
		expect(paragraphsForTheme(INDEX, 'foi')).toEqual([26, 27]);
	});

	it('returns a single-paragraph theme', () => {
		expect(paragraphsForTheme(INDEX, 'amour')).toEqual([30]);
	});

	it('returns null for an unknown slug', () => {
		expect(paragraphsForTheme(INDEX, 'inexistant')).toBeNull();
	});
});
