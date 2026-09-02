import { apiError, apiJson } from '$lib/server/api/http';
import { loadParagraph, loadParagraphContext } from '$lib/data/loaders';
import { stripHtml } from '$lib/utils/html';
import type { RequestHandler } from './$types';

const FIRST = 1;
const LAST = 2865;

export const GET: RequestHandler = async ({ params, fetch, url }) => {
	const n = Number(params.number);
	if (!Number.isInteger(n) || n < FIRST || n > LAST) {
		return apiError(
			`Numéro de paragraphe invalide : le Catéchisme va de ${FIRST} à ${LAST}.`,
			'paragraph_out_of_range',
			404
		);
	}

	const [paragraph, context] = await Promise.all([
		loadParagraph(n, fetch),
		loadParagraphContext(n, fetch)
	]);

	return apiJson({
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
		permalink: `${url.origin}/cec/${n}`
	});
};
