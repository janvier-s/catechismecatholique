import { error } from '@sveltejs/kit';
import { loadTrentSection } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const section = await loadTrentSection(params.chapter!, params.section!, fetch);
	if (!section) throw error(404, 'Section introuvable');
	return { section };
};
