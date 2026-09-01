import { error } from '@sveltejs/kit';
import { loadCalendrierProper } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const proper = await loadCalendrierProper(fetch);
	const feast = proper.feasts.find((f) => f.slug === params.slug);
	if (!feast) throw error(404, 'Jour introuvable');

	return { feast };
};
