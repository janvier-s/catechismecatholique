import type {
	BuiltArticle,
	BuiltChapter,
	BuiltPart,
	BuiltSection,
	BuiltStructure
} from './structure';
import type { BreadcrumbLevel, ParagraphContext } from '../../src/lib/data/types';
import { sentenceCase } from './sentence-case';
import { slugify } from './slug';

interface RawNode {
	type: string;
	title?: string;
	number?: number;
	children?: RawNode[];
}

function partInfo(p: BuiltPart): BreadcrumbLevel {
	return { slug: p.slug, title: p.title, number: p.number, range: p.range };
}
function sectionInfo(s: BuiltSection): BreadcrumbLevel {
	return { slug: s.slug, title: s.title, number: s.number, range: s.range };
}
function chapterInfo(c: BuiltChapter): BreadcrumbLevel {
	return { slug: c.slug, title: c.title, number: c.number, range: c.range };
}
function articleInfo(a: BuiltArticle): BreadcrumbLevel {
	return { slug: a.slug, title: a.title, number: a.number, range: a.range };
}

function findHeading(
	headings: { id: string; title: string; paragraph_start: number }[],
	n: number
): { id: string; title: string } | undefined {
	let result: { id: string; title: string } | undefined;
	for (const h of headings) {
		if (h.paragraph_start <= n) result = { id: h.id, title: h.title };
		else break;
	}
	return result;
}

function firstParagraphNumber(node: RawNode): number | undefined {
	if (node.type === 'paragraph' && typeof node.number === 'number') return node.number;
	for (const c of node.children ?? []) {
		const n = firstParagraphNumber(c);
		if (n !== undefined) return n;
	}
	return undefined;
}

/**
 * Build paragraph-context by walking the raw source tree alongside the built
 * structure. This ensures every paragraph receives the deepest applicable
 * containers — including paragraphs that sit directly under a part or
 * section (prologue body, section preambles, transitional intros) which
 * the BuiltStructure does not list under any chapter or article.
 *
 * The raw tree and the built structure share identical *ordering* of
 * sections/chapters/articles, so we walk both in parallel by index.
 */
export function buildParagraphContext(
	rawParts: RawNode[],
	structure: BuiltStructure
): Record<number, ParagraphContext> {
	const out: Record<number, ParagraphContext> = {};

	// Track the active container chain plus a transient "heading" (from
	// <heading> or <sub_heading> nodes encountered during the walk).
	type Frame = {
		part: BuiltPart;
		section?: BuiltSection;
		chapter?: BuiltChapter;
		article?: BuiltArticle;
		heading?: { id: string; title: string };
		/** Set while descending into an `en_bref` node · its paragraphs are a
		 *  summary box, not part of whatever heading precedes it, so the
		 *  lookup below must not let a heading's paragraph_start range
		 *  swallow them back in. */
		inEnBref?: boolean;
	};

	function walk(node: RawNode, frame: Frame): void {
		if (node.type === 'paragraph' && typeof node.number === 'number') {
			const n = node.number;

			// Prefer a heading from the built structure when the paragraph sits
			// inside a chapter/article — keeps id/title consistent with how
			// chapter/article pages render headings. Skipped inside an en_bref:
			// its own pseudo-heading (set below) already carries the anchor the
			// chapter page actually renders (id="en-bref-{first}"), matching
			// how the sidebar and CCCReader build the same id.
			let heading = frame.heading;
			if (!frame.inEnBref && frame.article) {
				const found = findHeading(frame.article.headings, n);
				if (found) heading = found;
			} else if (!frame.inEnBref && frame.chapter) {
				const found = findHeading(frame.chapter.headings, n);
				if (found) heading = found;
			}

			out[n] = {
				part: partInfo(frame.part),
				section: frame.section ? sectionInfo(frame.section) : undefined,
				chapter: frame.chapter ? chapterInfo(frame.chapter) : undefined,
				article: frame.article ? articleInfo(frame.article) : undefined,
				heading
			};
			return;
		}

		// Descend, updating the frame for container nodes. We rely on the
		// fact that buildStructure preserves ordering of section/chapter/article
		// children to advance the corresponding built indices.
		let nextFrame = frame;

		if (node.type === 'heading' || node.type === 'sub_heading') {
			const title = (node.title ?? '').trim();
			if (title) {
				const id = slugify(title);
				nextFrame = { ...frame, heading: { id, title: sentenceCase(title) }, inEnBref: false };
			}
		}
		if (node.type === 'en_bref') {
			const first = firstParagraphNumber(node);
			if (first !== undefined) {
				nextFrame = {
					...frame,
					heading: { id: `en-bref-${first}`, title: 'En Bref' },
					inEnBref: true
				};
			}
		}

		// Children walk; for `section`/`chapter`/`article` containers we need to
		// track an index per-parent so we descend into the matching built node.
		let sectionIdx = 0;
		let chapterIdx = 0;
		let articleIdx = 0;
		for (const child of node.children ?? []) {
			if (child.type === 'section') {
				const sec = frame.part.sections[sectionIdx++];
				if (sec) walk(child, { part: frame.part, section: sec });
				else walk(child, nextFrame);
				continue;
			}
			if (child.type === 'chapter' && frame.section) {
				const ch = frame.section.chapters[chapterIdx++];
				if (ch) walk(child, { part: frame.part, section: frame.section, chapter: ch });
				else walk(child, nextFrame);
				continue;
			}
			if (child.type === 'article') {
				// Articles can sit under a chapter or directly under a section.
				if (frame.chapter) {
					const a = frame.chapter.articles[articleIdx++];
					if (a)
						walk(child, {
							part: frame.part,
							section: frame.section,
							chapter: frame.chapter,
							article: a
						});
					else walk(child, nextFrame);
				} else if (frame.section) {
					const direct = frame.section.articles_direct ?? [];
					const a = direct[articleIdx++];
					if (a) walk(child, { part: frame.part, section: frame.section, article: a });
					else walk(child, nextFrame);
				} else {
					walk(child, nextFrame);
				}
				continue;
			}
			walk(child, nextFrame);
		}
	}

	for (let i = 0; i < rawParts.length; i++) {
		const rawPart = rawParts[i]!;
		const builtPart = structure.parts[i];
		if (!builtPart) continue;
		walk(rawPart, { part: builtPart });
	}

	return out;
}
