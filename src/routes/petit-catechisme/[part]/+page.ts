import { error } from '@sveltejs/kit';
import { loadPiusXPetitStructure, loadPiusXPetitChapter } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const structure = await loadPiusXPetitStructure(fetch);
	const { part: partSlug } = params;

	if (partSlug === structure.intro.part_slug) {
		const chapter = await loadPiusXPetitChapter(
			structure.intro.part_slug,
			structure.intro.slug,
			fetch
		);
		if (!chapter) throw error(404, 'Chapitre introuvable');
		return {
			kind: 'intro' as const,
			part: structure.intro,
			chapters: [chapter],
			prevPart: undefined,
			nextPart: structure.parts[0]
		};
	}

	const partIdx = structure.parts.findIndex((p) => p.slug === partSlug);
	if (partIdx === -1) throw error(404, 'Partie introuvable');

	const structPart = structure.parts[partIdx]!;

	const chapterSlugs: { slug: string }[] = structPart.chapters
		? structPart.chapters
		: structPart.sections!.flatMap((s) => s.chapters);

	const chapters = await Promise.all(
		chapterSlugs.map((ch) => loadPiusXPetitChapter(partSlug, ch.slug, fetch))
	);
	if (chapters.some((c) => c === null)) throw error(404, 'Chapitre introuvable');

	const prevPart =
		partIdx === 0
			? ({ slug: structure.intro.part_slug, title: structure.intro.title } as const)
			: structure.parts[partIdx - 1];
	const nextPart = partIdx < structure.parts.length - 1 ? structure.parts[partIdx + 1] : undefined;

	return {
		kind: 'part' as const,
		part: structPart,
		chapters: chapters as NonNullable<(typeof chapters)[0]>[],
		prevPart,
		nextPart
	};
};
