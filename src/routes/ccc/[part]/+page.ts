import { error } from '@sveltejs/kit';
import { loadStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

interface Section {
	slug: string;
	title: string;
	number?: number;
	chapters: { slug: string }[];
	articles_direct?: { slug: string }[];
}
interface Part {
	slug: string;
	title: string;
	number?: number;
	sections: Section[];
}
interface Struct {
	parts: Part[];
}

export const load: PageLoad = async ({ params, fetch }) => {
	const struct = (await loadStructure(fetch)) as Struct;
	const part = struct.parts.find((p) => p.slug === params.part);
	if (!part) throw error(404, 'Partie introuvable');
	return { part };
};
