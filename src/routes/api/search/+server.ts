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
	kind: 'paragraph' | 'heading' | 'compendium-question';
	number?: number;
	text: string;
	title?: string;
	paragraph_start?: number;
	chapter_slug?: string;
	corpus?: 'ccc' | 'compendium';
	compendium_part?: string;
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
let suggestionsCache: { lookup: Record<string, string> } | null = null;

async function loadSuggestions(fetcher: typeof fetch): Promise<{ lookup: Record<string, string> }> {
	if (suggestionsCache) return suggestionsCache;
	try {
		const r = await fetcher('/data/cec/search-suggestions.json');
		if (!r.ok) return { lookup: {} };
		suggestionsCache = (await r.json()) as { lookup: Record<string, string> };
	} catch {
		suggestionsCache = { lookup: {} };
	}
	return suggestionsCache;
}

// When the main search returns zero hits, find glossary-term suggestions
// whose folded form contains any of the query tokens. Returns up to 8
// {term, slug} pairs ordered by closest match first.
function findSuggestions(
	tokens: string[],
	suggestions: { lookup: Record<string, string> }
): { term: string; slug: string }[] {
	if (tokens.length === 0) return [];
	const folded = tokens
		.map((t) => stripDiacritics(t).toLowerCase())
		.filter((t) => t.length >= 3 && !FR_STOP_WORDS.has(t));
	if (folded.length === 0) return [];
	const out: { term: string; slug: string; score: number }[] = [];
	for (const [term, slug] of Object.entries(suggestions.lookup)) {
		// Term keys are already folded + lowercase in the suggestions file.
		let score = 0;
		for (const tok of folded) {
			if (term === tok) {
				score += 100;
			} else if (term.startsWith(tok)) {
				score += 20;
			} else if (term.includes(tok)) {
				score += 10;
			}
		}
		if (score > 0) {
			// Penalise long compound terms so a query for "peur" doesn't
			// surface "peurprudence-de-…" ahead of bare "peur".
			score -= Math.min(8, term.length / 6);
			out.push({ term, slug, score });
		}
	}
	out.sort((a, b) => b.score - a.score);
	return out.slice(0, 8).map((s) => ({ term: s.term, slug: s.slug }));
}

async function loadIndex(fetcher: typeof fetch): Promise<MiniSearch> {
	if (cached) return cached;
	const r = await fetcher('/data/search/search-index.json');
	if (!r.ok) throw new Error(`search index missing: ${r.status}`);
	const raw = await r.text();
	const ms = MiniSearch.loadJSON(raw, {
		fields: ['text', 'title'],
		storeFields: [
			'kind',
			'number',
			'text',
			'title',
			'paragraph_start',
			'chapter_slug',
			'corpus',
			'compendium_part'
		],
		tokenize: searchTokenizer,
		processTerm
	});
	cached = ms;
	return ms;
}

const MAX_QUERY_LEN = 200;

// Compute the set of query tokens that actually contributed to at least one
// hit's match map. Used by the UI to surface "résultats partiels: only
// 'peur' a été trouvé" when the AND combination gave up.
function matchedTokensFor(hits: { match: Record<string, string[]> }[], tokens: string[]): string[] {
	if (hits.length === 0) return [];
	const matched = new Set<string>();
	for (const h of hits) {
		for (const k of Object.keys(h.match ?? {})) {
			matched.add(stripDiacritics(k).toLowerCase());
		}
	}
	const tokSet = new Set(tokens.map((t) => stripDiacritics(t).toLowerCase()));
	return tokens.filter((t) => {
		const norm = stripDiacritics(t).toLowerCase();
		return matched.has(norm) && tokSet.has(norm);
	});
}

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
	const positions: { pos: number; tok: string }[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(folded)) !== null) {
		if (tokenSet.has(m[0])) positions.push({ pos: m.index, tok: m[0] });
	}
	if (positions.length === 0) return text.slice(0, SNIPPET_MAX);
	// Pick the window that covers the most DISTINCT query tokens, breaking ties
	// by total match count. Without this, a paragraph that mentions "vie" early
	// and "pain ... vie" later returns the early window and the user can't see
	// why the result matched their multi-word query.
	let best = { start: 0, distinct: 0, count: 0 };
	for (const { pos } of positions) {
		const start = Math.max(0, pos - SNIPPET_PRE);
		const end = start + SNIPPET_MAX;
		const inWindow = positions.filter((p) => p.pos >= start && p.pos < end);
		const distinct = new Set(inWindow.map((p) => p.tok)).size;
		if (distinct > best.distinct || (distinct === best.distinct && inWindow.length > best.count)) {
			best = { start, distinct, count: inWindow.length };
		}
	}
	return text.slice(best.start, best.start + SNIPPET_MAX);
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

	// Content tokens (non-stop) drive the OR fallback and suggestions — a
	// paragraph matching only "de" is never useful. AND search keeps the stop
	// words: for "pain de vie" we want pain AND de AND vie as a hard filter,
	// then the phrase boost surfaces the literal "pain de vie" matches first.
	const contentTokens = tokens.filter((t) => !FR_STOP_WORDS.has(t));
	if (contentTokens.length === 0) return json({ q, hits: [] });

	const ms = await loadIndex(fetch);
	// Apply œ→oe alias substitution before the MiniSearch call. The index was
	// built with processTerm normalising œ→oe, so 'ecumenique' (typed) needs
	// to become 'oecumenique' (indexed form) to get a hit.
	const andQ = tokens.map((t) => OE_ALIASES[t] ?? t).join(' ');
	const orQ = contentTokens.map((t) => OE_ALIASES[t] ?? t).join(' ');
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
	const searchOpts = {
		prefix: (term: string) => term.length >= 4,
		boost: { text: 2, title: 0.3 }
	};
	// Try strict AND first (every token must match). If nothing comes back,
	// fall back to OR — a query like "n'ai pas peur" stays useful when only
	// "peur" actually occurs in the corpus.
	let raw = ms.search(andQ, { ...searchOpts, combineWith: 'AND' });
	let mode: 'and' | 'or' = 'and';
	if (raw.length === 0 && tokens.length > 1) {
		// Drop AND to OR — and drop stop words too, so we don't surface
		// paragraphs that only match "de" / "le" / "pas".
		raw = ms.search(orQ, { ...searchOpts, combineWith: 'OR' });
		mode = 'or';
	}
	// Cap server-side at 200 — enough to support a few "Voir plus" pages
	// without overwhelming the client. The page paginates the visible slice.
	// Pipeline: BM25 → position boost → phrase boost. Position runs before
	// phrase so within each phrase-or-not group, results are still ordered by
	// position-adjusted score.
	const positioned = applyPositionBoost(raw, tokens);
	const ranked = applyPhraseBoost(positioned, tokens).slice(0, 200);
	const hits: SearchResultDoc[] = ranked.map((r) => ({
		id: r.id as string,
		kind: r.kind as 'paragraph' | 'heading' | 'compendium-question',
		number: r.number as number | undefined,
		text: trimText(r.text as string, tokens),
		title: r.title as string | undefined,
		paragraph_start: r.paragraph_start as number | undefined,
		chapter_slug: r.chapter_slug as string | undefined,
		corpus: r.corpus as 'ccc' | 'compendium' | undefined,
		compendium_part: r.compendium_part as string | undefined,
		score: r.score,
		match: r.match
	}));
	const matchedTokens = matchedTokensFor(hits, contentTokens);
	const suggestions =
		hits.length === 0 ? findSuggestions(contentTokens, await loadSuggestions(fetch)) : [];
	return json(
		{ q, hits, mode, tokens, matchedTokens, suggestions },
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
