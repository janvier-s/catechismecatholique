import type { Chapter, ChapterArticle, ChapterHeading } from '../../src/lib/data/types';
import type { BuiltStructure } from './structure';

export function buildChapterFiles(structure: BuiltStructure): Chapter[] {
	const chapters: Chapter[] = [];
	for (const part of structure.parts) {
		for (const section of part.sections) {
			for (let i = 0; i < section.chapters.length; i++) {
				const c = section.chapters[i]!;
				const prev = i > 0 ? section.chapters[i - 1] : undefined;
				const next = i < section.chapters.length - 1 ? section.chapters[i + 1] : undefined;
				const chapter: Chapter = {
					corpus: 'ccc',
					slug: c.slug,
					title: c.title,
					number: c.number,
					part_slug: part.slug,
					part_title: part.title,
					part_number: part.number,
					section_slug: section.slug,
					section_title: section.title,
					section_number: section.number,
					paragraphs: c.paragraphs,
					headings: c.headings.map<ChapterHeading>((h) => ({
						id: h.id,
						level: h.level,
						title: h.title,
						paragraph_start: h.paragraph_start
					})),
					articles: c.articles.map<ChapterArticle>((a) => ({
						slug: a.slug,
						title: a.title,
						number: a.number,
						paragraphs: a.paragraphs,
						headings: a.headings.map<ChapterHeading>((h) => ({
							id: h.id,
							level: h.level,
							title: h.title,
							paragraph_start: h.paragraph_start
						}))
					})),
					prev: prev ? { slug: prev.slug, title: prev.title } : undefined,
					next: next ? { slug: next.slug, title: next.title } : undefined
				};
				chapters.push(chapter);
			}
		}
	}
	return chapters;
}
