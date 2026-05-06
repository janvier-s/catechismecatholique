import { loadGlossaryIndex } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const idx = await loadGlossaryIndex(fetch);
	return {
		clusters: idx.clusters,
		featured: idx.featured,
		totalEntries: idx.totalEntries
	};
};
