import type { BuiltStructure } from './structure';
import type { ParagraphContext } from '../../src/lib/data/types';

// For every paragraph number, record where it lives in the hierarchy:
// part / section (optional) / chapter (optional) / article (optional) / nearest heading (optional).
export function buildParagraphContext(structure: BuiltStructure): Record<number, ParagraphContext> {
	const out: Record<number, ParagraphContext> = {};

	for (const part of structure.parts) {
		// Paragraphs that belong directly to a part (Prologue's children).
		// These can't be reached via section/chapter; we still want a context entry.
		// We don't have a direct paragraph list at the part level in BuiltStructure,
		// so we rely on sections/chapters below. Prologue paragraphs are handled by
		// the prologue having no sections; we look them up by walking the original data
		// — but that data isn't passed in here. Phase 1 punts: prologue paragraphs get
		// only the part-level entry (no section/chapter), and the prologue route
		// already handles them as a flat list.

		for (const section of part.sections) {
			for (const chapter of section.chapters) {
				// Build a sorted heading list for the chapter (chapter-level headings + each
				// article's headings) so we can find the "nearest heading at or before n".
				type H = { id: string; title: string; paragraph_start: number };
				const allHeadings: H[] = [
					...chapter.headings.map((h) => ({ id: h.id, title: h.title, paragraph_start: h.paragraph_start }))
				];
				const articleHeadings: { article: { slug: string; title: string }; headings: H[] }[] = [];
				for (const article of chapter.articles) {
					const hs = article.headings.map((h) => ({ id: h.id, title: h.title, paragraph_start: h.paragraph_start }));
					articleHeadings.push({ article: { slug: article.slug, title: article.title }, headings: hs });
					allHeadings.push(...hs);
				}
				allHeadings.sort((a, b) => a.paragraph_start - b.paragraph_start);

				const findArticleFor = (n: number) => {
					for (const a of chapter.articles) if (a.paragraphs.includes(n)) return a;
					return undefined;
				};
				const findNearestHeading = (n: number): H | undefined => {
					let result: H | undefined;
					for (const h of allHeadings) {
						if (h.paragraph_start <= n) result = h;
						else break;
					}
					return result;
				};

				for (const n of chapter.paragraphs) {
					const article = findArticleFor(n);
					const heading = findNearestHeading(n);
					out[n] = {
						part: { slug: part.slug, title: part.title },
						section: { slug: section.slug, title: section.title },
						chapter: { slug: chapter.slug, title: chapter.title },
						article: article ? { slug: article.slug, title: article.title } : undefined,
						heading: heading ? { id: heading.id, title: heading.title } : undefined
					};
				}
			}
		}
	}

	return out;
}
