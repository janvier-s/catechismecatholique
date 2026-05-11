import { loadBoulangerStructure, loadBoulangerSommaire } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	const [structure, sommaire] = await Promise.all([
		loadBoulangerStructure(fetch),
		loadBoulangerSommaire(fetch)
	]);
	return { structure, sommaire };
};
