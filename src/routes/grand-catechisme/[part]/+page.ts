import { error } from '@sveltejs/kit';
import { loadPiusXGrandStructure, loadPiusXGrandChapter } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const structure = await loadPiusXGrandStructure(fetch);
	const partIdx = structure.parts.findIndex((p) => p.slug === params.part);
	if (partIdx === -1) throw error(404, 'Partie introuvable');

	const structPart = structure.parts[partIdx]!;

	const chapters = await Promise.all(
		structPart.chapters.map((ch) => loadPiusXGrandChapter(params.part, ch.slug, fetch))
	);
	if (chapters.some((c) => c === null)) throw error(404, 'Chapitre introuvable');

	const prevPart = partIdx > 0 ? structure.parts[partIdx - 1] : undefined;
	const nextPart = partIdx < structure.parts.length - 1 ? structure.parts[partIdx + 1] : undefined;

	return {
		part: structPart,
		chapters: chapters as NonNullable<(typeof chapters)[0]>[],
		prevPart,
		nextPart
	};
};
