import { error } from '@sveltejs/kit';
import { loadChapterFull } from '$lib/data/loaders';
import type { Paragraph } from '$lib/data/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	let bundle: Awaited<ReturnType<typeof loadChapterFull>>;
	try {
		bundle = await loadChapterFull(params.chapter!, fetch);
	} catch {
		throw error(404, 'Chapitre introuvable');
	}
	const { chapter } = bundle;
	if (chapter.part_slug !== params.part || chapter.section_slug !== params.section) {
		throw error(404, 'Chapitre introuvable');
	}
	const articleIdx = chapter.articles.findIndex((a) => a.slug === params.article);
	if (articleIdx < 0) throw error(404, 'Article introuvable');
	const article = chapter.articles[articleIdx]!;
	const prevArticle = articleIdx > 0 ? chapter.articles[articleIdx - 1]! : null;
	const nextArticle =
		articleIdx + 1 < chapter.articles.length ? chapter.articles[articleIdx + 1]! : null;

	// All paragraph bodies are already in the chapters-full bundle — no
	// individual subrequests needed. This avoids hitting Cloudflare Workers'
	// subrequest limit on large articles (e.g. Article 3 had 136 fetches).
	const allParaMap = new Map<number, Paragraph>(bundle.paragraphs.map((p) => [p.number, p]));
	const paragraphs = article.paragraphs
		.map((n) => allParaMap.get(n))
		.filter((p): p is Paragraph => p !== undefined);

	const articleParas = article.paragraphs;
	const articleMin = articleParas.length > 0 ? articleParas[0]! : 0;
	const articleMax = articleParas.length > 0 ? articleParas[articleParas.length - 1]! : 0;
	const enBrefBlocks = (chapter.en_brefs ?? []).filter((b) => {
		if (b.paragraphs.length === 0) return false;
		const first = b.paragraphs[0]!;
		return first >= articleMin && first <= articleMax;
	});

	return {
		chapter,
		article,
		prevArticle,
		nextArticle,
		paragraphs,
		enBrefBlocks,
		enBrefParagraphMap: bundle.enBrefParagraphMap
	};
};
