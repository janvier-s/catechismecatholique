import { loadParagraph, loadParagraphContext } from '$lib/data/loaders';
import { stripHtml } from '$lib/utils/html';
import { apiError, apiJson } from '$lib/server/api/http';
import { parseInclude } from '$lib/server/api/include';
import { assembleBlocks } from '$lib/server/api/blocks';
import { parseNumbers, MAX_BLOCK_FETCHES, FIRST, LAST } from '$lib/server/api/batch';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, url }) => {
	const parsed = parseNumbers(url.searchParams.get('numbers'), url.searchParams.get('range'));
	if (!parsed.ok) return apiError(parsed.message, parsed.code);

	const inc = parseInclude(url.searchParams.get('include'));
	if (!inc.ok) return apiError(inc.message, inc.code);

	const fetches = parsed.numbers.length * inc.blocks.length;
	if (fetches > MAX_BLOCK_FETCHES) {
		return apiError(
			`Demande trop large : ${parsed.numbers.length} paragraphes × ${inc.blocks.length} blocs = ${fetches} lectures (maximum ${MAX_BLOCK_FETCHES}). Réduisez la plage ou le nombre de blocs.`,
			'too_many_blocks'
		);
	}

	const items = await Promise.all(
		parsed.numbers.map(async (n) => {
			const [paragraph, context, blocks] = await Promise.all([
				loadParagraph(n, fetch),
				loadParagraphContext(n, fetch),
				assembleBlocks(n, inc.blocks, fetch)
			]);
			return {
				number: paragraph.number,
				corpus: paragraph.corpus,
				text_html: paragraph.text_html,
				text: stripHtml(paragraph.text_html),
				...(paragraph.superseded_text_html
					? {
							superseded_text_html: paragraph.superseded_text_html,
							superseded_text: stripHtml(paragraph.superseded_text_html)
						}
					: {}),
				cross_refs: paragraph.cross_refs,
				bible_refs: paragraph.bible_refs,
				citations: paragraph.citations,
				magisterial_refs: paragraph.magisterial_refs,
				breadcrumb: context ?? null,
				prev: n > FIRST ? n - 1 : null,
				next: n < LAST ? n + 1 : null,
				permalink: `${url.origin}/cec/${n}`,
				...blocks.data,
				...(blocks.partial.length > 0 ? { partial: blocks.partial } : {})
			};
		})
	);

	return apiJson({ count: items.length, items });
};
