import { error } from '@sveltejs/kit';
import { loadChapter, loadParagraph } from '$lib/data/loaders';
import type { Paragraph } from '$lib/data/types';
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
	const articleIdx = chapter.articles.findIndex((a) => a.slug === params.article);
	if (articleIdx < 0) throw error(404, 'Article introuvable');
	const article = chapter.articles[articleIdx]!;
	const prevArticle = articleIdx > 0 ? chapter.articles[articleIdx - 1]! : null;
	const nextArticle =
		articleIdx + 1 < chapter.articles.length ? chapter.articles[articleIdx + 1]! : null;

	// Identify the En Bref blocks belonging to this article (their first
	// paragraph falls within the article's range) and pre-load their
	// paragraph bodies so the page can render the summary boxes inline.
	const articleParas = article.paragraphs;
	const articleMin = articleParas.length > 0 ? articleParas[0]! : 0;
	const articleMax = articleParas.length > 0 ? articleParas[articleParas.length - 1]! : 0;
	const enBrefBlocks = (chapter.en_brefs ?? []).filter((b) => {
		if (b.paragraphs.length === 0) return false;
		const first = b.paragraphs[0]!;
		return first >= articleMin && first <= articleMax;
	});
	const enBrefParaNumbers = enBrefBlocks.flatMap((b) => b.paragraphs);

	const [paragraphs, enBrefParagraphsArr] = await Promise.all([
		Promise.all(article.paragraphs.map((n) => loadParagraph(n, fetch))),
		Promise.all(enBrefParaNumbers.map((n) => loadParagraph(n, fetch)))
	]);
	const enBrefParagraphMap: Record<number, Paragraph> = {};
	for (const p of enBrefParagraphsArr) enBrefParagraphMap[p.number] = p;

	return {
		chapter,
		article,
		prevArticle,
		nextArticle,
		paragraphs,
		enBrefBlocks,
		enBrefParagraphMap
	};
};
