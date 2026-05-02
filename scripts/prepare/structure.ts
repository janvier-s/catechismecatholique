import { slugify, uniqueSlug } from './slug';
import { sentenceCase } from './sentence-case';

interface RawNode {
	type: string;
	title?: string;
	number?: number;
	text_html?: string;
	children?: RawNode[];
}

export interface BuiltStructure {
	corpus: 'ccc';
	parts: BuiltPart[];
}

export interface ParagraphRange {
	from: number;
	to: number;
}

export interface BuiltPart {
	slug: string;
	title: string;
	number?: number;
	sections: BuiltSection[];
	prologue?: boolean;
	range?: ParagraphRange;
}

export interface BuiltSection {
	slug: string;
	title: string;
	number?: number;
	chapters: BuiltChapter[];
	articles_direct?: BuiltArticle[];
	range?: ParagraphRange;
}

export interface BuiltChapter {
	slug: string;
	title: string;
	number?: number;
	articles: BuiltArticle[];
	paragraphs: number[];
	headings: BuiltHeading[];
	range?: ParagraphRange;
}

export interface BuiltArticle {
	slug: string;
	title: string;
	number?: number;
	headings: BuiltHeading[];
	paragraphs: number[];
	range?: ParagraphRange;
}

export interface BuiltHeading {
	id: string;
	level: number;
	title: string;
	paragraph_start: number;
}

const CHAPITRE_PREFIX =
	/^CHAPITRE\s+(PREMIER|DEUXIÈME|TROISIÈME|QUATRIÈME|CINQUIÈME|SIXIÈME|SEPTIÈME|HUITIÈME|NEUVIÈME|DIXIÈME)?\s*[:.\s-]*/iu;
const PART_PREFIX = /^(PREMIÈRE|DEUXIÈME|TROISIÈME|QUATRIÈME)\s+PARTIE\s*[:.\s-]*/iu;
const SECTION_PREFIX =
	/^(PREMIÈRE|DEUXIÈME|TROISIÈME|QUATRIÈME|CINQUIÈME|SIXIÈME|SEPTIÈME)\s+SECTION\s*[:.\s-]*/iu;
const ARTICLE_PREFIX = /^Article\s+(\d+)\s*[:.\s-]*/iu;

function stripPrefix(title: string, regex: RegExp): string {
	return title.replace(regex, '').trim();
}

function readArticleNumber(rawTitle: string): number | undefined {
	const m = rawTitle.match(ARTICLE_PREFIX);
	if (!m || !m[1]) return undefined;
	const n = parseInt(m[1], 10);
	return Number.isFinite(n) ? n : undefined;
}

function collectParagraphs(node: RawNode, into: number[]): void {
	if (node.type === 'paragraph' && typeof node.number === 'number') into.push(node.number);
	for (const c of node.children ?? []) collectParagraphs(c, into);
}

function collectHeadings(nodes: RawNode[]): BuiltHeading[] {
	const out: BuiltHeading[] = [];
	for (const n of nodes) {
		if (n.type === 'heading' || n.type === 'sub_heading') {
			const level = n.type === 'heading' ? 2 : 3;
			const title = (n.title ?? '').trim();
			const id = slugify(title) || `h-${out.length}`;
			let firstParagraph = -1;
			for (const c of n.children ?? []) {
				if (c.type === 'paragraph' && typeof c.number === 'number') {
					firstParagraph = c.number;
					break;
				}
			}
			if (firstParagraph >= 0)
				out.push({ id, level, title: sentenceCase(title), paragraph_start: firstParagraph });
		}
	}
	return out;
}

function rangeOf(nums: number[]): ParagraphRange | undefined {
	if (nums.length === 0) return undefined;
	let lo = Infinity;
	let hi = -Infinity;
	for (const n of nums) {
		if (n < lo) lo = n;
		if (n > hi) hi = n;
	}
	return { from: lo, to: hi };
}

function buildArticle(aRaw: RawNode, articleSlugs: Set<string>): BuiltArticle {
	const aTitle = sentenceCase(stripPrefix(aRaw.title ?? '', ARTICLE_PREFIX));
	const aSlug = uniqueSlug(aTitle, articleSlugs);
	const aParas: number[] = [];
	collectParagraphs(aRaw, aParas);
	return {
		slug: aSlug,
		title: aTitle,
		number: readArticleNumber(aRaw.title ?? ''),
		headings: collectHeadings(aRaw.children ?? []),
		paragraphs: aParas,
		range: rangeOf(aParas)
	};
}

