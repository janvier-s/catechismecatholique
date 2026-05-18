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
	const prev = idx > 0 ? structure.lessons[idx - 1]! : null;
	const next = idx >= 0 && idx < structure.lessons.length - 1 ? structure.lessons[idx + 1]! : null;

	return { lesson, lessons: structure.lessons, prev, next };
};
