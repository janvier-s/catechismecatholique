import { error } from '@sveltejs/kit';
import { loadLiturgieStructure, loadLiturgieChapter } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const [structure, chapter] = await Promise.all([
		loadLiturgieStructure(fetch),
		loadLiturgieChapter(params.chapter, fetch)
	]);
	if (!chapter) throw error(404, 'Chapitre introuvable');

	const idx = structure.chapters.findIndex((c) => c.slug === params.chapter);
	const prev = idx > 0 ? structure.chapters[idx - 1]! : null;
	const next =
		idx >= 0 && idx < structure.chapters.length - 1 ? structure.chapters[idx + 1]! : null;

	return { chapter, chapters: structure.chapters, prev, next };
};
