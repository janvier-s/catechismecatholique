import { error } from '@sveltejs/kit';
import { loadStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const struct = (await loadStructure(fetch)) as {
		parts: Array<{
			slug: string;
			title: string;
			sections: Array<{
				slug: string;
				title: string;
				chapters: Array<{ slug: string; title: string; paragraphs: number[] }>;
			}>;
		}>;
	};
	const part = struct.parts.find((p) => p.slug === params.part);
	if (!part) throw error(404);
	const section = part.sections.find((s) => s.slug === params.section);
	if (!section) throw error(404);
	return { part, section };
};
