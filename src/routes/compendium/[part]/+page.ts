import { error, redirect } from '@sveltejs/kit';
import { loadCompendiumPart } from '$lib/data/loaders';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	// The appendix has its own top-level route now (/prieres-formules);
	// keep /compendium/annexe as a 301 so any old links still land on it.
	if (params.part === 'annexe') throw redirect(301, '/prieres-formules');
	const part = await loadCompendiumPart(params.part, fetch).catch(() => null);
	if (!part) throw error(404, `Partie inconnue : ${params.part}`);
	return { part };
};

// Crawl reaches the four parts via the landing page — list them explicitly
// for resilience. 'annexe' is also enumerated here so prerender produces an
// HTML redirect (the load function above throws redirect to /prieres-formules);
// without it, hitting /compendium/annexe in a static export would 404.
export const entries: EntryGenerator = () => [
	{ part: '1-profession-de-la-foi' },
	{ part: '2-celebration-du-mystere' },
	{ part: '3-vie-dans-le-christ' },
	{ part: '4-priere-chretienne' },
	{ part: 'annexe' }
];
