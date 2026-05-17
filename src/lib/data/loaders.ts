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
	NclBook,
	CompendiumStructure,
	CompendiumPart,
	CompendiumCitedBy,
	CompendiumQRange,
	TrentStructure,
	TrentChapterFile,
	TrentSectionFile,
	TrentParagraphContext,
	PiusXGrandStructure,
	PiusXGrandChapterFile,
	PiusXPetitStructure,
	PiusXPetitChapterFile,
	CalendrierIndexFile,
	CalendrierYearFile,
	CalendrierYearKey,
	CatIllustreStructure,
	CatIllustreChapter,
	CatIllustreFlatPage,
	DenzingerStructure,
	DenzingerUnit,
	DenzingerEntryIndex,
	BoulangerStructure,
	BoulangerLesson,
	BoulangerSommaire,
	CdseStructure,
	CdseChapter,
	CdseParagraphLocator,
	PgmrStructure,
	PgmrChapter,
	PgmrParagraphLocator,
	VatIIStructure,
	VatIIDoc,
	CicStructure,
	CicLivre,
	CicCanonLocator,
	CicCode,
	BrevStructure,
	BrevChapter,
	PatStructure,
	PatChapter,
	PatFull,
	CpaStructure,
	CpaSectionFull,
	ParagraphThemeRef,
	DieuStructure,
	DieuChapter,
	LiturgieChapter,
	BonPasteurPlaylist
} from './types';

type Fetch = typeof fetch;

async function fetchJson<T>(url: string, fetcher: Fetch): Promise<T> {
	const res = await fetcher(url);
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	return res.json() as Promise<T>;
}

// Module-level promise cache for the verse index: the page load fills the
// cache, and TabBibleVerse hits the same promise instead of re-fetching.
// Safe at module scope · the file is static for the server's lifetime, and
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
	return fetchJson<Paragraph>(`/data/cec/paragraphs/${n}.json`, fetcher);
}

// Module-level cache: chapter JSON is static once built. The Sidebar reloads
// the chapter on every navigation; without caching every click triggers a
// network round-trip and the tree briefly flashes structure-only data.
const chapterPromises = new Map<string, Promise<Chapter>>();
export function loadChapter(slug: string, fetcher: Fetch = fetch): Promise<Chapter> {
	let p = chapterPromises.get(slug);
	if (!p) {
		p = fetchJson<Chapter>(`/data/cec/chapters/${slug}.json`, fetcher);
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
		p = fetchJson<ChapterFullBundle>(`/data/cec/chapters-full/${slug}.json`, fetcher);
		chapterFullPromises.set(slug, p);
	}
	return p;
}

export function loadStructure(fetcher: Fetch = fetch): Promise<unknown> {
	return fetchJson<unknown>('/data/cec/structure.json', fetcher);
}

// Slim TOC: full tree minus the `paragraphs: number[]` arrays at every level.
// Used by /cec/sommaire which renders titles + headings only. About 70%
// smaller than the full structure.
export function loadStructureToc(fetcher: Fetch = fetch): Promise<unknown> {
	return fetchJson<unknown>('/data/cec/structure-toc.json', fetcher);
}

export function loadAbbreviations(fetcher: Fetch = fetch): Promise<AbbreviationMap> {
	return fetchJson<AbbreviationMap>('/data/cec/abbreviations.json', fetcher);
}

// Per-paragraph context shard · used by paragraph and search routes so the
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
			const r = await fetcher(`/data/cec/paragraph-context/${n}.json`);
			if (!r.ok) return null;
			return (await r.json()) as ParagraphContext;
		})();
		paragraphContextCache.set(n, p);
	}
	return p;
}

export function loadCitedBy(fetcher: Fetch = fetch): Promise<Record<number, number[]>> {
	return fetchJson<Record<number, number[]>>('/data/cec/cited-by.json', fetcher);
}

export function loadSourcesIndex(fetcher: Fetch = fetch): Promise<SourceEntry[]> {
	return fetchJson<SourceEntry[]>('/data/cec/sources-index.json', fetcher);
}

