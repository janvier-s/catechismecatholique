import { loadParagraphThemes } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

export interface ApiTheme {
	name: string;
	slug: string;
	/** Theme slugs and glossary slugs are one namespace · see the spec. */
	glossary_url: string;
}

export async function themesBlock(n: number, fetcher: Fetch): Promise<ApiTheme[]> {
	const index = await loadParagraphThemes(fetcher);
	const mine = index[String(n)] ?? [];
	return mine.map((t) => ({
		name: t.name,
		slug: t.slug,
		glossary_url: `/glossaire/${t.slug}`
	}));
}
