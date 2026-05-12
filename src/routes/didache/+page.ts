import { loadPatStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	const structure = await loadPatStructure('didache', fetch);
	return { structure };
};
