import { slugify, uniqueSlug } from './slug';

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

export interface BuiltPart {
	slug: string;
	title: string;
	sections: BuiltSection[];
	prologue?: boolean;
}

export interface BuiltSection {
	slug: string;
	title: string;
	chapters: BuiltChapter[];
}

export interface BuiltChapter {
	slug: string;
	title: string;
	articles: BuiltArticle[];
	paragraphs: number[];
	headings: BuiltHeading[];
}

export interface BuiltArticle {
	slug: string;
	title: string;
	headings: BuiltHeading[];
	paragraphs: number[];
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
const ARTICLE_PREFIX = /^Article\s+\d+\s*[:.\s-]*/iu;

function stripPrefix(title: string, regex: RegExp): string {
	return title.replace(regex, '').trim();
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
			if (firstParagraph >= 0) out.push({ id, level, title, paragraph_start: firstParagraph });
		}
	}
	return out;
}

export function buildStructure(parts: RawNode[]): BuiltStructure {
	const partSlugs = new Set<string>();
	const builtParts: BuiltPart[] = [];

	for (const partRaw of parts) {
		const isPrologue = (partRaw.title ?? '').trim().toUpperCase() === 'PROLOGUE';
		const partTitle = isPrologue ? 'Prologue' : stripPrefix(partRaw.title ?? '', PART_PREFIX);
		const partSlug = isPrologue ? 'prologue' : uniqueSlug(partTitle, partSlugs);
		if (isPrologue) {
			if (partSlugs.has(partSlug)) {
				throw new Error(`Slug collision: "${partSlug}" (from title "${partRaw.title}")`);
			}
			partSlugs.add(partSlug);
		}

		const sectionSlugs = new Set<string>();
		const builtSections: BuiltSection[] = [];

		for (const childRaw of partRaw.children ?? []) {
			if (childRaw.type !== 'section') continue;
			const sectionTitle = stripPrefix(childRaw.title ?? '', SECTION_PREFIX);
			const sectionSlug = uniqueSlug(sectionTitle, sectionSlugs);

			const chapterSlugs = new Set<string>();
			const builtChapters: BuiltChapter[] = [];
			for (const chapRaw of childRaw.children ?? []) {
				if (chapRaw.type !== 'chapter') continue;
				const chapTitle = stripPrefix(chapRaw.title ?? '', CHAPITRE_PREFIX);
				const chapSlug = uniqueSlug(chapTitle, chapterSlugs);

				const chapParagraphs: number[] = [];
				collectParagraphs(chapRaw, chapParagraphs);

				const articleSlugs = new Set<string>();
				const articles: BuiltArticle[] = [];
				for (const aRaw of chapRaw.children ?? []) {
					if (aRaw.type !== 'article') continue;
					const aTitle = stripPrefix(aRaw.title ?? '', ARTICLE_PREFIX);
					const aSlug = uniqueSlug(aTitle, articleSlugs);
					const aParas: number[] = [];
					collectParagraphs(aRaw, aParas);
					articles.push({
						slug: aSlug,
						title: aTitle,
						headings: collectHeadings(aRaw.children ?? []),
						paragraphs: aParas
					});
				}

				builtChapters.push({
					slug: chapSlug,
					title: chapTitle,
					articles,
					paragraphs: chapParagraphs,
					headings: collectHeadings(chapRaw.children ?? [])
				});
			}

			builtSections.push({ slug: sectionSlug, title: sectionTitle, chapters: builtChapters });
		}

		builtParts.push({
			slug: partSlug,
			title: partTitle,
			sections: builtSections,
			prologue: isPrologue
		});
	}

	return { corpus: 'ccc', parts: builtParts };
}
