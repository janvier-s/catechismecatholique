import { loadDenzingerStructure, loadDenzingerIndex } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	const [structure, index] = await Promise.all([
		loadDenzingerStructure(fetch),
		loadDenzingerIndex(fetch)
	]);
	return { structure, index };
};
