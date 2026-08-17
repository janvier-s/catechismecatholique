import { json } from '@sveltejs/kit';
import { loadParagraph, loadParagraphContext } from '$lib/data/loaders';
import { stripHtml } from '$lib/utils/html';
import type { RequestHandler } from './$types';

const FIRST = 1;
const LAST = 2865;

export const GET: RequestHandler = async ({ params, fetch, url }) => {
	const n = Number(params.number);
	if (!Number.isInteger(n) || n < FIRST || n > LAST) {
		return json(
			{ error: `Numéro de paragraphe invalide : le Catéchisme va de ${FIRST} à ${LAST}.` },
			{ status: 404 }
		);
	}

	const [paragraph, context] = await Promise.all([
		loadParagraph(n, fetch),
		loadParagraphContext(n, fetch)
	]);

	return json(
		{
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
		},
		{
			headers: {
				// Content is static between deploys · cache aggressively at the
				// edge, same order of magnitude as /api/search but longer since
				// there's no query-space to invalidate piecemeal.
				'Cache-Control': 'public, max-age=3600, s-maxage=86400'
			}
		}
	);
};
