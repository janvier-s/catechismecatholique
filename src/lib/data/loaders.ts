import type {
	Paragraph,
	Chapter,
	AbbreviationMap,
	ParagraphContext,
	SourceEntry,
	BibleVerseIndex,
	GlossaryBundle,
	ConcordanceChapter,
	ConcordanceByParagraph,
	ConcordanceByParagraphEntry,
	NclSectionMap,
	NclBible
} from './types';

type Fetch = typeof fetch;

async function fetchJson<T>(url: string, fetcher: Fetch): Promise<T> {
	const res = await fetcher(url);
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	return res.json() as Promise<T>;
}

// Module-level promise cache for the verse index: the page load fills the
// cache, and TabBibleVerse hits the same promise instead of re-fetching.
// Safe at module scope — the file is static for the server's lifetime, and
// SvelteKit's Cloudflare adapter discards modules between requests anyway.
let bibleVerseIndexPromise: Promise<BibleVerseIndex> | null = null;

let concordanceManifestPromise: Promise<Record<string, number[]>> | null = null;
let concordanceByParagraphPromise: Promise<ConcordanceByParagraph> | null = null;
const concordanceChapterCache = new Map<string, Promise<ConcordanceChapter | null>>();
let concordanceParagraphManifestPromise: Promise<Set<number>> | null = null;
const concordanceByParagraphShardCache = new Map<
	number,
	Promise<ConcordanceByParagraphEntry[] | null>
>();

let nclSectionsPromise: Promise<NclSectionMap> | null = null;
let chapterCountsPromise: Promise<Record<string, number>> | null = null;
let nclBiblePromise: Promise<NclBible> | null = null;
let paragraphContextsPromise: Promise<Record<number, ParagraphContext>> | null = null;

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
	if (!paragraphContextsPromise) {
		paragraphContextsPromise = fetchJson<Record<number, ParagraphContext>>(
			'/data/ccc/paragraph-context.json',
			fetcher
		);
	}
	return paragraphContextsPromise;
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

export function loadGlossary(fetcher: Fetch = fetch): Promise<GlossaryBundle> {
	return fetchJson<GlossaryBundle>('/data/ccc/glossary.json', fetcher);
}

export function loadConcordanceManifest(fetcher: Fetch = fetch): Promise<Record<string, number[]>> {
	if (!concordanceManifestPromise) {
		concordanceManifestPromise = (async () => {
			const r = await fetcher('/data/concordance/manifest.json');
			if (!r.ok) return {};
			return (await r.json()) as Record<string, number[]>;
		})();
	}
	return concordanceManifestPromise;
}

/**
 * @deprecated Loads the entire by-paragraph bundle. Prefer
 * {@link loadConcordanceForParagraph} which fetches only the shard needed.
 * Kept for any remaining consumers; the bundle is still emitted by the
 * data pipeline today and will be removed in a future cleanup.
 */
export function loadConcordanceByParagraph(
	fetcher: Fetch = fetch
): Promise<ConcordanceByParagraph> {
	if (!concordanceByParagraphPromise) {
		concordanceByParagraphPromise = (async () => {
			const r = await fetcher('/data/concordance/by-paragraph.json');
			if (!r.ok) return {} as ConcordanceByParagraph;
			return (await r.json()) as ConcordanceByParagraph;
		})();
	}
	return concordanceByParagraphPromise;
}

/**
 * Load the manifest of paragraph numbers that have at least one concordance
 * entry. Used by callers to avoid speculative 404s on shard fetches.
 */
export function loadConcordanceParagraphManifest(
	fetcher: Fetch = fetch
): Promise<Set<number>> {
	if (!concordanceParagraphManifestPromise) {
		concordanceParagraphManifestPromise = (async () => {
			const r = await fetcher('/data/concordance/by-paragraph-manifest.json');
			if (!r.ok) return new Set<number>();
			const arr = (await r.json()) as number[];
			return new Set(arr);
		})();
	}
	return concordanceParagraphManifestPromise;
}

/**
 * Lazily fetch the by-paragraph entries for a single CCC paragraph.
 * Returns `null` when the paragraph has no concordance data (per the manifest)
 * or the shard 404s. Cached at module scope so repeat opens of the same
 * paragraph are free.
 */
export function loadConcordanceForParagraph(
	n: number,
	fetcher: Fetch = fetch
): Promise<ConcordanceByParagraphEntry[] | null> {
	let p = concordanceByParagraphShardCache.get(n);
	if (!p) {
		p = (async () => {
			const manifest = await loadConcordanceParagraphManifest(fetcher);
			if (!manifest.has(n)) return null;
			const r = await fetcher(`/data/concordance/by-paragraph/${n}.json`);
			if (!r.ok) return null;
			return (await r.json()) as ConcordanceByParagraphEntry[];
		})();
		concordanceByParagraphShardCache.set(n, p);
	}
	return p;
}

export function loadConcordanceChapter(
	slug: string,
	chapter: number,
	fetcher: Fetch = fetch
): Promise<ConcordanceChapter | null> {
	const key = `${slug}/${chapter}`;
	let p = concordanceChapterCache.get(key);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/concordance/${slug}/${chapter}.json`);
			if (!r.ok) return null;
			return (await r.json()) as ConcordanceChapter;
		})();
		concordanceChapterCache.set(key, p);
	}
	return p;
}

export function loadNclSections(fetcher: Fetch = fetch): Promise<NclSectionMap> {
	if (!nclSectionsPromise) {
		nclSectionsPromise = (async () => {
			const r = await fetcher('/data/bible/ncl-sections.json');
			if (!r.ok) return {};
			return (await r.json()) as NclSectionMap;
		})();
	}
	return nclSectionsPromise;
}

export function loadChapterCounts(fetcher: Fetch = fetch): Promise<Record<string, number>> {
	if (!chapterCountsPromise) {
		chapterCountsPromise = (async () => {
			const r = await fetcher('/data/bible/chapter-counts.json');
			if (!r.ok) return {};
			return (await r.json()) as Record<string, number>;
		})();
	}
	return chapterCountsPromise;
}

export function loadNclBible(fetcher: Fetch = fetch): Promise<NclBible> {
	if (!nclBiblePromise) {
		nclBiblePromise = fetchJson<NclBible>('/data/bible/ncl.json', fetcher);
	}
	return nclBiblePromise;
}
