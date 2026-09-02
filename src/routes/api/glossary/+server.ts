import { loadGlossary } from '$lib/data/loaders';
import { apiJson } from '$lib/server/api/http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	const bundle = await loadGlossary(fetch);
	// The full bundle is 756 KB · the listing returns identity, grouping and
	// reference counts only, and a client fetches a single entry for its
	// definition.
	return apiJson({
		count: bundle.entries.length,
		clusters: bundle.clusters,
		featured: bundle.featured,
		entries: bundle.entries.map((e) => ({
			slug: e.slug,
			term: e.term,
			clusters: e.clusters,
			total_refs: e.totalRefs,
			url: `/glossaire/${e.slug}`
		}))
	});
};
