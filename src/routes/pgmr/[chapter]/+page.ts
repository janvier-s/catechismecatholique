import { error } from '@sveltejs/kit';
import { loadPgmrStructure, loadPgmrChapter } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const [structure, chapter] = await Promise.all([
		loadPgmrStructure(fetch),
		loadPgmrChapter(params.chapter, fetch)
	]);
	if (!chapter) throw error(404, 'Chapitre introuvable');

	const reading = structure.chapters;
	const idx = reading.findIndex((c) => c.slug === params.chapter);
	const prev = idx > 0 ? reading[idx - 1]! : null;
	const next = idx >= 0 && idx < reading.length - 1 ? reading[idx + 1]! : null;

	return { structure, chapter, prev, next };
};