export function loadBibleVerseIndex(fetcher: Fetch = fetch): Promise<BibleVerseIndex> {
	if (!bibleVerseIndexPromise) {
		bibleVerseIndexPromise = fetchJson<BibleVerseIndex>(
			'/data/cec/bible-verse-index.json',
			fetcher
		);
	}
	return bibleVerseIndexPromise;
}

export function loadGlossary(fetcher: Fetch = fetch): Promise<GlossaryBundle> {
	return fetchJson<GlossaryBundle>('/data/cec/glossary.json', fetcher);
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
	return fetchJson<GlossaryIndex>('/data/cec/glossary-index.json', fetcher);
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
			// Manifest is the fast path · when it's reachable, gates speculative
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

// ─── CEC AI Explanations ──────────────────────────────────────────────────

let cecAiManifestPromise: Promise<Set<number>> | null = null;
const cecAiCache = new Map<number, Promise<string | null>>();

function loadCecAiManifest(fetcher: Fetch = fetch): Promise<Set<number>> {
	if (!cecAiManifestPromise) {
		cecAiManifestPromise = (async () => {
			const r = await fetcher('/data/cec/ai/manifest.json');
			if (!r.ok) return new Set<number>();
			const arr = (await r.json()) as number[];
			return new Set(arr);
		})();
	}
	return cecAiManifestPromise;
}

export function loadCecAiExplanation(n: number, fetcher: Fetch = fetch): Promise<string | null> {
	let p = cecAiCache.get(n);
	if (!p) {
		p = (async () => {
			const manifest = await loadCecAiManifest(fetcher);
			if (!manifest.has(n)) return null;
			const r = await fetcher(`/data/cec/ai/${n}.json`);
			if (!r.ok) return null;
			const data = (await r.json()) as { md: string };
			return data.md;
		})();
		cecAiCache.set(n, p);
	}
	return p;
}

// ─── Compendium Loaders ────────────────────────────────────────────────────

let compendiumStructurePromise: Promise<CompendiumStructure> | null = null;
const compendiumPartCache = new Map<string, Promise<CompendiumPart>>();
let compendiumCitedByPromise: Promise<CompendiumCitedBy> | null = null;
let compendiumQRangesPromise: Promise<CompendiumQRange[]> | null = null;

export function loadCompendiumStructure(fetcher: Fetch = fetch): Promise<CompendiumStructure> {
	if (!compendiumStructurePromise) {
		compendiumStructurePromise = fetchJson<CompendiumStructure>(
			'/data/compendium/structure.json',
			fetcher
		);
	}
	return compendiumStructurePromise;
}

export function loadCompendiumPart(slug: string, fetcher: Fetch = fetch): Promise<CompendiumPart> {
	let p = compendiumPartCache.get(slug);
	if (!p) {
		p = fetchJson<CompendiumPart>(`/data/compendium/parts/${slug}.json`, fetcher);
		compendiumPartCache.set(slug, p);
	}
	return p;
}

export function loadCompendiumCitedBy(fetcher: Fetch = fetch): Promise<CompendiumCitedBy> {
	if (!compendiumCitedByPromise) {
		compendiumCitedByPromise = fetchJson<CompendiumCitedBy>(
			'/data/compendium/cited-by.json',
			fetcher
		);
	}
	return compendiumCitedByPromise;
}

export function loadCompendiumQRanges(fetcher: Fetch = fetch): Promise<CompendiumQRange[]> {
	if (!compendiumQRangesPromise) {
		compendiumQRangesPromise = fetchJson<CompendiumQRange[]>(
			'/data/compendium/q-ranges.json',
			fetcher
		);
	}
	return compendiumQRangesPromise;
}

// ─── Trent Loaders ────────────────────────────────────────────────────────────

let trentStructurePromise: Promise<TrentStructure> | null = null;
const trentChapterCache = new Map<string, Promise<TrentChapterFile>>();
const trentSectionCache = new Map<string, Promise<TrentSectionFile | null>>();
const trentParagraphContextCache = new Map<number, Promise<TrentParagraphContext | null>>();

export function loadTrentStructure(fetcher: Fetch = fetch): Promise<TrentStructure> {
	if (!trentStructurePromise) {
		trentStructurePromise = fetchJson<TrentStructure>('/data/trent/structure.json', fetcher);
	}
	return trentStructurePromise;
}

export function loadTrentChapter(slug: string, fetcher: Fetch = fetch): Promise<TrentChapterFile> {
	let p = trentChapterCache.get(slug);
	if (!p) {
		p = fetchJson<TrentChapterFile>(`/data/trent/chapters/${slug}.json`, fetcher);
		trentChapterCache.set(slug, p);
	}
	return p;
}

export function loadTrentSection(
	chapterSlug: string,
	sectionSlug: string,
	fetcher: Fetch = fetch
): Promise<TrentSectionFile | null> {
	const key = `${chapterSlug}/${sectionSlug}`;
	let p = trentSectionCache.get(key);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/trent/sections/${chapterSlug}/${sectionSlug}.json`);
			if (!r.ok) return null;
			return (await r.json()) as TrentSectionFile;
		})();
		trentSectionCache.set(key, p);
	}
	return p;
}

export function loadTrentParagraphContext(
	n: number,
	fetcher: Fetch = fetch
): Promise<TrentParagraphContext | null> {
	let p = trentParagraphContextCache.get(n);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/trent/paragraph-context/${n}.json`);
			if (!r.ok) return null;
			return (await r.json()) as TrentParagraphContext;
		})();
		trentParagraphContextCache.set(n, p);
	}
	return p;
}

