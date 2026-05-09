import { loadCalendrierIndex } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const index = await loadCalendrierIndex(fetch);
	return { index };
};
