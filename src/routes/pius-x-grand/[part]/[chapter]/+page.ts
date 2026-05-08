import { error } from '@sveltejs/kit';
import { loadPiusXGrandChapter } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const chapter = await loadPiusXGrandChapter(params.part, params.chapter, fetch);
	if (!chapter) throw error(404, 'Chapitre introuvable');
	return { chapter };
};
