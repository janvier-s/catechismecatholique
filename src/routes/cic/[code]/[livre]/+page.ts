import { error } from '@sveltejs/kit';
import { loadCicLivre, loadCicStructure } from '$lib/data/loaders';
import type { CicCode } from '$lib/data/types';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	if (params.code !== '1983' && params.code !== '1917') throw error(404, 'Code inconnu');
	const [structure, livre] = await Promise.all([
		loadCicStructure(fetch),
		loadCicLivre(params.livre, fetch)
	]);
	if (!livre || livre.code !== (params.code as CicCode)) throw error(404, 'Livre introuvable');

	const codeStructure = structure.codes.find((c) => c.code === livre.code);
	const livres = codeStructure?.livres ?? [];
	const idx = livres.findIndex((l) => l.slug === livre.slug);
	const prev = idx > 0 ? livres[idx - 1]! : null;
	const next = idx >= 0 && idx < livres.length - 1 ? livres[idx + 1]! : null;

	return { structure, livre, prev, next };
};
