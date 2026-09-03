import { loadBibleVerseIndex } from '$lib/data/loaders';
import { apiError, apiJson } from '$lib/server/api/http';
import { lookupBible } from '$lib/server/api/bibleLookup';
import { parseTextsInclude, loadParagraphTexts } from '$lib/server/api/paragraphTexts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch, url }) => {
	const inc = parseTextsInclude(url.searchParams.get('include'));
	if (!inc.ok) return apiError(inc.message, inc.code);

	const index = await loadBibleVerseIndex(fetch);
	const r = lookupBible(params.book, params.chapter, null, index);
	if (!r.ok) return apiError(r.message, r.code, 404);

	if (!inc.texts) return apiJson(r.body);

	const { texts, truncated } = await loadParagraphTexts(r.body.paragraphs, url.origin, fetch);
	return apiJson({ ...r.body, texts, ...(truncated ? { texts_truncated: true } : {}) });
};
