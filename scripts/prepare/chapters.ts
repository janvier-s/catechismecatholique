import type {
	Chapter,
	ChapterAdjacent,
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
	// Flat list of every chapter in document order. prev/next now cross
	// section and part boundaries — without this, the last chapter of a
	// section had `next: undefined`, leaving article-level "Suivant →"
	// nav blank when the reader hit the last article of the last chapter.
	type Flat = {
		chapter: BuiltStructure['parts'][number]['sections'][number]['chapters'][number];
		partSlug: string;
		partTitle: string;
		partNumber?: number;
		sectionSlug: string;
		sectionTitle: string;
		sectionNumber?: number;
		sectionHasIntro: boolean;
	};
	const flat: Flat[] = [];
	for (const part of structure.parts) {
		for (const section of part.sections) {
			const sectionHasIntro = (section.intro_paragraphs ?? []).length > 0;
			for (const c of section.chapters) {
				flat.push({
					chapter: c,
					partSlug: part.slug,
					partTitle: part.title,
					partNumber: part.number,
					sectionSlug: section.slug,
					sectionTitle: section.title,
					sectionNumber: section.number,
					sectionHasIntro
				});
			}
		}
	}

	function adjacent(neighbor: Flat | undefined, current: Flat): ChapterAdjacent | undefined {
		if (!neighbor) return undefined;
		const crosses = neighbor.sectionSlug !== current.sectionSlug;
		return {
			slug: neighbor.chapter.slug,
			title: neighbor.chapter.title,
			part_slug: neighbor.partSlug,
			section_slug: neighbor.sectionSlug,
			crosses_section: crosses || undefined,
			section_title: crosses ? neighbor.sectionTitle : undefined,
			section_has_intro: crosses && neighbor.sectionHasIntro ? true : undefined
		};
	}

	const chapters: Chapter[] = [];
	for (let g = 0; g < flat.length; g++) {
		const cur = flat[g]!;
		const c = cur.chapter;
		const prevFlat = g > 0 ? flat[g - 1]! : undefined;
		const nextFlat = g + 1 < flat.length ? flat[g + 1]! : undefined;

		const chapterEnBrefs = enBrefs
			.filter((b) => b.parent_kind === 'chapter' && b.parent_slug === c.slug)
			.map((b) => ({ paragraphs: b.paragraphs }));

		const chapter: Chapter = {
			corpus: 'ccc',
			slug: c.slug,
			title: c.title,
			number: c.number,
			part_slug: cur.partSlug,
			part_title: cur.partTitle,
			part_number: cur.partNumber,
			section_slug: cur.sectionSlug,
			section_title: cur.sectionTitle,
			section_number: cur.sectionNumber,
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
			prev: adjacent(prevFlat, cur),
			next: adjacent(nextFlat, cur)
		};
		chapters.push(chapter);
	}
	return chapters;
}
