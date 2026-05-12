import { error } from '@sveltejs/kit';
import { loadPatStructure, loadPatChapter } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const [structure, chapter] = await Promise.all([
		loadPatStructure('discours-catechetique', fetch),
		loadPatChapter('discours-catechetique', params.chapter, fetch)
	]);
	if (!chapter) throw error(404, 'Chapitre introuvable');
	return { structure, chapter };
};
