import { loadGlossary } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const glossary = await loadGlossary(fetch);
	const entryBySlug = new Map(glossary.entries.map((e) => [e.slug, e]));
	const featured = glossary.featured.map((s) => entryBySlug.get(s)).filter((e) => e !== undefined);
	return {
		clusters: glossary.clusters,
		featured,
		totalEntries: glossary.entries.length
	};
};
