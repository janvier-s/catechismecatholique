import { error } from '@sveltejs/kit';
import { loadStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const struct = (await loadStructure(fetch)) as {
		parts: Array<{
			slug: string;
			title: string;
			sections: Array<{ slug: string; title: string; chapters: { slug: string }[] }>;
		}>;
	};
	const part = struct.parts.find((p) => p.slug === params.part);
	if (!part) throw error(404, 'Partie introuvable');
	return { part };
};
