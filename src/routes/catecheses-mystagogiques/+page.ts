import { loadPatFull } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	const full = await loadPatFull('catecheses-mystagogiques', fetch);
	return { full };
};
