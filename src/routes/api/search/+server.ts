import { json } from '@sveltejs/kit';
import MiniSearch from 'minisearch';
import {
	searchTokenizer,
	processTerm,
	stripDiacritics,
	FR_STOP_WORDS
} from '$lib/utils/searchTokenizer';
import type { RequestHandler } from './$types';

interface SearchResultDoc {
	id: string;
	kind: 'paragraph' | 'heading';
	number?: number;
	text: string;
	title?: string;
	paragraph_start?: number;
	chapter_slug?: string;
	score: number;
	match: Record<string, string[]>;
}

let cached: { ms: MiniSearch; raw: string } | null = null;

async function loadIndex(
	platform: App.Platform | undefined,
	fetcher: typeof fetch
): Promise<MiniSearch> {
	let raw: string | null = null;
	if (platform?.env?.SEARCH_INDEX) {
		raw = await platform.env.SEARCH_INDEX.get('search-index');
	}
	if (!raw) {
		const r = await fetcher('/data/search/search-index.json');
		if (!r.ok) throw new Error(`search index missing: ${r.status}`);
		raw = await r.text();
	}
	if (cached && cached.raw === raw) return cached.ms;
	const ms = MiniSearch.loadJSON(raw, {
		fields: ['text', 'title'],
		storeFields: ['kind', 'number', 'text', 'title', 'paragraph_start', 'chapter_slug'],
		tokenize: searchTokenizer,
		processTerm
	});
	cached = { ms, raw };
	return ms;
}

const MAX_QUERY_LEN = 200;

// Promote results containing the literal contiguous phrase. BM25 sums per-token
// contributions, so a long paragraph with many common-word hits can outrank a
// short paragraph that has the exact phrase the user typed. This re-sort makes
// phrase matches win when present, while preserving relative score order
// within each group.
function applyPhraseBoost<T extends Record<string, unknown>>(results: T[], tokens: string[]): T[] {
	if (tokens.length < 2) return results;
	const phrase = tokens.join(' ');
	const phraseHits: T[] = [];
	const rest: T[] = [];
	for (const r of results) {
		const folded = stripDiacritics(String(r.text ?? ''))
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.trim();
		if (folded.includes(phrase)) phraseHits.push(r);
		else rest.push(r);
	}
	return [...phraseHits, ...rest];
}

export const GET: RequestHandler = async ({ url, fetch, platform }) => {
	const q = (url.searchParams.get('q')?.trim() ?? '').slice(0, MAX_QUERY_LEN);
	if (q.length < 2) return json({ q, hits: [] });

	// Reject queries that consist of nothing but stop words ("le", "le est",
	// etc.) — they'd match nearly every paragraph and aren't meaningful.
	// Stop words inside a multi-word query are kept (e.g. "image de Dieu"
	// stays as written).
	const tokens = searchTokenizer(q);
	if (tokens.length === 0 || tokens.every((t) => FR_STOP_WORDS.has(t))) {
		return json({ q, hits: [] });
	}

	const ms = await loadIndex(platform, fetch);
	// AND combination: every token must match. With OR (MiniSearch's default),
	// a query like "image de Dieu" matched any paragraph containing just
	// "Dieu" — irrelevant for a corpus where that word appears everywhere.
	// Restrict prefix expansion to tokens of length ≥ 4 so common short French
	// words don't pull in unintended matches.
	// Fuzzy is disabled: with the catechism's curated French vocabulary, even
	// 1-edit fuzzy matches are too aggressive (e.g. `maitre`→`naitre`).
	const raw = ms.search(q, {
		combineWith: 'AND',
		prefix: (term) => term.length >= 4,
		boost: { title: 2 }
	});
	const ranked = applyPhraseBoost(raw, tokens).slice(0, 30);
	const hits: SearchResultDoc[] = ranked.map((r) => ({
		id: r.id as string,
		kind: r.kind as 'paragraph' | 'heading',
		number: r.number as number | undefined,
		text: r.text as string,
		title: r.title as string | undefined,
		paragraph_start: r.paragraph_start as number | undefined,
		chapter_slug: r.chapter_slug as string | undefined,
		score: r.score,
		match: r.match
	}));
	return json({ q, hits });
};
