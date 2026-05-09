import { error } from '@sveltejs/kit';
import { loadPiusXPetitAppendix } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	const appendix = await loadPiusXPetitAppendix('histoire-revelation', fetch);
	if (!appendix) throw error(404, 'Annexe introuvable');
	return { appendix };
};
