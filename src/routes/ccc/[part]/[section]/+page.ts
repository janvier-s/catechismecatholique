import { error } from '@sveltejs/kit';
import { loadStructure, loadParagraph } from '$lib/data/loaders';
import type { Structure } from '$lib/data/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const struct = (await loadStructure(fetch)) as Structure;
	const part = struct.parts.find((p) => p.slug === params.part);
	if (!part) throw error(404);
	const section = part.sections.find((s) => s.slug === params.section);
	if (!section) throw error(404);

	// Section intro paragraphs (e.g. §§185-197 for Section 2 of Part 1).
	// Pre-load so the page can render them inline above the chapter index.
	const introNumbers = section.intro_paragraphs ?? [];
	const introParagraphs = await Promise.all(introNumbers.map((n) => loadParagraph(n, fetch)));

	// Section-level En Bref blocks (the Décalogue's §§2075-2082 is the
	// canonical case). Pre-load each block's paragraph records so the page
	// renders them as styled En Bref boxes between intros and chapters.
	const enBrefBlocks = section.en_brefs ?? [];
	const enBrefRecords = await Promise.all(
		enBrefBlocks.map((b) => Promise.all(b.paragraphs.map((n) => loadParagraph(n, fetch))))
	);
	const enBrefs = enBrefBlocks.map((_b, i) => enBrefRecords[i]!);

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
		enBrefs,
		prevChapter: prevChapter
			? { slug: prevChapter.slug, title: prevChapter.title, section_slug: prevSection!.slug }
			: null,
		nextChapter: nextChapter
			? { slug: nextChapter.slug, title: nextChapter.title }
			: null
	};
};
