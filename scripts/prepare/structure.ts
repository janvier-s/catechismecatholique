import { slugify, uniqueSlug } from './slug';
import { sentenceCase } from './sentence-case';
import { normalizeGuillemets, stripBibRefColonMarkers } from './source-data-fixes';

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
	/** Paragraphs nested directly under the part (before its first section) —
	 *  e.g. Part 3's preamble §§1691-1698. Empty for most parts. */
	intro_paragraphs?: number[];
	intro_headings?: BuiltHeading[];
}

export interface BuiltSection {
	slug: string;
	title: string;
	number?: number;
	chapters: BuiltChapter[];
	articles_direct?: BuiltArticle[];
	range?: ParagraphRange;
	/** Paragraphs nested directly under the section, NOT inside any chapter
	 *  or articles_direct — e.g. Section 2 of Part 1 has §§185-197 as a
	 *  Symboles-de-la-foi preamble between the previous section's last
	 *  chapter and this section's first chapter. */
	intro_paragraphs?: number[];
	intro_headings?: BuiltHeading[];
	/** En Bref blocks nested directly under the section (outside any chapter)
	 *  — e.g. the Décalogue's §§2075-2082 sit at section level. */
	en_brefs?: { paragraphs: number[] }[];
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

/** Find the first paragraph number anywhere in the subtree of `nodes`. */
function findFirstParagraph(nodes: RawNode[]): number {
	for (const n of nodes) {
		if (n.type === 'paragraph' && typeof n.number === 'number') return n.number;
		const c = findFirstParagraph(n.children ?? []);
		if (c >= 0) return c;
	}
	return -1;
}

function collectHeadings(nodes: RawNode[]): BuiltHeading[] {
	const out: BuiltHeading[] = [];
	for (const n of nodes) {
		if (n.type === 'heading' || n.type === 'sub_heading') {
			const level = n.type === 'heading' ? 2 : 3;
			const title = (n.title ?? '').trim();
			const id = slugify(title) || `h-${out.length}`;
			// Recursively find the first paragraph anywhere under this heading.
			// Some headings (e.g. "II. L'œuvre du Christ dans la liturgie")
			// have no direct paragraph children — their paragraphs sit two
			// levels deep, inside nested sub_headings. The previous direct-
			// child check dropped these silently.
			const firstParagraph = findFirstParagraph(n.children ?? []);
			if (firstParagraph >= 0) {
				out.push({
					id,
					level,
					title: stripBibRefColonMarkers(normalizeGuillemets(sentenceCase(title))),
					paragraph_start: firstParagraph
				});
			}
			// Recurse so sub_headings nested under this heading also surface
			// in the article's flat heading list.
			out.push(...collectHeadings(n.children ?? []));
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

/** Walk a container's children, returning the paragraphs and headings that
 *  belong to it directly — i.e. anything nested inside the container that
 *  ISN'T itself a chapter / section / article (those have their own
 *  builders). Used to capture section and part intros that the upstream
 *  tree leaves outside the chapter/article hierarchy. */
function collectIntro(
	containerRaw: RawNode,
	skipTypes: ReadonlySet<string>
): { paragraphs: number[]; headings: BuiltHeading[] } {
	const paragraphs: number[] = [];
	const introNodes: RawNode[] = [];
	for (const c of containerRaw.children ?? []) {
		if (skipTypes.has(c.type)) continue;
		introNodes.push(c);
	}
	for (const n of introNodes) collectParagraphs(n, paragraphs);
	const headings = collectHeadings(introNodes);
	return { paragraphs, headings };
}

function buildArticle(aRaw: RawNode, articleSlugs: Set<string>): BuiltArticle {
	const aTitle = stripBibRefColonMarkers(
		normalizeGuillemets(sentenceCase(stripPrefix(aRaw.title ?? '', ARTICLE_PREFIX)))
	);
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
			: stripBibRefColonMarkers(
					normalizeGuillemets(sentenceCase(stripPrefix(partRaw.title ?? '', PART_PREFIX)))
				);
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
			const sectionTitle = stripBibRefColonMarkers(
				normalizeGuillemets(sentenceCase(stripPrefix(childRaw.title ?? '', SECTION_PREFIX)))
			);
			const sectionSlug = uniqueSlug(sectionTitle, sectionSlugs);

			const chapterSlugs = new Set<string>();
			const builtChapters: BuiltChapter[] = [];
			let chapterNumber = 0;
			for (const chapRaw of childRaw.children ?? []) {
				if (chapRaw.type !== 'chapter') continue;
				chapterNumber++;
				const chapTitle = stripBibRefColonMarkers(
					normalizeGuillemets(sentenceCase(stripPrefix(chapRaw.title ?? '', CHAPITRE_PREFIX)))
				);
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

			// Section-direct intro: paragraphs/headings that sit under the
			// section but outside any chapter or direct-article. Captures
			// e.g. §§185-197 (Section 2 of Part 1's Apostles' Creed preamble).
			const sectionIntro = collectIntro(childRaw, new Set(['chapter', 'article', 'en_bref']));
			// Section-level en_bref blocks — sit DIRECTLY under the section,
			// outside any chapter. The Décalogue section's §§2075-2082 is the
			// canonical example. Captured here so the section page can render
			// them as a styled En Bref block (otherwise they're invisible).
			const sectionEnBrefBlocks: { paragraphs: number[] }[] = [];
			for (const c of childRaw.children ?? []) {
				if (c.type !== 'en_bref') continue;
				const ps: number[] = [];
				collectParagraphs(c, ps);
				if (ps.length > 0) sectionEnBrefBlocks.push({ paragraphs: ps });
			}
			const sectionEnBrefParas = sectionEnBrefBlocks.flatMap((b) => b.paragraphs);

			const sectionParagraphs = [
				...sectionIntro.paragraphs,
				...sectionEnBrefParas,
				...builtChapters.flatMap((c) => c.paragraphs),
				...directArticles.flatMap((a) => a.paragraphs)
			];

			builtSections.push({
				slug: sectionSlug,
				title: sectionTitle,
				number: sectionNumber,
				chapters: builtChapters,
				articles_direct: directArticles.length > 0 ? directArticles : undefined,
				range: rangeOf(sectionParagraphs),
				intro_paragraphs: sectionIntro.paragraphs.length > 0 ? sectionIntro.paragraphs : undefined,
				intro_headings: sectionIntro.headings.length > 0 ? sectionIntro.headings : undefined,
				en_brefs: sectionEnBrefBlocks.length > 0 ? sectionEnBrefBlocks : undefined
			});
		}

		// Part-direct intro: paragraphs/headings that sit under the part but
		// outside any section. Captures e.g. Part 3's §§1691-1698 preamble
		// before its first section, plus Part 2's "Pourquoi la Liturgie?"
		// preamble (which lives at part-level under sub_headings). The
		// prologue (which has no sections by design) is also captured here
		// so its Roman-numeral heading divisions render on the part page.
		const partIntro = collectIntro(partRaw, new Set(['section']));

		const partParagraphs: number[] = [];
		for (const sec of builtSections) {
			partParagraphs.push(...(sec.intro_paragraphs ?? []));
			for (const ch of sec.chapters) partParagraphs.push(...ch.paragraphs);
			for (const a of sec.articles_direct ?? []) partParagraphs.push(...a.paragraphs);
		}
		partParagraphs.push(...partIntro.paragraphs);

		builtParts.push({
			slug: partSlug,
			title: partTitle,
			number: isPrologue ? undefined : partNumber,
			sections: builtSections,
			prologue: isPrologue,
			range: rangeOf(partParagraphs),
			intro_paragraphs: partIntro.paragraphs.length > 0 ? partIntro.paragraphs : undefined,
			intro_headings: partIntro.headings.length > 0 ? partIntro.headings : undefined
		});
	}

	return { corpus: 'ccc', parts: builtParts };
}
