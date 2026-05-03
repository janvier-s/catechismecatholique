import type {
	Paragraph,
	Chapter,
	AbbreviationMap,
	ParagraphContext,
	SourceEntry,
	BibleVerseIndex,
	ConcordanceVerseIndex,
	GlossaryBundle
} from './types';

type Fetch = typeof fetch;

async function fetchJson<T>(url: string, fetcher: Fetch): Promise<T> {
	const res = await fetcher(url);
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	return res.json() as Promise<T>;
}

// Module-level promise caches for the verse indices: the page load fills the
// cache, and TabBibleVerse hits the same promise instead of re-fetching.
// Safe at module scope — the file is static for the server's lifetime, and
// SvelteKit's Cloudflare adapter discards modules between requests anyway.
let bibleVerseIndexPromise: Promise<BibleVerseIndex> | null = null;
let concordanceVerseIndexPromise: Promise<ConcordanceVerseIndex> | null = null;

export function loadParagraph(n: number, fetcher: Fetch = fetch): Promise<Paragraph> {
	return fetchJson<Paragraph>(`/data/ccc/paragraphs/${n}.json`, fetcher);
}

export function loadChapter(slug: string, fetcher: Fetch = fetch): Promise<Chapter> {
	return fetchJson<Chapter>(`/data/ccc/chapters/${slug}.json`, fetcher);
}

export function loadStructure(fetcher: Fetch = fetch): Promise<unknown> {
	return fetchJson<unknown>('/data/ccc/structure.json', fetcher);
}

export function loadAbbreviations(fetcher: Fetch = fetch): Promise<AbbreviationMap> {
	return fetchJson<AbbreviationMap>('/data/ccc/abbreviations.json', fetcher);
}

export function loadParagraphContexts(
	fetcher: Fetch = fetch
): Promise<Record<number, ParagraphContext>> {
	return fetchJson<Record<number, ParagraphContext>>('/data/ccc/paragraph-context.json', fetcher);
}

export function loadCitedBy(fetcher: Fetch = fetch): Promise<Record<number, number[]>> {
	return fetchJson<Record<number, number[]>>('/data/ccc/cited-by.json', fetcher);
}

export function loadSourcesIndex(fetcher: Fetch = fetch): Promise<SourceEntry[]> {
	return fetchJson<SourceEntry[]>('/data/ccc/sources-index.json', fetcher);
}

export function loadBibleVerseIndex(fetcher: Fetch = fetch): Promise<BibleVerseIndex> {
	if (!bibleVerseIndexPromise) {
		bibleVerseIndexPromise = fetchJson<BibleVerseIndex>(
			'/data/ccc/bible-verse-index.json',
			fetcher
		);
	}
	return bibleVerseIndexPromise;
}

export function loadConcordanceVerseIndex(fetcher: Fetch = fetch): Promise<ConcordanceVerseIndex> {
	if (!concordanceVerseIndexPromise) {
		concordanceVerseIndexPromise = (async () => {
			const r = await fetcher('/data/ccc/concordance-verse-index.json');
			if (!r.ok) return {} as ConcordanceVerseIndex;
			return (await r.json()) as ConcordanceVerseIndex;
		})();
	}
	return concordanceVerseIndexPromise;
}

export function loadGlossary(fetcher: Fetch = fetch): Promise<GlossaryBundle> {
	return fetchJson<GlossaryBundle>('/data/ccc/glossary.json', fetcher);
}
