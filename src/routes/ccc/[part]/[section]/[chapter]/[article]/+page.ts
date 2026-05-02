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
	const article = chapter.articles.find((a) => a.slug === params.article);
	if (!article) throw error(404, 'Article introuvable');
	const paragraphs = await Promise.all(article.paragraphs.map((n) => loadParagraph(n, fetch)));
	return { chapter, article, paragraphs };
};
