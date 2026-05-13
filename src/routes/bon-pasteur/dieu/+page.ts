import { loadDieuStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	const structure = await loadDieuStructure(fetch);
	return { structure };
};
