import { error, redirect } from '@sveltejs/kit';
import { loadCdseParagraphs } from '$lib/data/loaders';
import type { PageLoad } from './$types';

// Worker-served redirect (see /pgmr/p/[n]).
export const prerender = false;

export const load: PageLoad = async ({ params, fetch }) => {
	const n = parseInt(params.n, 10);
	if (!Number.isFinite(n) || n < 1) throw error(404, 'Paragraphe introuvable');
	const locators = await loadCdseParagraphs(fetch);
	const loc = locators[String(n)];
	if (!loc) throw error(404, `Paragraphe ${n} introuvable`);
	throw redirect(307, `/doctrine-sociale/${loc.chapterSlug}#p${n}`);
};
