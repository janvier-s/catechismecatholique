import { error, redirect } from '@sveltejs/kit';
import { loadDenzingerIndex } from '$lib/data/loaders';
import type { PageLoad } from './$types';

// Worker-served redirect: 2851 entries pushed the prerender output past
// Cloudflare Pages' 20 000-file cap. The Worker resolves the slug per
// request — tiny payload, fine for low-traffic deep links.
export const prerender = false;

export const load: PageLoad = async ({ params, fetch }) => {
	const n = parseInt(params.number, 10);
	if (!Number.isFinite(n) || n < 1) throw error(404, 'Numéro invalide');
	const index = await loadDenzingerIndex(fetch);
	const meta = index[String(n)];
	if (!meta) {
		// The number is in DH range but not present in this edition (a few
		// entries are missing in the catho.org export). Render a stub page
		// instead of 404'ing.
		return { n, missing: true as const };
	}
	throw redirect(308, `/denzinger/${meta.unit_slug}#dh-${n}`);
};
