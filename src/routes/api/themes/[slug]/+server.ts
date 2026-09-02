import { loadParagraphThemes } from '$lib/data/loaders';
import { apiError, apiJson } from '$lib/server/api/http';
import { buildThemeVocabulary, paragraphsForTheme } from '$lib/server/api/themesIndex';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const index = await loadParagraphThemes(fetch);
	const paragraphs = paragraphsForTheme(index, params.slug);
	if (!paragraphs) {
		return apiError(
			`Thème inconnu : « ${params.slug} ». La liste complète est disponible sur /api/themes.`,
			'unknown_slug',
			404
		);
	}
	const summary = buildThemeVocabulary(index).find((t) => t.slug === params.slug);
	return apiJson({
		slug: params.slug,
		name: summary?.name ?? params.slug,
		// Themes and glossary entries share one slug namespace.
		glossary_url: `/glossaire/${params.slug}`,
		count: paragraphs.length,
		paragraphs
	});
};
