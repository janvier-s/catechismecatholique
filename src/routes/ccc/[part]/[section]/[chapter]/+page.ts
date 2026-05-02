import { error } from '@sveltejs/kit';
import { loadChapter, loadParagraph } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	let chapter;
	try {
		chapter = await loadChapter(params.chapter!, fetch);
	} catch {
		throw error(404, 'Chapitre introuvable');
	}
	if (chapter.part_slug !== params.part || chapter.section_slug !== params.section) {
		throw error(404, 'Chapitre introuvable');
	}
	const paragraphs = await Promise.all(chapter.paragraphs.map((n) => loadParagraph(n, fetch)));

	let enBref: { chapter_slug: string; paragraphs: number[] } | null = null;
	try {
		const r = await fetch(`/data/ccc/en-bref/${chapter.slug}.json`);
		if (r.ok) enBref = await r.json();
	} catch {
		// optional, swallow
	}
	return { chapter, paragraphs, enBref };
};
