import { error } from '@sveltejs/kit';
import { loadCompendiumPart } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	// The appendix is shipped as a Compendium part bundle (slug 'annexe') —
	// keeping the data co-located avoids regenerating it. The route just
	// surfaces it under a friendlier URL.
	const part = await loadCompendiumPart('annexe', fetch).catch(() => null);
	if (!part) throw error(404, 'Annexe introuvable');
	return { part };
};