// ─── Grand Catéchisme (Pie X) Loaders ────────────────────────────────────

let piusXGrandStructurePromise: Promise<PiusXGrandStructure> | null = null;
const piusXGrandChapterCache = new Map<string, Promise<PiusXGrandChapterFile | null>>();

export function loadPiusXGrandStructure(fetcher: Fetch = fetch): Promise<PiusXGrandStructure> {
	if (!piusXGrandStructurePromise) {
		piusXGrandStructurePromise = fetchJson<PiusXGrandStructure>(
			'/data/pius-x-grand/structure.json',
			fetcher
		);
	}
	return piusXGrandStructurePromise;
}

export function loadPiusXGrandChapter(
	partSlug: string,
	chapterSlug: string,
	fetcher: Fetch = fetch
): Promise<PiusXGrandChapterFile | null> {
	const key = `${partSlug}/${chapterSlug}`;
	let p = piusXGrandChapterCache.get(key);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/pius-x-grand/chapters/${partSlug}/${chapterSlug}.json`);
			if (!r.ok) return null;
			const ch = (await r.json()) as PiusXGrandChapterFile;
			// Rewrite legacy hrefs
			const fix = (href: string) =>
				href
					.replace('/pius-x-grand/', '/grand-catechisme/')
					.replace('/1-symbole-des/', '/1-credo/');
			if (ch.prev) ch.prev = { ...ch.prev, href: fix(ch.prev.href) };
			if (ch.next) ch.next = { ...ch.next, href: fix(ch.next.href) };
			return ch;
		})();
		piusXGrandChapterCache.set(key, p);
	}
	return p;
}

// ─── Petit Catéchisme (Pie X 1912) Loaders ───────────────────────────────────

let piusXPetitStructurePromise: Promise<PiusXPetitStructure> | null = null;
const piusXPetitChapterCache = new Map<string, Promise<PiusXPetitChapterFile | null>>();

export function loadPiusXPetitStructure(fetcher: Fetch = fetch): Promise<PiusXPetitStructure> {
	if (!piusXPetitStructurePromise) {
		piusXPetitStructurePromise = fetchJson<PiusXPetitStructure>(
			'/data/pius-x-petit/structure.json',
			fetcher
		);
	}
	return piusXPetitStructurePromise;
}

export function loadPiusXPetitChapter(
	partSlug: string,
	chapterSlug: string,
	fetcher: Fetch = fetch
): Promise<PiusXPetitChapterFile | null> {
	const key = `${partSlug}/${chapterSlug}`;
	let p = piusXPetitChapterCache.get(key);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/pius-x-petit/${partSlug}/${chapterSlug}.json`);
			if (!r.ok) return null;
			const ch = (await r.json()) as PiusXPetitChapterFile;
			const fix = (href: string) => href.replace('/pius-x-petit/', '/petit-catechisme/');
			if (ch.prev) ch.prev = { ...ch.prev, href: fix(ch.prev.href) };
			if (ch.next) ch.next = { ...ch.next, href: fix(ch.next.href) };
			return ch;
		})();
		piusXPetitChapterCache.set(key, p);
	}
	return p;
}

