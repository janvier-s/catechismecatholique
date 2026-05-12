import { loadCpaStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	const structure = await loadCpaStructure(fetch);
	return { structure };
};
