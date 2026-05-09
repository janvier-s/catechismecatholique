import { error } from '@sveltejs/kit';
import { loadPiusXPetitChapter } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const chapter = await loadPiusXPetitChapter(params.part, params.chapter, fetch);
	if (!chapter) throw error(404, 'Chapitre introuvable');
	return { chapter };
};
