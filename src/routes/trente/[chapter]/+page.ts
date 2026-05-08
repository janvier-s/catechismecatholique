import { error } from '@sveltejs/kit';
import { loadTrentChapter, loadTrentSection } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const chapter = await loadTrentChapter(params.chapter, fetch).catch(() => null);
	if (!chapter) throw error(404, 'Chapitre introuvable');

	const rawSections = await Promise.all(
		chapter.sections.map((s) => loadTrentSection(params.chapter, s.slug, fetch))
	);
	const sections = rawSections.filter((s) => s !== null);

	return { chapter, sections };
};
