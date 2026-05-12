import { error } from '@sveltejs/kit';
import { loadDenzingerStructure, loadDenzingerUnit } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const [structure, unit] = await Promise.all([
		loadDenzingerStructure(fetch),
		loadDenzingerUnit(params.slug, fetch)
	]);
	if (!unit) throw error(404, 'Section introuvable');
	return { structure, unit };
};
