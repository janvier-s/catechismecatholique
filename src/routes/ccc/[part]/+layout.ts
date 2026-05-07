import { error } from '@sveltejs/kit';
import { loadStructure } from '$lib/data/loaders';
import type { Structure } from '$lib/data/types';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ params, fetch }) => {
	const struct = (await loadStructure(fetch)) as Structure;
	const partTree = struct.parts.find((p) => p.slug === params.part);
	if (!partTree) throw error(404, 'Partie introuvable');
	return { partTree };
};
