import type {
	Chapter,
	ChapterArticle,
	ChapterHeading,
	ChapterParagraphe
} from '../../src/lib/data/types';
import type { BuiltStructure } from './structure';
import type { ExtractedEnBref } from './enbref';
import type { Paragraphe } from './paragraphes';

export function buildChapterFiles(
	structure: BuiltStructure,
	enBrefs: ExtractedEnBref[],
	paragraphes: Paragraphe[] = []
): Chapter[] {
	const chapters: Chapter[] = [];
	for (const part of structure.parts) {
		for (const section of part.sections) {
			for (let i = 0; i < section.chapters.length; i++) {
				const c = section.chapters[i]!;
				const prev = i > 0 ? section.chapters[i - 1] : undefined;
				const next = i < section.chapters.length - 1 ? section.chapters[i + 1] : undefined;
				const chapterEnBrefs = enBrefs
					.filter((b) => b.parent_kind === 'chapter' && b.parent_slug === c.slug)
					.map((b) => ({ paragraphs: b.paragraphs }));
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
					en_brefs: chapterEnBrefs,
					headings: c.headings.map<ChapterHeading>((h) => ({
						id: h.id,
						level: h.level,
						title: h.title,
						paragraph_start: h.paragraph_start
					})),
					articles: c.articles.map<ChapterArticle>((a) => {
						const articleParas = new Set(a.paragraphs);
						const articleParagraphes = paragraphes
							.filter((pg) => articleParas.has(pg.paragraph_start))
							.map<ChapterParagraphe>((pg) => ({
								number: pg.number,
								title: pg.title,
								paragraph_start: pg.paragraph_start
							}));
						return {
							slug: a.slug,
							title: a.title,
							number: a.number,
							paragraphs: a.paragraphs,
							headings: a.headings.map<ChapterHeading>((h) => ({
								id: h.id,
								level: h.level,
								title: h.title,
								paragraph_start: h.paragraph_start
							})),
							paragraphes: articleParagraphes.length > 0 ? articleParagraphes : undefined
						};
					}),
					prev: prev ? { slug: prev.slug, title: prev.title } : undefined,
					next: next ? { slug: next.slug, title: next.title } : undefined
				};
				chapters.push(chapter);
			}
		}
	}
	return chapters;
}
