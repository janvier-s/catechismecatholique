import { loadBibleVerseIndex } from '$lib/data/loaders';
import { apiError, apiJson } from '$lib/server/api/http';
import { parseRefs, resolvePericope, unionParagraphs } from '$lib/server/api/pericope';
import { parseTextsInclude, loadParagraphTexts } from '$lib/server/api/paragraphTexts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, url }) => {
	const parsed = parseRefs(url.searchParams);
	if (!parsed.ok) return apiError(parsed.message, parsed.code);

	const inc = parseTextsInclude(url.searchParams.get('include'));
	if (!inc.ok) return apiError(inc.message, inc.code);

	const index = await loadBibleVerseIndex(fetch);
	const items = parsed.refs.map((ref) => resolvePericope(ref, index));

	// A reference that fails to parse comes back as an item carrying its own
	// error rather than failing the request · a caller resolving a lectionary
	// should not lose 49 good answers to one malformed reference.
	if (!inc.texts) return apiJson({ count: items.length, items });

	// One deduped list for the whole request rather than a copy inside each
	// item: a lectionary's readings overlap, and each item already names its
	// own paragraph numbers.
	const { texts, truncated } = await loadParagraphTexts(unionParagraphs(items), url.origin, fetch);
	return apiJson({
		count: items.length,
		items,
		texts,
		...(truncated ? { texts_truncated: true } : {})
	});
};
