import { error } from '@sveltejs/kit';
import { loadStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

interface Article {
	slug: string;
	title: string;
	number?: number;
	paragraphs: number[];
}
interface Chapter {
	slug: string;
	title: string;
	number?: number;
	paragraphs: number[];
}
interface Section {
	slug: string;
	title: string;
	number?: number;
	chapters: Chapter[];
	articles_direct?: Article[];
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
	if (!part) throw error(404);
	const section = part.sections.find((s) => s.slug === params.section);
	if (!section) throw error(404);
	return { part, section };
};
