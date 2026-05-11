import { error, redirect } from '@sveltejs/kit';
import { loadCicCanons } from '$lib/data/loaders';
import type { CicCode } from '$lib/data/types';
import type { PageLoad } from './$types';

// Worker-served — one redirect per canon would otherwise add ~4 000
// prerendered files.
export const prerender = false;

export const load: PageLoad = async ({ params, fetch }) => {
	if (params.code !== '1983' && params.code !== '1917') throw error(404, 'Code inconnu');
	const n = parseInt(params.n, 10);
	if (!Number.isFinite(n) || n < 1) throw error(404, 'Canon introuvable');
	const code = params.code as CicCode;
	const canons = await loadCicCanons(fetch);
	const loc = canons[code]?.[String(n)];
	if (!loc) throw error(404, `Canon ${n} introuvable dans le code ${code}`);
	throw redirect(307, `/cic/${code}/${loc.livreSlug}#can-${n}`);
};