// ─── Pie X Petit appendix loaders ──────────────────────────────────────────

export type PiusXPetitAppendix = {
	corpus: 'pius-x-petit';
	slug: string;
	title: string;
	kicker?: string;
	sections: Array<{
		roman: string;
		title: string;
		paragraphs: Array<{ n: number; html: string }>;
	}>;
	footnotes: Array<{ n: number; text: string }>;
};

export type PiusXPetitLiturgicalBlock =
	| { kind: 'h'; text: string }
	| { kind: 'intro'; html: string }
	| { kind: 'para'; n?: number; html: string }
	| { kind: 'ol_roman'; items: Array<{ roman: string; html: string }> }
	| { kind: 'ol'; items: Array<{ n: number; label?: string; html: string; sub?: string[] }> }
	| { kind: 'ul'; items: Array<{ html: string; note?: string; sub?: string[] }> }
	| { kind: 'concession'; n: number; html: string; note?: string }
	| { kind: 'oraison'; html: string; cite?: string }
	| { kind: 'quote'; html: string; cite?: string }
	| { kind: 'prayer'; title: string; html: string };

export type PiusXPetitLiturgicalAppendix = {
	corpus: 'pius-x-petit';
	slug: string;
	title: string;
	kicker?: string;
	chapters: Array<{
		roman: string;
		title: string;
		subtitle?: string;
		sections: Array<{
			n: number;
			title: string;
			blocks: PiusXPetitLiturgicalBlock[];
		}>;
	}>;
};

const piusXPetitAppendixCache = new Map<string, Promise<unknown | null>>();

function loadPiusXPetitAppendixGeneric<T>(slug: string, fetcher: Fetch): Promise<T | null> {
	let p = piusXPetitAppendixCache.get(slug) as Promise<T | null> | undefined;
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/pius-x-petit/appendices/${slug}.json`);
			if (!r.ok) return null;
			return (await r.json()) as T;
		})();
		piusXPetitAppendixCache.set(slug, p);
	}
	return p;
}

export function loadPiusXPetitAppendix(
	slug: string,
	fetcher: Fetch = fetch
): Promise<PiusXPetitAppendix | null> {
	return loadPiusXPetitAppendixGeneric<PiusXPetitAppendix>(slug, fetcher);
}

export type PiusXPetitFlatAppendix = {
	corpus: 'pius-x-petit';
	slug: string;
	title: string;
	kicker?: string;
	paragraphs: Array<{ n: number; html: string }>;
	oraison?: { html: string; cite?: string };
};

export function loadPiusXPetitFlatAppendix(
	slug: string,
	fetcher: Fetch = fetch
): Promise<PiusXPetitFlatAppendix | null> {
	return loadPiusXPetitAppendixGeneric<PiusXPetitFlatAppendix>(slug, fetcher);
}

export function loadPiusXPetitLiturgicalAppendix(
	slug: string,
	fetcher: Fetch = fetch
): Promise<PiusXPetitLiturgicalAppendix | null> {
	return loadPiusXPetitAppendixGeneric<PiusXPetitLiturgicalAppendix>(slug, fetcher);
}

// ─── Liturgical calendar (calendrier) loaders ──────────────────────────────

let calendrierIndexPromise: Promise<CalendrierIndexFile> | null = null;
const calendrierYearCache = new Map<CalendrierYearKey, Promise<CalendrierYearFile>>();

export function loadCalendrierIndex(fetcher: Fetch = fetch): Promise<CalendrierIndexFile> {
	if (!calendrierIndexPromise) {
		calendrierIndexPromise = fetchJson<CalendrierIndexFile>('/data/calendrier/index.json', fetcher);
	}
	return calendrierIndexPromise;
}

export function loadCalendrierYear(
	key: CalendrierYearKey,
	fetcher: Fetch = fetch
): Promise<CalendrierYearFile> {
	let p = calendrierYearCache.get(key);
	if (!p) {
		p = fetchJson<CalendrierYearFile>(`/data/calendrier/annee-${key}.json`, fetcher);
		calendrierYearCache.set(key, p);
	}
	return p;
}

// ─── Catéchisme illustré loaders ───────────────────────────────────────────

let catIllustreStructurePromise: Promise<CatIllustreStructure> | null = null;

export function loadCatIllustreStructure(fetcher: Fetch = fetch): Promise<CatIllustreStructure> {
	if (!catIllustreStructurePromise) {
		catIllustreStructurePromise = fetchJson<CatIllustreStructure>(
			'/data/catechisme-illustre/structure.json',
			fetcher
		);
	}
	return catIllustreStructurePromise;
}

const catIllustreChapterCache = new Map<
	string,
	Promise<CatIllustreChapter | CatIllustreFlatPage | null>
>();

export function loadCatIllustreChapter(
	slug: string,
	fetcher: Fetch = fetch
): Promise<CatIllustreChapter | CatIllustreFlatPage | null> {
	let p = catIllustreChapterCache.get(slug);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/catechisme-illustre/chapters/${slug}.json`);
			if (!r.ok) return null;
			return (await r.json()) as CatIllustreChapter | CatIllustreFlatPage;
		})();
		catIllustreChapterCache.set(slug, p);
	}
	return p;
}

