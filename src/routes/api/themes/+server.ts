import { loadParagraphThemes } from '$lib/data/loaders';
import { apiJson } from '$lib/server/api/http';
import { buildThemeVocabulary } from '$lib/server/api/themesIndex';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	const index = await loadParagraphThemes(fetch);
	const themes = buildThemeVocabulary(index);
	return apiJson({ count: themes.length, themes });
};
