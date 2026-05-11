import { error } from '@sveltejs/kit';
import { loadBoulangerStructure, loadBoulangerLesson } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const [structure, lesson] = await Promise.all([
		loadBoulangerStructure(fetch),
		loadBoulangerLesson(params.slug, fetch)
	]);
	if (!lesson) throw error(404, 'Leçon introuvable');

	const allLessons = structure.tomes.flatMap((t) => t.lessons);
	const idx = allLessons.findIndex((l) => l.slug === params.slug);
	const prev = idx > 0 ? allLessons[idx - 1]! : null;
	const next = idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1]! : null;

	return { structure, lesson, prev, next };
};
