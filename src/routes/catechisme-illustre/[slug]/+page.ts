import { error } from '@sveltejs/kit';
import { loadCatIllustreChapter, loadCatIllustreStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const [structure, chapter] = await Promise.all([
		loadCatIllustreStructure(fetch),
		loadCatIllustreChapter(params.slug, fetch)
	]);
	if (!chapter) throw error(404, 'Chapitre introuvable');

	const allSlugs = [
		...structure.front_matter.map((f) => f.slug),
		...structure.chapters.map((c) => c.slug),
		...structure.back_matter.map((f) => f.slug)
	];
	const idx = allSlugs.indexOf(params.slug);
	const prevSlug = idx > 0 ? allSlugs[idx - 1] : null;
	const nextSlug = idx >= 0 && idx < allSlugs.length - 1 ? allSlugs[idx + 1] : null;

	function lookupTitle(slug: string | null): string | null {
		if (!slug) return null;
		const ch = structure.chapters.find((c) => c.slug === slug);
		if (ch) return `${ch.roman}. ${ch.title}`;
		const f =
			structure.front_matter.find((f) => f.slug === slug) ??
			structure.back_matter.find((f) => f.slug === slug);
		return f ? f.title : null;
	}

	return {
		structure,
		chapter,
		prev: prevSlug ? { slug: prevSlug, title: lookupTitle(prevSlug)! } : null,
		next: nextSlug ? { slug: nextSlug, title: lookupTitle(nextSlug)! } : null
	};
};
