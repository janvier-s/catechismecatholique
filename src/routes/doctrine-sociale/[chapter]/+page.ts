import { error } from '@sveltejs/kit';
import { loadCdseStructure, loadCdseChapter } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const [structure, chapter] = await Promise.all([
		loadCdseStructure(fetch),
		loadCdseChapter(params.chapter, fetch)
	]);
	if (!chapter) throw error(404, 'Chapitre introuvable');

	// Flat reading order: front matter, intro, numbered chapters by part, conclusion.
	const reading: { slug: string; title: string; n: number | null }[] = [];
	for (const p of structure.parts) {
		if (p.kind === 'index') continue;
		for (const c of p.chapters) reading.push({ slug: c.slug, title: c.title, n: c.n });
	}
	const idx = reading.findIndex((c) => c.slug === params.chapter);
	const prev = idx > 0 ? reading[idx - 1]! : null;
	const next = idx >= 0 && idx < reading.length - 1 ? reading[idx + 1]! : null;

	return { structure, chapter, prev, next };
};
