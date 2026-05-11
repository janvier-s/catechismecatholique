import { loadBreviloquiumStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	const structure = await loadBreviloquiumStructure(fetch);
	return { structure };
};
