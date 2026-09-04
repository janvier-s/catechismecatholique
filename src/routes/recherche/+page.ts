import { redirect } from '@sveltejs/kit';
import { detectIntent } from '$lib/utils/searchIntent';
import { loadNclBook, loadNclParagraphsBook } from '$lib/data/loaders';
import { mergeVerseSpans, filterBlocksToSpan, type VerseSpan } from '$lib/utils/paragraphExcerpt';
import type { NclBlock } from '$lib/data/types';
import type { PageLoad } from './$types';

export interface SearchHit {
	id: string;
	kind: 'paragraph' | 'heading' | 'compendium-question' | 'cdse-paragraph';
	number?: number;
	text: string;
	title?: string;
	paragraph_start?: number;
	chapter_slug?: string;
	corpus?: 'ccc' | 'compendium' | 'cdse';
	compendium_part?: string;
	score: number;
	match: Record<string, string[]>;
}

export interface SearchSuggestion {
	term: string;
	slug: string;
}

export interface VerseText {
	verse: string;
	text: string;
}

/** One contiguous span rendered in the reader's own paragraph/poetry style. */
export interface BibleExcerpt {
	from: number;
	to: number;
	blocks: NclBlock[];
}

export interface BibleCard {
	href: string;
	bookName: string;
	chapter: string;
	verse: string;
	/** Every verse/range named, in query order — used for the reference label
	 *  ("4, 3-5.8-10"). A single entry with from === to is a single verse.
	 *  `href` points to that group's own first verse, for the fallback
	 *  per-group link list. */
	groups: Array<{ from: string; to: string; href: string }>;
	/** Flat plain-text fallback, used when the book has no paragraph-mode
	 *  data (or the range falls outside it). */
	verseTexts?: VerseText[];
	/** Paragraph-mode excerpts, one per merged (non-adjacent) span. Present
	 *  only when the book's rich data actually covers the requested verses. */
	excerpts?: BibleExcerpt[];
}

export const load: PageLoad = async ({ url, fetch }) => {
	const raw = url.searchParams.get('q')?.trim() ?? '';
	const empty = {
		q: '',
		hits: [] as SearchHit[],
		bibleCard: null as BibleCard | null,
		mode: 'and' as 'and' | 'or',
		matchedTokens: [] as string[],
		tokens: [] as string[],
		suggestions: [] as SearchSuggestion[]
	};
	if (!raw) return empty;

	const intent = detectIntent(raw);

	// Paragraph refs still navigate directly.
	if (intent.kind === 'paragraph') {
		throw redirect(303, intent.href);
	}

	// Bible refs: show a Bible card at the top and also run a text search
	// for the query so CEC paragraphs citing this verse appear below it.
	if (intent.kind === 'bible') {
		const spans: VerseSpan[] = intent.groups.map((g) => ({
			from: parseInt(g.from, 10),
			to: parseInt(g.to, 10)
		}));
		const mergedSpans = mergeVerseSpans(spans);

		// Collect every verse number named, for the plain-text fallback.
		const verseNums: string[] = [];
		for (const span of mergedSpans) {
			for (let v = span.from; v <= span.to; v++) verseNums.push(String(v));
		}

		// Fetch verse text and paragraph-mode blocks alongside the CEC search.
		// All three requests run in parallel.
		const [bookData, paragraphsBook, searchResult] = await Promise.all([
			loadNclBook(intent.usfx, fetch),
			loadNclParagraphsBook(intent.usfx, fetch),
			fetch(`/api/search?q=${encodeURIComponent(raw)}`)
		]);

		const chData = bookData?.[intent.chapter];
		const verseTexts: VerseText[] = chData
			? verseNums.map((v) => ({ verse: v, text: chData[v] ?? '' })).filter((vt) => vt.text)
			: [];

		const chapterBlocks = paragraphsBook?.[intent.chapter]?.blocks;
		const excerpts: BibleExcerpt[] = chapterBlocks
			? mergedSpans
					.map((span) => ({ ...span, blocks: filterBlocksToSpan(chapterBlocks, span) }))
					.filter((e) => e.blocks.length > 0)
			: [];

		// href is `/bible/{slug}/{chapter}/{verse}` · reuse the slug for the
		// other groups' own links.
		const slug = intent.href.split('/')[2]!;
		const groups = intent.groups.map((g) => ({
			...g,
			href: `/bible/${slug}/${intent.chapter}/${g.from}`
		}));

		const bibleCard: BibleCard = {
			href: intent.href,
			bookName: intent.bookName,
			chapter: intent.chapter,
			verse: intent.verse,
			groups,
			...(verseTexts.length ? { verseTexts } : {}),
			...(excerpts.length ? { excerpts } : {})
		};
		if (!searchResult.ok) return { ...empty, q: raw, bibleCard };
		const data = (await searchResult.json()) as {
			hits: SearchHit[];
			mode?: 'and' | 'or';
			tokens?: string[];
			matchedTokens?: string[];
			suggestions?: SearchSuggestion[];
		};
		return {
			q: raw,
			bibleCard,
			hits: data.hits ?? [],
			mode: data.mode ?? 'and',
			tokens: data.tokens ?? [],
			matchedTokens: data.matchedTokens ?? [],
			suggestions: data.suggestions ?? []
		};
	}

	const q = intent.q;
	if (q.length < 2) return { ...empty, q };

	const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
	if (!r.ok) return { ...empty, q };
	const data = (await r.json()) as {
		hits: SearchHit[];
		mode?: 'and' | 'or';
		tokens?: string[];
		matchedTokens?: string[];
		suggestions?: SearchSuggestion[];
	};

	return {
		q,
		bibleCard: null,
		hits: data.hits,
		mode: data.mode ?? 'and',
		tokens: data.tokens ?? [],
		matchedTokens: data.matchedTokens ?? [],
		suggestions: data.suggestions ?? []
	};
};
