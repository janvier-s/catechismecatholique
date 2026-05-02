import type { BuiltStructure } from './structure';
import type { ParagraphContext } from '../../src/lib/data/types';

export function buildParagraphContext(structure: BuiltStructure): Record<number, ParagraphContext> {
	const out: Record<number, ParagraphContext> = {};

	for (const part of structure.parts) {
		const partInfo = { slug: part.slug, title: part.title, number: part.number, range: part.range };

		for (const section of part.sections) {
			const sectionInfo = {
				slug: section.slug,
				title: section.title,
				number: section.number,
				range: section.range
			};

			for (const a of section.articles_direct ?? []) {
				const articleInfo = { slug: a.slug, title: a.title, number: a.number, range: a.range };
				const findHeading = (n: number) => {
					let result: { id: string; title: string } | undefined;
					for (const h of a.headings) {
						if (h.paragraph_start <= n) result = { id: h.id, title: h.title };
						else break;
					}
					return result;
				};
				for (const n of a.paragraphs) {
					out[n] = {
						part: partInfo,
						section: sectionInfo,
						article: articleInfo,
						heading: findHeading(n)
					};
				}
			}

			for (const chapter of section.chapters) {
				const chapterInfo = {
					slug: chapter.slug,
					title: chapter.title,
					number: chapter.number,
					range: chapter.range
				};

				type H = { id: string; title: string; paragraph_start: number };
				const allHeadings: H[] = [
					...chapter.headings.map((h) => ({ id: h.id, title: h.title, paragraph_start: h.paragraph_start }))
				];
				for (const article of chapter.articles) {
					allHeadings.push(
						...article.headings.map((h) => ({ id: h.id, title: h.title, paragraph_start: h.paragraph_start }))
					);
				}
				allHeadings.sort((a, b) => a.paragraph_start - b.paragraph_start);

				const findArticleFor = (n: number) => {
					for (const a of chapter.articles) if (a.paragraphs.includes(n)) return a;
					return undefined;
				};
				const findNearestHeading = (n: number) => {
					let result: { id: string; title: string } | undefined;
					for (const h of allHeadings) {
						if (h.paragraph_start <= n) result = { id: h.id, title: h.title };
						else break;
					}
					return result;
				};

				for (const n of chapter.paragraphs) {
					const article = findArticleFor(n);
					out[n] = {
						part: partInfo,
						section: sectionInfo,
						chapter: chapterInfo,
						article: article
							? { slug: article.slug, title: article.title, number: article.number, range: article.range }
							: undefined,
						heading: findNearestHeading(n)
					};
				}
			}
		}
	}

	return out;
}
