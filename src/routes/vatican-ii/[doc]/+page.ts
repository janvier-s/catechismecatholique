import { error } from '@sveltejs/kit';
import { loadVatIIStructure, loadVatIIDoc } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const [structure, doc] = await Promise.all([
		loadVatIIStructure(fetch),
		loadVatIIDoc(params.doc, fetch)
	]);
	if (!doc) throw error(404, 'Document introuvable');

	// Reading order: walk the registry by date.
	const reading = [...structure.docs]
		.filter((d) => d.present)
		.sort((a, b) => a.date.localeCompare(b.date));
	const idx = reading.findIndex((d) => d.slug === params.doc);
	const prev = idx > 0 ? reading[idx - 1]! : null;
	const next = idx >= 0 && idx < reading.length - 1 ? reading[idx + 1]! : null;

	return { doc, prev, next };
};
