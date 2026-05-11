import { error, redirect } from '@sveltejs/kit';
import { loadPgmrParagraphs } from '$lib/data/loaders';
import type { PageLoad } from './$types';

// Worker-served redirect (one route handler, not N prerendered files).
// Cloudflare Pages caps static deploys at 20 000 files; pre-rendering every
// /pgmr/p/N pushed us over.
export const prerender = false;

export const load: PageLoad = async ({ params, fetch }) => {
	const n = parseInt(params.n, 10);
	if (!Number.isFinite(n) || n < 1) throw error(404, 'Paragraphe introuvable');
	const locators = await loadPgmrParagraphs(fetch);
	const loc = locators[String(n)];
	if (!loc) throw error(404, `Paragraphe ${n} introuvable`);
	throw redirect(307, `/pgmr/${loc.chapterSlug}#p${n}`);
};
