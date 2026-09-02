import type { ParagraphThemeRef } from '$lib/data/types';

export interface ApiThemeSummary {
	name: string;
	slug: string;
	count: number;
	glossary_url: string;
}

type ThemeIndex = Record<string, ParagraphThemeRef[]>;

/** The whole thematic vocabulary with a paragraph count per tag. */
export function buildThemeVocabulary(index: ThemeIndex): ApiThemeSummary[] {
	const byslug = new Map<string, { name: string; count: number }>();
	for (const refs of Object.values(index)) {
		for (const ref of refs) {
			const existing = byslug.get(ref.slug);
			if (existing) existing.count += 1;
			else byslug.set(ref.slug, { name: ref.name, count: 1 });
		}
	}
	return [...byslug.entries()]
		.map(([slug, { name, count }]) => ({
			name,
			slug,
			count,
			glossary_url: `/glossaire/${slug}`
		}))
		.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/** Paragraphs carrying a theme, or null when the slug is not in the vocabulary. */
export function paragraphsForTheme(index: ThemeIndex, slug: string): number[] | null {
	const out: number[] = [];
	for (const [paragraph, refs] of Object.entries(index)) {
		if (refs.some((r) => r.slug === slug)) out.push(Number(paragraph));
	}
	if (out.length === 0) return null;
	return out.sort((a, b) => a - b);
}
