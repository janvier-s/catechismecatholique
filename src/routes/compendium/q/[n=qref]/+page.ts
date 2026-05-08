import { error, redirect } from '@sveltejs/kit';
import { loadCompendiumQRanges } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const n = parseInt(params.n, 10);
	const ranges = await loadCompendiumQRanges(fetch);
	const hit = ranges.find((r) => n >= r.from && n <= r.to);
	if (!hit) throw error(404, `Question inconnue : ${n}`);
	throw redirect(302, `/compendium/${hit.part}#q-${n}`);
};