// ─── Denzinger loaders ─────────────────────────────────────────────────────

let denzingerStructurePromise: Promise<DenzingerStructure> | null = null;
let denzingerIndexPromise: Promise<DenzingerEntryIndex> | null = null;
const denzingerUnitCache = new Map<string, Promise<DenzingerUnit | null>>();

export function loadDenzingerStructure(fetcher: Fetch = fetch): Promise<DenzingerStructure> {
	if (!denzingerStructurePromise) {
		denzingerStructurePromise = fetchJson<DenzingerStructure>(
			'/data/enchiridion/structure.json',
			fetcher
		);
	}
	return denzingerStructurePromise;
}

export function loadDenzingerIndex(fetcher: Fetch = fetch): Promise<DenzingerEntryIndex> {
	if (!denzingerIndexPromise) {
		denzingerIndexPromise = fetchJson<DenzingerEntryIndex>('/data/enchiridion/index.json', fetcher);
	}
	return denzingerIndexPromise;
}

let denzingerCitedByPromise: Promise<Record<string, number[]>> | null = null;
let denzingerRefsPromise: Promise<Record<string, number[]>> | null = null;

export function loadDenzingerCitedBy(fetcher: Fetch = fetch): Promise<Record<string, number[]>> {
	if (!denzingerCitedByPromise) {
		denzingerCitedByPromise = (async () => {
			const r = await fetcher('/data/enchiridion/cited-by.json');
			if (!r.ok) return {};
			return (await r.json()) as Record<string, number[]>;
		})();
	}
	return denzingerCitedByPromise;
}

export function loadDenzingerRefs(fetcher: Fetch = fetch): Promise<Record<string, number[]>> {
	if (!denzingerRefsPromise) {
		denzingerRefsPromise = (async () => {
			const r = await fetcher('/data/enchiridion/refs.json');
			if (!r.ok) return {};
			return (await r.json()) as Record<string, number[]>;
		})();
	}
	return denzingerRefsPromise;
}

