import { error } from '@sveltejs/kit';
import { loadBreviloquiumChapter, loadBreviloquiumStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const [structure, chapter] = await Promise.all([
		loadBreviloquiumStructure(fetch),
		loadBreviloquiumChapter(params.chapter, fetch)
	]);
	if (!chapter) throw error(404, 'Chapitre introuvable');
	return { structure, chapter };
};
