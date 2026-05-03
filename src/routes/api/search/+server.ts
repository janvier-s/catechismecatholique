import { json } from '@sveltejs/kit';
import MiniSearch from 'minisearch';
import { searchTokenizer, processTerm } from '$lib/utils/searchTokenizer';
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

export const GET: RequestHandler = async ({ url, fetch, platform }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length < 2) return json({ q, hits: [] });
	const ms = await loadIndex(platform, fetch);
	const raw = ms.search(q, { prefix: true, fuzzy: 0.15, boost: { title: 2 } }).slice(0, 30);
	const hits: SearchResultDoc[] = raw.map((r) => ({
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
