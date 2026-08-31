import type { CalendrierCluster } from './calendrier.ts';
import type { CccCitation } from './concordanceMatcher.ts';

export interface CecHeading {
	title: string;
	paragraph_start: number;
}

export interface CecRange {
	from: number;
	to: number;
}

export interface CecArticle {
	title: string;
	range: CecRange;
	headings: CecHeading[];
}

export interface CecChapter {
	title: string;
	range: CecRange;
	headings: CecHeading[];
	articles: CecArticle[];
}

export interface CecSection {
	chapters: CecChapter[];
}

export interface CecPart {
	title: string;
	prologue?: boolean;
	range?: CecRange;
	intro_headings?: CecHeading[];
	sections?: CecSection[];
}

export interface CecStructureFile {
	parts: CecPart[];
}

interface Span {
	start: number;
	end: number;
	title: string;
}

export interface HeadingLevels {
	fine: Span[];
	article: Span[];
	chapter: Span[];
}

/** Turns a list of (paragraph_start, title) into non-overlapping spans, each
 *  ending one paragraph before the next entry starts. The last entry's span
 *  runs to `maxParagraph` (the CCC's last paragraph, 2865) so the coarsest
 *  level always has zero gaps. */
function closeSpans(entries: { start: number; title: string }[], maxParagraph: number): Span[] {
	const sorted = [...entries].sort((a, b) => a.start - b.start);
	return sorted.map((entry, i) => ({
		start: entry.start,
		end: i + 1 < sorted.length ? sorted[i + 1]!.start - 1 : maxParagraph,
		title: entry.title
	}));
}

const MAX_PARAGRAPH = 2865;

export function buildHeadingLevels(structure: CecStructureFile): HeadingLevels {
	const fineSpans: Span[] = [];
	const articleSpans: Span[] = [];
	const chapterEntries: { start: number; title: string }[] = [];

	for (const part of structure.parts) {
		if (part.prologue) {
			const prologueHeadings = part.intro_headings ?? [];
			if (prologueHeadings.length > 0) {
				const prologueEntries = prologueHeadings.map((h) => ({
					start: h.paragraph_start,
					title: h.title
				}));
				if (part.range) {
					fineSpans.push(...closeSpans(prologueEntries, part.range.to));
				}
			}
			if (part.range) chapterEntries.push({ start: part.range.from, title: part.title });
			continue;
		}
		for (const section of part.sections ?? []) {
			for (const chapter of section.chapters) {
				chapterEntries.push({ start: chapter.range.from, title: chapter.title });

				const chapterHeadings = chapter.headings ?? [];
				if (chapterHeadings.length > 0) {
					const chapterHeadingEntries = chapterHeadings.map((h) => ({
						start: h.paragraph_start,
						title: h.title
					}));
					// A chapter's own headings are its intro material · where the
					// chapter also has articles, they stop at the first article
					// rather than running to the chapter's end, otherwise the last
					// intro heading swallows every article below it and mislabels
					// every citation inside them (real case: 422-682, where
					// « Au cœur de la catéchèse : le Christ » would cover 426-682).
					const firstArticle = chapter.articles[0];
					const chapterHeadingsEnd = firstArticle ? firstArticle.range.from - 1 : chapter.range.to;
					fineSpans.push(...closeSpans(chapterHeadingEntries, chapterHeadingsEnd));
				}

				for (const article of chapter.articles) {
					articleSpans.push({
						start: article.range.from,
						end: article.range.to,
						title: article.title
					});

					const articleHeadings = article.headings ?? [];
					if (articleHeadings.length > 0) {
						const articleHeadingEntries = articleHeadings.map((h) => ({
							start: h.paragraph_start,
							title: h.title
						}));
						fineSpans.push(...closeSpans(articleHeadingEntries, article.range.to));
					}
				}
			}
		}
	}

	fineSpans.sort((a, b) => a.start - b.start);
	articleSpans.sort((a, b) => a.start - b.start);

	return {
		fine: fineSpans,
		article: articleSpans,
		chapter: closeSpans(chapterEntries, MAX_PARAGRAPH)
	};
}

/** Returns the narrowest span containing [from, to]. Spans at one level are
 *  meant to be non-overlapping, but nothing enforces that, and picking the
 *  first match in start order would silently prefer an over-wide span over the
 *  precise one it overlaps. */
function findContaining(spans: Span[], from: number, to: number): string | null {
	let best: Span | null = null;
	for (const span of spans) {
		if (span.start > from) break; // start-sorted: nothing later can contain `from`
		if (to > span.end) continue;
		if (!best || span.end - span.start < best.end - best.start) best = span;
	}
	return best?.title ?? null;
}

function bestHeadingFor(levels: HeadingLevels, from: number, to: number): string {
	return (
		findContaining(levels.fine, from, to) ??
		findContaining(levels.article, from, to) ??
		findContaining(levels.chapter, from, to) ??
		'Autres références'
	);
}

function formatCecRanges(paragraphs: number[]): string {
	const sorted = [...new Set(paragraphs)].sort((a, b) => a - b);
	const parts: string[] = [];
	let runStart = sorted[0]!;
	let prev = sorted[0]!;
	for (let i = 1; i <= sorted.length; i++) {
		const n = sorted[i];
		if (n !== undefined && n === prev + 1) {
			prev = n;
			continue;
		}
		parts.push(runStart === prev ? `${runStart}` : `${runStart}-${prev}`);
		if (n !== undefined) {
			runStart = n;
			prev = n;
		}
	}
	return parts.join(', ');
}

/**
 * Groups cited CCC ranges by the finest heading that fully contains each
 * range (falling back to article, then chapter, when a range spans a finer
 * boundary · verified against the real Beatitudes case, CEC 1716-1729,
 * which spans three fine headings and correctly resolves to its containing
 * article). Groups sharing a resolved title are merged into one cluster.
 * Sorted by paragraph count descending, capped at `cap` (default 7, the
 * highest cluster count any hand-curated Sunday feast reaches in
 * CCC_Liturgy_List.txt).
 */
export function clusterCitations(
	citations: CccCitation[],
	levels: HeadingLevels,
	cap = 7
): CalendrierCluster[] {
	const paragraphsByTheme = new Map<string, Set<number>>();
	for (const { from, to } of citations) {
		const theme = bestHeadingFor(levels, from, to);
		const set = paragraphsByTheme.get(theme) ?? new Set<number>();
		for (let n = from; n <= to; n++) set.add(n);
		paragraphsByTheme.set(theme, set);
	}

	const clusters = [...paragraphsByTheme.entries()]
		.map(([theme, set]) => ({ theme, paragraphs: [...set].sort((a, b) => a - b) }))
		.sort((a, b) => b.paragraphs.length - a.paragraphs.length)
		.slice(0, cap);

	return clusters.map((c, i) => ({
		i,
		theme: c.theme,
		refs: formatCecRanges(c.paragraphs),
		paragraphs: c.paragraphs
	}));
}
