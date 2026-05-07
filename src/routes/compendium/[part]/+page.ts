import { error } from '@sveltejs/kit';
import { loadCompendiumPart } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const part = await loadCompendiumPart(params.part, fetch).catch(() => null);
	if (!part) throw error(404, `Partie inconnue : ${params.part}`);
	return { part };
};