export function buildStructure(parts: RawNode[]): BuiltStructure {
	const partSlugs = new Set<string>();
	const builtParts: BuiltPart[] = [];
	let partNumber = 0;

	for (const partRaw of parts) {
		const isPrologue = (partRaw.title ?? '').trim().toUpperCase() === 'PROLOGUE';
		const partTitle = isPrologue
			? 'Prologue'
			: sentenceCase(stripPrefix(partRaw.title ?? '', PART_PREFIX));
		const partSlug = isPrologue ? 'prologue' : uniqueSlug(partTitle, partSlugs);
		if (isPrologue) {
			if (partSlugs.has(partSlug)) {
				throw new Error(`Slug collision: "${partSlug}" (from title "${partRaw.title}")`);
			}
			partSlugs.add(partSlug);
		} else {
			partNumber++;
		}

		const sectionSlugs = new Set<string>();
		const builtSections: BuiltSection[] = [];
		let sectionNumber = 0;

		for (const childRaw of partRaw.children ?? []) {
			if (childRaw.type !== 'section') continue;
			sectionNumber++;
			const sectionTitle = sentenceCase(stripPrefix(childRaw.title ?? '', SECTION_PREFIX));
			const sectionSlug = uniqueSlug(sectionTitle, sectionSlugs);

			const chapterSlugs = new Set<string>();
			const builtChapters: BuiltChapter[] = [];
			let chapterNumber = 0;
			for (const chapRaw of childRaw.children ?? []) {
				if (chapRaw.type !== 'chapter') continue;
				chapterNumber++;
				const chapTitle = sentenceCase(stripPrefix(chapRaw.title ?? '', CHAPITRE_PREFIX));
				const chapSlug = uniqueSlug(chapTitle, chapterSlugs);

				const chapParagraphs: number[] = [];
				collectParagraphs(chapRaw, chapParagraphs);

				const articleSlugs = new Set<string>();
				const articles: BuiltArticle[] = [];
				for (const aRaw of chapRaw.children ?? []) {
					if (aRaw.type !== 'article') continue;
					articles.push(buildArticle(aRaw, articleSlugs));
				}

				builtChapters.push({
					slug: chapSlug,
					title: chapTitle,
					number: chapterNumber,
					articles,
					paragraphs: chapParagraphs,
					headings: collectHeadings(chapRaw.children ?? []),
					range: rangeOf(chapParagraphs)
				});
			}

			// Articles directly under the section (e.g., Notre Père)
			const directArticles: BuiltArticle[] = [];
			const directArticleSlugs = new Set<string>();
			for (const aRaw of childRaw.children ?? []) {
				if (aRaw.type !== 'article') continue;
				directArticles.push(buildArticle(aRaw, directArticleSlugs));
			}

			const sectionParagraphs = [
				...builtChapters.flatMap((c) => c.paragraphs),
				...directArticles.flatMap((a) => a.paragraphs)
			];

			builtSections.push({
				slug: sectionSlug,
				title: sectionTitle,
				number: sectionNumber,
				chapters: builtChapters,
				articles_direct: directArticles.length > 0 ? directArticles : undefined,
				range: rangeOf(sectionParagraphs)
			});
		}

		const partParagraphs: number[] = [];
		for (const sec of builtSections) {
			for (const ch of sec.chapters) partParagraphs.push(...ch.paragraphs);
			for (const a of sec.articles_direct ?? []) partParagraphs.push(...a.paragraphs);
		}
		// Prologue paragraphs aren't tracked under sections — collect them from the raw tree.
		if (isPrologue) {
			collectParagraphs(partRaw, partParagraphs);
		}

		builtParts.push({
			slug: partSlug,
			title: partTitle,
			number: isPrologue ? undefined : partNumber,
			sections: builtSections,
			prologue: isPrologue,
			range: rangeOf(partParagraphs)
		});
	}

	return { corpus: 'ccc', parts: builtParts };
}
