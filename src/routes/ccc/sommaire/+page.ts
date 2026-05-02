import { loadStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	return { structure: await loadStructure(fetch) };
};
