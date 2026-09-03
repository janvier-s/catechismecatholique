import { loadBibleVerseIndex } from '$lib/data/loaders';
import { apiError, apiJson } from '$lib/server/api/http';
import { parseRefs, resolvePericope } from '$lib/server/api/pericope';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, url }) => {
	const parsed = parseRefs(url.searchParams);
	if (!parsed.ok) return apiError(parsed.message, parsed.code);

	const index = await loadBibleVerseIndex(fetch);
	const items = parsed.refs.map((ref) => resolvePericope(ref, index));

	// A reference that fails to parse comes back as an item carrying its own
	// error rather than failing the request · a caller resolving a lectionary
	// should not lose 49 good answers to one malformed reference.
	return apiJson({ count: items.length, items });
};
