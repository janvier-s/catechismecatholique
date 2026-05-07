import type {
	Paragraph,
	Chapter,
	AbbreviationMap,
	ParagraphContext,
	SourceEntry,
	BibleVerseIndex,
	GlossaryBundle,
	ConcordanceChapter,
	ConcordanceByParagraphEntry,
	NclSectionMap,
	NclBook
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
const concordanceChapterCache = new Map<string, Promise<ConcordanceChapter | null>>();
let concordanceParagraphManifestPromise: Promise<Set<number>> | null = null;
const concordanceByParagraphShardCache = new Map<
	number,
	Promise<ConcordanceByParagraphEntry[] | null>
>();

let nclSectionsPromise: Promise<NclSectionMap> | null = null;
let chapterCountsPromise: Promise<Record<string, number>> | null = null;
let nclManifestPromise: Promise<Set<string>> | null = null;
const nclBookCache = new Map<string, Promise<NclBook | null>>();

export function loadParagraph(n: number, fetcher: Fetch = fetch): Promise<Paragraph> {
	return fetchJson<Paragraph>(`/data/ccc/paragraphs/${n}.json`, fetcher);
}

// Module-level cache: chapter JSON is static once built. The Sidebar reloads
// the chapter on every navigation; without caching every click triggers a
// network round-trip and the tree briefly flashes structure-only data.
const chapterPromises = new Map<string, Promise<Chapter>>();
export function loadChapter(slug: string, fetcher: Fetch = fetch): Promise<Chapter> {
	let p = chapterPromises.get(slug);
	if (!p) {
		p = fetchJson<Chapter>(`/data/ccc/chapters/${slug}.json`, fetcher);
		chapterPromises.set(slug, p);
	}
	return p;
}

export interface ChapterFullBundle {
	chapter: Chapter;
	paragraphs: Paragraph[];
	enBrefParagraphMap: Record<number, Paragraph>;
}
const chapterFullPromises = new Map<string, Promise<ChapterFullBundle>>();
export function loadChapterFull(slug: string, fetcher: Fetch = fetch): Promise<ChapterFullBundle> {
	let p = chapterFullPromises.get(slug);
	if (!p) {
		p = fetchJson<ChapterFullBundle>(`/data/ccc/chapters-full/${slug}.json`, fetcher);
		chapterFullPromises.set(slug, p);
	}
	return p;
}

export function loadStructure(fetcher: Fetch = fetch): Promise<unknown> {
	return fetchJson<unknown>('/data/ccc/structure.json', fetcher);
}

// Slim TOC: full tree minus the `paragraphs: number[]` arrays at every level.
// Used by /ccc/sommaire which renders titles + headings only. About 70%
// smaller than the full structure.
export function loadStructureToc(fetcher: Fetch = fetch): Promise<unknown> {
	return fetchJson<unknown>('/data/ccc/structure-toc.json', fetcher);
}

export function loadAbbreviations(fetcher: Fetch = fetch): Promise<AbbreviationMap> {
	return fetchJson<AbbreviationMap>('/data/ccc/abbreviations.json', fetcher);
}

// Per-paragraph context shard — used by paragraph and search routes so the
// SSR payload doesn't inline the entire 1.8 MB bundle. Returns null on 404
// (out-of-range numbers) instead of throwing so callers can degrade gracefully.
const paragraphContextCache = new Map<number, Promise<ParagraphContext | null>>();
export function loadParagraphContext(
	n: number,
	fetcher: Fetch = fetch
): Promise<ParagraphContext | null> {
	let p = paragraphContextCache.get(n);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/ccc/paragraph-context/${n}.json`);
			if (!r.ok) return null;
			return (await r.json()) as ParagraphContext;
		})();
		paragraphContextCache.set(n, p);
	}
	return p;
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

// Slim index for /glossaire: clusters + featured (slug/term/totalRefs) +
// total count. Detail page (/glossaire/[term]) still loads the full
// glossary.json. ~3.5 KB vs ~700 KB for the full bundle.
export interface GlossaryIndex {
	totalEntries: number;
	clusters: GlossaryBundle['clusters'];
	featured: { slug: string; term: string; totalRefs: number }[];
}
export function loadGlossaryIndex(fetcher: Fetch = fetch): Promise<GlossaryIndex> {
	return fetchJson<GlossaryIndex>('/data/ccc/glossary-index.json', fetcher);
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
 * Load the manifest of paragraph numbers that have at least one concordance
 * entry. Used by callers to avoid speculative 404s on shard fetches.
 */
export function loadConcordanceParagraphManifest(fetcher: Fetch = fetch): Promise<Set<number>> {
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

/**
 * Load the manifest of USFX codes that have an NCL shard available.
 * Used by callers to avoid speculative 404s on book fetches.
 */
export function loadNclManifest(fetcher: Fetch = fetch): Promise<Set<string>> {
	if (!nclManifestPromise) {
		nclManifestPromise = (async () => {
			const r = await fetcher('/data/bible/ncl/manifest.json');
			if (!r.ok) return new Set<string>();
			const arr = (await r.json()) as string[];
			return new Set(arr);
		})();
	}
	return nclManifestPromise;
}

/**
 * Lazily fetch the NCL verse text for a single Bible book by USFX code.
 * Returns `null` when the book is not in the manifest or the shard 404s.
 * Cached at module scope so repeat opens of the same book are free.
 */
export function loadNclBook(usfx: string, fetcher: Fetch = fetch): Promise<NclBook | null> {
	let p = nclBookCache.get(usfx);
	if (!p) {
		p = (async () => {
			// Manifest is the fast path — when it's reachable, gates speculative
			// 404s on missing books. When the deploy or dev server hasn't served
			// it yet, fall through and try the shard directly: a missing manifest
			// shouldn't make every Bible chapter 404.
			const manifest = await loadNclManifest(fetcher);
			if (manifest.size > 0 && !manifest.has(usfx)) return null;
			const r = await fetcher(`/data/bible/ncl/${usfx}.json`);
			if (!r.ok) return null;
			return (await r.json()) as NclBook;
		})();
		nclBookCache.set(usfx, p);
	}
	return p;
}
