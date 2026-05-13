import { loadBonPasteurPlaylist } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	const playlist = await loadBonPasteurPlaylist(fetch);
	return { playlist };
};
