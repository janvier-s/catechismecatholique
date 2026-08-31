import { error } from '@sveltejs/kit';
import { loadCalendrierFeries } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const cycleParam = params.cycle;
	if (cycleParam !== 'i' && cycleParam !== 'ii') {
		throw error(404, 'Cycle introuvable');
	}
	const cycle: 'I' | 'II' = cycleParam === 'i' ? 'I' : 'II';

	const feries = await loadCalendrierFeries(cycle, fetch);
	const feast = feries.feasts.find((f) => f.slug === params.slug);
	if (!feast) throw error(404, 'Férie introuvable');

	return { feast, cycle };
};
