import { error } from '@sveltejs/kit';
import { loadCicStructure } from '$lib/data/loaders';
import type { CicCode } from '$lib/data/types';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	if (params.code !== '1983' && params.code !== '1917') throw error(404, 'Code inconnu');
	const structure = await loadCicStructure(fetch);
	const code = params.code as CicCode;
	const entry = structure.codes.find((c) => c.code === code);
	if (!entry) throw error(404, 'Code introuvable');
	return { code, livres: entry.livres };
};
