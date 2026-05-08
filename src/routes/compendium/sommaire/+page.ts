import { loadCompendiumStructure, loadCompendiumPart } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	const structure = await loadCompendiumStructure(fetch);
	const parts = await Promise.all(structure.parts.map((p) => loadCompendiumPart(p.slug, fetch)));
	return { structure, parts };
};
