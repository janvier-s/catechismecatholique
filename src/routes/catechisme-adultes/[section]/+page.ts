import { error } from '@sveltejs/kit';
import { loadCpaSection, loadCpaStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const [structure, section] = await Promise.all([
		loadCpaStructure(fetch),
		loadCpaSection(params.section, fetch)
	]);
	if (!section) throw error(404, 'Section introuvable');
	return { structure, section };
};
