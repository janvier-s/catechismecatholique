import { redirect } from '@sveltejs/kit';
import { detectIntent } from '$lib/utils/searchIntent';
import { loadNclBook } from '$lib/data/loaders';
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

export interface BibleCard {
	href: string;
	bookName: string;
	chapter: string;
	verse: string;
	verseEnd?: string;
	additionalVerses?: Array<{ verse: string; href: string }>;
	verseTexts?: VerseText[];
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
		// Collect all verse numbers to display: single, range, or discrete list.
		const verseNums: string[] = [];
		if (intent.verseEnd) {
			const from = parseInt(intent.verse, 10);
			const to = parseInt(intent.verseEnd, 10);
			for (let v = from; v <= to; v++) verseNums.push(String(v));
		} else if (intent.additionalVerses?.length) {
			verseNums.push(intent.verse);
			for (const av of intent.additionalVerses) verseNums.push(av.verse);
		} else {
			verseNums.push(intent.verse);
		}

		// Fetch verse text alongside the CEC search. Both requests run in parallel.
		const [bookData, searchResult] = await Promise.all([
			loadNclBook(intent.usfx, fetch),
			fetch(`/api/search?q=${encodeURIComponent(raw)}`)
		]);

		const chData = bookData?.[intent.chapter];
		const verseTexts: VerseText[] = chData
			? verseNums.map((v) => ({ verse: v, text: chData[v] ?? '' })).filter((vt) => vt.text)
			: [];

		const bibleCard: BibleCard = {
			href: intent.href,
			bookName: intent.bookName,
			chapter: intent.chapter,
			verse: intent.verse,
			...(intent.verseEnd ? { verseEnd: intent.verseEnd } : {}),
			...(intent.additionalVerses ? { additionalVerses: intent.additionalVerses } : {}),
			...(verseTexts.length ? { verseTexts } : {})
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
