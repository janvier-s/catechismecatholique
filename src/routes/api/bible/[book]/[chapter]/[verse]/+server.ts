import { loadBibleVerseIndex } from '$lib/data/loaders';
import { apiError, apiJson } from '$lib/server/api/http';
import { lookupBible } from '$lib/server/api/bibleLookup';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const index = await loadBibleVerseIndex(fetch);
	const r = lookupBible(params.book, params.chapter, params.verse, index);
	if (!r.ok) return apiError(r.message, r.code, 404);
	return apiJson(r.body);
};
