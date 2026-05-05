import { error } from '@sveltejs/kit';
import { loadStructure, loadParagraph } from '$lib/data/loaders';
import type { PageLoad } from './$types';

interface Heading {
	id: string;
	level: number;
	title: string;
	paragraph_start: number;
}
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
	intro_paragraphs?: number[];
	intro_headings?: Heading[];
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

	// Section intro paragraphs (e.g. §§185-197 for Section 2 of Part 1).
	// Pre-load so the page can render them inline above the chapter index.
	const introNumbers = section.intro_paragraphs ?? [];
	const introParagraphs = await Promise.all(introNumbers.map((n) => loadParagraph(n, fetch)));

	// Linear navigation across section boundaries: prev = last chapter of
	// the previous section in this part. next = this section's first chapter.
	const sectionIdx = part.sections.findIndex((s) => s.slug === section.slug);
	const prevSection = sectionIdx > 0 ? part.sections[sectionIdx - 1] : null;
	const prevChapter = prevSection?.chapters[prevSection.chapters.length - 1] ?? null;
	const nextChapter = section.chapters[0] ?? null;

	return {
		part,
		section,
		introParagraphs,
		prevChapter: prevChapter
			? { slug: prevChapter.slug, title: prevChapter.title, section_slug: prevSection!.slug }
			: null,
		nextChapter: nextChapter
			? { slug: nextChapter.slug, title: nextChapter.title }
			: null
	};
};