export function loadDenzingerUnit(
	slug: string,
	fetcher: Fetch = fetch
): Promise<DenzingerUnit | null> {
	let p = denzingerUnitCache.get(slug);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/enchiridion/units/${slug}.json`);
			if (!r.ok) return null;
			return (await r.json()) as DenzingerUnit;
		})();
		denzingerUnitCache.set(slug, p);
	}
	return p;
}

// ─── Boulanger loaders ──────────────────────────────────────────────────────

let boulangerStructurePromise: Promise<BoulangerStructure> | null = null;
let boulangerSommairePromise: Promise<BoulangerSommaire> | null = null;
const boulangerLessonCache = new Map<string, Promise<BoulangerLesson | null>>();

export function loadBoulangerStructure(fetcher: Fetch = fetch): Promise<BoulangerStructure> {
	if (!boulangerStructurePromise) {
		boulangerStructurePromise = fetchJson<BoulangerStructure>(
			'/data/boulanger/structure.json',
			fetcher
		);
	}
	return boulangerStructurePromise;
}

export function loadBoulangerSommaire(fetcher: Fetch = fetch): Promise<BoulangerSommaire> {
	if (!boulangerSommairePromise) {
		boulangerSommairePromise = fetchJson<BoulangerSommaire>(
			'/data/boulanger/sommaire.json',
			fetcher
		);
	}
	return boulangerSommairePromise;
}

export function loadBoulangerLesson(
	slug: string,
	fetcher: Fetch = fetch
): Promise<BoulangerLesson | null> {
	let p = boulangerLessonCache.get(slug);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/boulanger/lessons/${slug}.json`);
			if (!r.ok) return null;
			return (await r.json()) as BoulangerLesson;
		})();
		boulangerLessonCache.set(slug, p);
	}
	return p;
}

// ─── CDSE loaders ───────────────────────────────────────────────────────────

let cdseStructurePromise: Promise<CdseStructure> | null = null;
let cdseParagraphsPromise: Promise<Record<string, CdseParagraphLocator>> | null = null;
let cdseCitedByCccPromise: Promise<Record<string, number[]>> | null = null;
const cdseChapterCache = new Map<string, Promise<CdseChapter | null>>();

export function loadCdseStructure(fetcher: Fetch = fetch): Promise<CdseStructure> {
	if (!cdseStructurePromise) {
		cdseStructurePromise = fetchJson<CdseStructure>('/data/cdse/structure.json', fetcher);
	}
	return cdseStructurePromise;
}

export function loadCdseChapter(slug: string, fetcher: Fetch = fetch): Promise<CdseChapter | null> {
	let p = cdseChapterCache.get(slug);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/cdse/chapters/${slug}.json`);
			if (!r.ok) return null;
			return (await r.json()) as CdseChapter;
		})();
		cdseChapterCache.set(slug, p);
	}
	return p;
}

export function loadCdseParagraphs(
	fetcher: Fetch = fetch
): Promise<Record<string, CdseParagraphLocator>> {
	if (!cdseParagraphsPromise) {
		cdseParagraphsPromise = fetchJson<Record<string, CdseParagraphLocator>>(
			'/data/cdse/paragraphs.json',
			fetcher
		);
	}
	return cdseParagraphsPromise;
}

export function loadCdseCitedByCcc(fetcher: Fetch = fetch): Promise<Record<string, number[]>> {
	if (!cdseCitedByCccPromise) {
		cdseCitedByCccPromise = fetchJson<Record<string, number[]>>(
			'/data/cdse/cited-by-ccc.json',
			fetcher
		);
	}
	return cdseCitedByCccPromise;
}

// ─── PGMR loaders ──────────────────────────────────────────────────────────

let pgmrStructurePromise: Promise<PgmrStructure> | null = null;
let pgmrParagraphsPromise: Promise<Record<string, PgmrParagraphLocator>> | null = null;
const pgmrChapterCache = new Map<string, Promise<PgmrChapter | null>>();

export function loadPgmrStructure(fetcher: Fetch = fetch): Promise<PgmrStructure> {
	if (!pgmrStructurePromise) {
		pgmrStructurePromise = fetchJson<PgmrStructure>('/data/pgmr/structure.json', fetcher);
	}
	return pgmrStructurePromise;
}

export function loadPgmrChapter(slug: string, fetcher: Fetch = fetch): Promise<PgmrChapter | null> {
	let p = pgmrChapterCache.get(slug);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/pgmr/chapters/${slug}.json`);
			if (!r.ok) return null;
			return (await r.json()) as PgmrChapter;
		})();
		pgmrChapterCache.set(slug, p);
	}
	return p;
}

export function loadPgmrParagraphs(
	fetcher: Fetch = fetch
): Promise<Record<string, PgmrParagraphLocator>> {
	if (!pgmrParagraphsPromise) {
		pgmrParagraphsPromise = fetchJson<Record<string, PgmrParagraphLocator>>(
			'/data/pgmr/paragraphs.json',
			fetcher
		);
	}
	return pgmrParagraphsPromise;
}

