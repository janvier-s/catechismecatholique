import { error } from '@sveltejs/kit';
import { loadCcaStructure, loadCcaLesson } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const [structure, lesson] = await Promise.all([
		loadCcaStructure(fetch),
		loadCcaLesson(params.lecon, fetch)
	]);
	if (!lesson) throw error(404, 'Leçon introuvable');

	const idx = structure.lessons.findIndex((l) => l.slug === params.lecon);
	// Skip prev/next entries that aren't yet authored. Otherwise the pager would
	// link to a 404 page, which breaks the prerender crawl.
	const prev =
		idx > 0 ? (structure.lessons[idx - 1]!.available ? structure.lessons[idx - 1]! : null) : null;
	const next =
		idx >= 0 && idx < structure.lessons.length - 1
			? structure.lessons[idx + 1]!.available
				? structure.lessons[idx + 1]!
				: null
			: null;

	return { lesson, lessons: structure.lessons, prev, next };
};
