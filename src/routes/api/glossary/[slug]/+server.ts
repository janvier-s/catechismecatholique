import { loadGlossary } from '$lib/data/loaders';
import { apiError, apiJson } from '$lib/server/api/http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const bundle = await loadGlossary(fetch);
	const entry = bundle.entries.find((e) => e.slug === params.slug);
	if (!entry) {
		return apiError(
			`Entrée de glossaire inconnue : « ${params.slug} ». La liste complète est disponible sur /api/glossary.`,
			'unknown_slug',
			404
		);
	}
	return apiJson({ ...entry, url: `/glossaire/${params.slug}` });
};