// ─── Vatican II loaders ─────────────────────────────────────────────────────

let vatIIStructurePromise: Promise<VatIIStructure> | null = null;
const vatIIDocCache = new Map<string, Promise<VatIIDoc | null>>();

export function loadVatIIStructure(fetcher: Fetch = fetch): Promise<VatIIStructure> {
	if (!vatIIStructurePromise) {
		vatIIStructurePromise = fetchJson<VatIIStructure>('/data/vatican-ii/structure.json', fetcher);
	}
	return vatIIStructurePromise;
}

export function loadVatIIDoc(slug: string, fetcher: Fetch = fetch): Promise<VatIIDoc | null> {
	let p = vatIIDocCache.get(slug);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/vatican-ii/docs/${slug}.json`);
			if (!r.ok) return null;
			return (await r.json()) as VatIIDoc;
		})();
		vatIIDocCache.set(slug, p);
	}
	return p;
}

// ─── CIC loaders ────────────────────────────────────────────────────────────

let cicStructurePromise: Promise<CicStructure> | null = null;
let cicCanonsPromise: Promise<Record<CicCode, Record<string, CicCanonLocator>>> | null = null;
const cicLivreCache = new Map<string, Promise<CicLivre | null>>();

export function loadCicStructure(fetcher: Fetch = fetch): Promise<CicStructure> {
	if (!cicStructurePromise) {
		cicStructurePromise = fetchJson<CicStructure>('/data/cic/structure.json', fetcher);
	}
	return cicStructurePromise;
}

export function loadCicLivre(slug: string, fetcher: Fetch = fetch): Promise<CicLivre | null> {
	let p = cicLivreCache.get(slug);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/cic/livres/${slug}.json`);
			if (!r.ok) return null;
			return (await r.json()) as CicLivre;
		})();
		cicLivreCache.set(slug, p);
	}
	return p;
}

export function loadCicCanons(
	fetcher: Fetch = fetch
): Promise<Record<CicCode, Record<string, CicCanonLocator>>> {
	if (!cicCanonsPromise) {
		cicCanonsPromise = fetchJson<Record<CicCode, Record<string, CicCanonLocator>>>(
			'/data/cic/canons.json',
			fetcher
		);
	}
	return cicCanonsPromise;
}

// ─── Breviloquium (Saint Bonaventure) ──────────────────────────────────────

let brevStructurePromise: Promise<BrevStructure> | null = null;
const brevChapterCache = new Map<string, Promise<BrevChapter | null>>();

export function loadBreviloquiumStructure(fetcher: Fetch = fetch): Promise<BrevStructure> {
	if (!brevStructurePromise) {
		brevStructurePromise = fetchJson<BrevStructure>('/data/breviloquium/structure.json', fetcher);
	}
	return brevStructurePromise;
}

export function loadBreviloquiumChapter(
	slug: string,
	fetcher: Fetch = fetch
): Promise<BrevChapter | null> {
	let p = brevChapterCache.get(slug);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/breviloquium/chapters/${slug}.json`);
			if (!r.ok) return null;
			return (await r.json()) as BrevChapter;
		})();
		brevChapterCache.set(slug, p);
	}
	return p;
}

// ─── Patristique (Didachè, Discours catéchétique, …) ──────────────────────

const patStructureCache = new Map<string, Promise<PatStructure>>();
const patFullCache = new Map<string, Promise<PatFull>>();

export function loadPatStructure(work: string, fetcher: Fetch = fetch): Promise<PatStructure> {
	let p = patStructureCache.get(work);
	if (!p) {
		p = fetchJson<PatStructure>(`/data/${work}/structure.json`, fetcher);
		patStructureCache.set(work, p);
	}
	return p;
}

export function loadPatFull(work: string, fetcher: Fetch = fetch): Promise<PatFull> {
	let p = patFullCache.get(work);
	if (!p) {
		p = fetchJson<PatFull>(`/data/${work}/full.json`, fetcher);
		patFullCache.set(work, p);
	}
	return p;
}

// Suppress unused-import warning · PatChapter is re-exported via types but
// not consumed here directly after the loader simplification.
export type _PatChapterLoaderTypeHint = PatChapter;

// ─── Catéchisme pour Adultes (CPA) ─────────────────────────────────────────

let cpaStructurePromise: Promise<CpaStructure> | null = null;
const cpaSectionCache = new Map<string, Promise<CpaSectionFull | null>>();

export function loadCpaStructure(fetcher: Fetch = fetch): Promise<CpaStructure> {
	if (!cpaStructurePromise) {
		cpaStructurePromise = fetchJson<CpaStructure>(
			'/data/catechisme-adultes/structure.json',
			fetcher
		);
	}
	return cpaStructurePromise;
}

export function loadCpaSection(
	slug: string,
	fetcher: Fetch = fetch
): Promise<CpaSectionFull | null> {
	let p = cpaSectionCache.get(slug);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/catechisme-adultes/sections/${slug}.json`);
			if (!r.ok) return null;
			return (await r.json()) as CpaSectionFull;
		})();
		cpaSectionCache.set(slug, p);
	}
	return p;
}

