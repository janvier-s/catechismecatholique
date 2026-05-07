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

// œ expands to 'oe' at index time, but a user who types the modern French
// spelling (e.g. 'ecumenique') gets 'ecumenique' from processTerm — no match.
// Map the e-only form → canonical oe-form before handing off to MiniSearch.
const OE_ALIASES: Record<string, string> = {
	ecumenique: 'oecumenique',
	ecumeniques: 'oecumeniques',
	ecumenisme: 'oecumenisme',
	ecumenismes: 'oecumenismes'
};

let cached: MiniSearch | null = null;

async function loadIndex(fetcher: typeof fetch): Promise<MiniSearch> {
	if (cached) return cached;
	const r = await fetcher('/data/search/search-index.json');
	if (!r.ok) throw new Error(`search index missing: ${r.status}`);
	const raw = await r.text();
	const ms = MiniSearch.loadJSON(raw, {
		fields: ['text', 'title'],
		storeFields: ['kind', 'number', 'text', 'title', 'paragraph_start', 'chapter_slug'],
		tokenize: searchTokenizer,
		processTerm
	});
	cached = ms;
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

// Trim each hit's text to a window centered on the first matching token. The
// client renders a 220-char snippet via bestSnippet — anything beyond that is
// wasted bytes and inflates the response (worst case ~150 KB from a 2-char
// query). Window: up to MAX chars, biased to start at first match minus PRE.
// Falls back to leading text when no match is found within scan budget.
const SNIPPET_MAX = 400;
const SNIPPET_PRE = 80;
function trimText(text: string, tokens: string[]): string {
	if (text.length <= SNIPPET_MAX) return text;
	if (tokens.length === 0) return text.slice(0, SNIPPET_MAX);
	const folded = stripDiacritics(text).toLowerCase();
	const tokenSet = new Set(tokens.map((t) => stripDiacritics(t).toLowerCase()));
	const re = /[\p{L}\p{N}]+/gu;
	let match = -1;
	let m: RegExpExecArray | null;
	while ((m = re.exec(folded)) !== null) {
		if (tokenSet.has(m[0])) {
			match = m.index;
			break;
		}
	}
	const start = match < 0 ? 0 : Math.max(0, match - SNIPPET_PRE);
	return text.slice(start, start + SNIPPET_MAX);
}

// Position-aware re-rank: a paragraph that opens with the query term is almost
// always about it; one where the term appears 800 chars in usually isn't. We
// scan each result for the first whole-word match of any query token and bump
// the score by up to +50% when the match sits near the start, decaying
// linearly over the first 200 characters. Headings are too short for this to
// matter; the effect is concentrated on paragraph ordering, which is what BM25
// alone tends to get wrong on a topical word like "eucharistie".
function applyPositionBoost<T extends { text?: unknown; score: number }>(
	results: T[],
	tokens: string[]
): T[] {
	if (tokens.length === 0) return results;
	const tokenSet = new Set(tokens.map((t) => stripDiacritics(t).toLowerCase()));
	return results
		.map((r) => {
			const text = stripDiacritics(String(r.text ?? '')).toLowerCase();
			if (!text) return r;
			const re = /[\p{L}\p{N}]+/gu;
			let earliest = -1;
			let m: RegExpExecArray | null;
			while ((m = re.exec(text)) !== null) {
				if (tokenSet.has(m[0])) {
					earliest = m.index;
					break;
				}
			}
			if (earliest < 0) return r;
			const decay = Math.max(0, 1 - earliest / 200);
			return { ...r, score: r.score * (1 + decay * 0.5) };
		})
		.sort((a, b) => b.score - a.score);
}

export const GET: RequestHandler = async ({ url, fetch }) => {
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

	const ms = await loadIndex(fetch);
	// Apply œ→oe alias substitution before the MiniSearch call. The index was
	// built with processTerm normalising œ→oe, so 'ecumenique' (typed) needs
	// to become 'oecumenique' (indexed form) to get a hit.
	const searchQ = tokens.map((t) => OE_ALIASES[t] ?? t).join(' ');
	// AND combination: every token must match. With OR (MiniSearch's default),
	// a query like "image de Dieu" matched any paragraph containing just
	// "Dieu" — irrelevant for a corpus where that word appears everywhere.
	// Restrict prefix expansion to tokens of length ≥ 4 so common short French
	// words don't pull in unintended matches.
	// Fuzzy is disabled: with the catechism's curated French vocabulary, even
	// 1-edit fuzzy matches are too aggressive (e.g. `maitre`→`naitre`).
	// Field weights: `text` carries the actual content (paragraph body, or
	// heading line). `title` only carries the chapter title — that's ambient
	// context, not what the document is about. Without this skew, every
	// heading inside a chapter whose title contains the query gets a free
	// boost, which is how off-topic section titles surfaced ahead of the
	// canonical paragraphs (e.g. searching "eucharistie" pulled an unrelated
	// heading 2177 above heading 1337).
	const raw = ms.search(searchQ, {
		combineWith: 'AND',
		prefix: (term) => term.length >= 4,
		boost: { text: 2, title: 0.3 }
	});
	// Cap server-side at 200 — enough to support a few "Voir plus" pages
	// without overwhelming the client. The page paginates the visible slice.
	// Pipeline: BM25 → position boost → phrase boost. Position runs before
	// phrase so within each phrase-or-not group, results are still ordered by
	// position-adjusted score.
	const positioned = applyPositionBoost(raw, tokens);
	const ranked = applyPhraseBoost(positioned, tokens).slice(0, 200);
	const hits: SearchResultDoc[] = ranked.map((r) => ({
		id: r.id as string,
		kind: r.kind as 'paragraph' | 'heading',
		number: r.number as number | undefined,
		text: trimText(r.text as string, tokens),
		title: r.title as string | undefined,
		paragraph_start: r.paragraph_start as number | undefined,
		chapter_slug: r.chapter_slug as string | undefined,
		score: r.score,
		match: r.match
	}));
	return json(
		{ q, hits },
		{
			headers: {
				// Identical queries can be served from the edge cache for an hour;
				// browser revalidates after 5 minutes. Cuts Worker CPU on common
				// queries (eucharistie, trinité, etc.) and limits amplification
				// surface from random short queries.
				'Cache-Control': 'public, max-age=300, s-maxage=3600'
			}
		}
	);
};
