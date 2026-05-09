import { error } from '@sveltejs/kit';
import { loadPiusXPetitFlatAppendix } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	const appendix = await loadPiusXPetitFlatAppendix('educateurs', fetch);
	if (!appendix) throw error(404, 'Annexe introuvable');
	return { appendix };
};