// ─── Catho paragraph-themes index ──────────────────────────────────────────

let _paragraphThemesCache: Record<string, ParagraphThemeRef[]> | null = null;

export async function loadParagraphThemes(): Promise<Record<string, ParagraphThemeRef[]>> {
	if (_paragraphThemesCache) return _paragraphThemesCache;
	const res = await fetch('/data/cec/paragraph-themes.json');
	_paragraphThemesCache = await res.json();
	return _paragraphThemesCache!;
}

// ─── IBP · Dieu loaders ─────────────────────────────────────────────────────

let dieuStructurePromise: Promise<DieuStructure> | null = null;
const dieuChapterCache = new Map<string, Promise<DieuChapter | null>>();

export function loadDieuStructure(fetcher: Fetch = fetch): Promise<DieuStructure> {
	if (!dieuStructurePromise) {
		dieuStructurePromise = fetchJson<DieuStructure>(
			'/data/bon-pasteur/dieu/structure.json',
			fetcher
		);
	}
	return dieuStructurePromise;
}

export function loadDieuChapter(slug: string, fetcher: Fetch = fetch): Promise<DieuChapter | null> {
	let p = dieuChapterCache.get(slug);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/bon-pasteur/dieu/chapters/${slug}.json`);
			if (!r.ok) return null;
			return (await r.json()) as DieuChapter;
		})();
		dieuChapterCache.set(slug, p);
	}
	return p;
}

// ─── IBP · Liturgie loaders ─────────────────────────────────────────────────

let liturgieStructurePromise: Promise<DieuStructure> | null = null;
const liturgieChapterCache = new Map<string, Promise<LiturgieChapter | null>>();

export function loadLiturgieStructure(fetcher: Fetch = fetch): Promise<DieuStructure> {
	if (!liturgieStructurePromise) {
		liturgieStructurePromise = fetchJson<DieuStructure>(
			'/data/bon-pasteur/liturgie/structure.json',
			fetcher
		);
	}
	return liturgieStructurePromise;
}

export function loadLiturgieChapter(
	slug: string,
	fetcher: Fetch = fetch
): Promise<LiturgieChapter | null> {
	let p = liturgieChapterCache.get(slug);
	if (!p) {
		p = (async () => {
			const r = await fetcher(`/data/bon-pasteur/liturgie/chapters/${slug}.json`);
			if (!r.ok) return null;
			return (await r.json()) as LiturgieChapter;
		})();
		liturgieChapterCache.set(slug, p);
	}
	return p;
}

let bonPasteurPlaylistPromise: Promise<BonPasteurPlaylist> | null = null;

export function loadBonPasteurPlaylist(fetcher: Fetch = fetch): Promise<BonPasteurPlaylist> {
	if (!bonPasteurPlaylistPromise) {
		bonPasteurPlaylistPromise = fetchJson<BonPasteurPlaylist>(
			'/data/bon-pasteur/playlist.json',
			fetcher
		);
	}
	return bonPasteurPlaylistPromise;
}
