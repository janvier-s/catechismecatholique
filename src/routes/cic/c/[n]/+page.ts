import { error, redirect } from '@sveltejs/kit';
import { loadCicCanons } from '$lib/data/loaders';
import type { PageLoad } from './$types';

// Worker-served to avoid prerendering ~4 000 redirect pages.
export const prerender = false;

export const load: PageLoad = async ({ url, params, fetch }) => {
	const n = parseInt(params.n, 10);
	if (!Number.isFinite(n) || n < 1) throw error(404, 'Canon introuvable');
	// Optional ?code=1917 query — defaults to 1983 (current code).
	const code = url.searchParams.get('code') === '1917' ? '1917' : '1983';
	const canons = await loadCicCanons(fetch);
	const loc = canons[code]?.[String(n)];
	if (!loc) throw error(404, `Canon ${n} introuvable dans le code ${code}`);
	throw redirect(307, `/cic/${code}/${loc.livreSlug}#can-${n}`);
};
