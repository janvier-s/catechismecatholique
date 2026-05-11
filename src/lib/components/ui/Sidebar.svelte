<script lang="ts">
	import { page } from '$app/state';
	import { sidebarOpen } from '$lib/stores/sidebar';
	import { activeHeading } from '$lib/stores/scrollSpy';
	import {
		loadStructure,
		loadChapter,
		loadParagraphContext,
		loadCompendiumStructure,
		loadCompendiumPart,
		loadTrentStructure,
		loadPiusXGrandStructure,
		loadPiusXPetitStructure,
		loadPiusXPetitLiturgicalAppendix,
		loadPiusXPetitAppendix,
		loadCatIllustreStructure,
		loadDenzingerStructure,
		loadBoulangerStructure,
		loadBoulangerLesson,
		loadCdseStructure,
		loadCdseChapter,
		loadPgmrStructure,
		loadPgmrChapter,
		loadVatIIStructure,
		loadVatIIDoc,
		loadCicStructure,
		loadCicLivre,
		loadBreviloquiumStructure,
		loadCalendrierIndex,
		loadCalendrierYear
	} from '$lib/data/loaders';
	import type { PiusXPetitLiturgicalAppendix, PiusXPetitAppendix } from '$lib/data/loaders';
	import type {
		Chapter,
		ParagraphContext,
		Corpus,
		CompendiumStructure,
		CompendiumPart,
		TrentStructure,
		PiusXGrandStructure,
		PiusXPetitStructure,
		CatIllustreStructure,
		DenzingerStructure,
		BoulangerStructure,
		BoulangerLesson,
		CdseStructure,
		CdseChapter,
		PgmrStructure,
		PgmrChapter,
		VatIIStructure,
		VatIIDoc,
		CicStructure,
		CicLivre,
		BrevStructure,
		CalendrierFeast,
		CalendrierFixedFeast,
		CalendrierSeason
	} from '$lib/data/types';
	import SidebarItem from './SidebarItem.svelte';

	type Heading = { id: string; title: string; paragraph_start: number; level?: number };
	type Paragraphe = { number: number; title: string; paragraph_start: number };
	type Article = {
		slug: string;
		title: string;
		number?: number;
		paragraphs: number[];
		headings: Heading[];
		paragraphes?: Paragraphe[];
	};
	type Chap = {
		slug: string;
		title: string;
		number?: number;
		paragraphs: number[];
		articles: Article[];
		headings: Heading[];
	};
	type Section = {
		slug: string;
		title: string;
		number?: number;
		chapters: Chap[];
		articles_direct?: Article[];
	};
	type Part = {
		slug: string;
		title: string;
		number?: number;
		prologue?: boolean;
		sections: Section[];
	};

	type Item = {
		title: string;
		href: string;
		number?: number;
		typeLabel?: string;
		/** Heading level for compendium entries (2, 3, 4). Drives sidebar styling. */
		level?: 2 | 3 | 4;
		/** First eyebrow (e.g. "Chapitre 3"). */
		kicker?: string;
		/** Second eyebrow (e.g. "Du second article du Symbole"). */
		kicker2?: string;
		/** Start expanded even when not on the active path. */
		defaultExpanded?: boolean;
		children?: Item[];
	};

	let { corpus = 'ccc' as Corpus }: { corpus?: Corpus } = $props();

	const sommaireHref = $derived.by((): string | null => {
		switch (corpus) {
			case 'ccc':
				return '/cec/sommaire';
			case 'compendium':
				return '/compendium/sommaire';
			case 'trent':
				return '/trente/sommaire';
			case 'pius-x-grand':
				return '/grand-catechisme/sommaire';
			case 'pius-x-petit':
				return '/petit-catechisme/sommaire';
			case 'catechisme-illustre':
				return '/catechisme-illustre/sommaire';
			case 'denzinger':
				return '/denzinger/sommaire';
			case 'boulanger':
				return '/doctrine-catholique/sommaire';
			case 'cdse':
				return '/doctrine-sociale';
			case 'pgmr':
				return '/pgmr';
			case 'vatican-ii':
				return '/vatican-ii';
			case 'cic':
				return '/cic';
			case 'breviloquium':
				return '/breviloquium';
			default:
				return null;
		}
	});

	let structure: { parts: Part[] } | null = $state(null);
	let activeChapter: Chapter | null = $state(null);
	let activeContext: ParagraphContext | null = $state(null);
	let navEl: HTMLElement | undefined = $state();

	$effect(() => {
		if (corpus !== 'ccc') return;
		(async () => {
			structure = (await loadStructure()) as { parts: Part[] };
		})();
	});

	// ─── Trent state ──────────────────────────────────────────────────────────
	let trentStructure: TrentStructure | null = $state(null);

	$effect(() => {
		if (corpus !== 'trent') return;
		(async () => {
			trentStructure = await loadTrentStructure();
		})();
	});

	// ─── Grand Catéchisme (Pie X) state ───────────────────────────────────────
	let piusXGrandStructure: PiusXGrandStructure | null = $state(null);

	$effect(() => {
		if (corpus !== 'pius-x-grand') return;
		(async () => {
			piusXGrandStructure = await loadPiusXGrandStructure();
		})();
	});

	// ─── Petit Catéchisme (Pie X 1912) state ─────────────────────────────────
	let piusXPetitStructure: PiusXPetitStructure | null = $state(null);

	$effect(() => {
		if (corpus !== 'pius-x-petit') return;
		(async () => {
			piusXPetitStructure = await loadPiusXPetitStructure();
		})();
	});

	// ─── Catéchisme illustré (1897) state ───────────────────────────────────
	let catIllustreStructure: CatIllustreStructure | null = $state(null);

	$effect(() => {
		if (corpus !== 'catechisme-illustre') return;
		(async () => {
			catIllustreStructure = await loadCatIllustreStructure();
		})();
	});

	// ─── Denzinger state ─────────────────────────────────────────────────────
	let denzingerStructure: DenzingerStructure | null = $state(null);

	$effect(() => {
		if (corpus !== 'denzinger') return;
		(async () => {
			denzingerStructure = await loadDenzingerStructure();
		})();
	});

	// ─── Boulanger state ─────────────────────────────────────────────────────
	let boulangerStructure: BoulangerStructure | null = $state(null);
	let boulangerActiveLesson: BoulangerLesson | null = $state(null);

	$effect(() => {
		if (corpus !== 'boulanger') return;
		(async () => {
			boulangerStructure = await loadBoulangerStructure();
		})();
	});

	// Active lesson slug from the current URL — the reader expands the
	// active lesson's mini-TOC inline so the user can navigate within the
	// leçon without leaving the sidebar.
	const boulangerActiveSlug = $derived.by((): string | null => {
		const m = page.url.pathname.match(/^\/doctrine-catholique\/([^/]+)/);
		const slug = m ? m[1]! : null;
		return slug && slug !== 'sommaire' ? slug : null;
	});

	$effect(() => {
		if (corpus !== 'boulanger') return;
		const slug = boulangerActiveSlug;
		if (!slug) {
			boulangerActiveLesson = null;
			return;
		}
		(async () => {
			boulangerActiveLesson = await loadBoulangerLesson(slug);
		})();
	});

	// ─── CDSE state ──────────────────────────────────────────────────────────
	let cdseStructure: CdseStructure | null = $state(null);
	let cdseActiveChapter: CdseChapter | null = $state(null);

	$effect(() => {
		if (corpus !== 'cdse') return;
		(async () => {
			cdseStructure = await loadCdseStructure();
		})();
	});

	const cdseActiveSlug = $derived.by((): string | null => {
		const m = page.url.pathname.match(/^\/doctrine-sociale\/([^/]+)/);
		const slug = m ? m[1]! : null;
		return slug && slug !== 'p' ? slug : null;
	});

	$effect(() => {
		if (corpus !== 'cdse') return;
		const slug = cdseActiveSlug;
		if (!slug) {
			cdseActiveChapter = null;
			return;
		}
		(async () => {
			cdseActiveChapter = await loadCdseChapter(slug);
		})();
	});

	// ─── PGMR state ──────────────────────────────────────────────────────────
	let pgmrStructure: PgmrStructure | null = $state(null);
	let pgmrActiveChapter: PgmrChapter | null = $state(null);

	$effect(() => {
		if (corpus !== 'pgmr') return;
		(async () => {
			pgmrStructure = await loadPgmrStructure();
		})();
	});

	const pgmrActiveSlug = $derived.by((): string | null => {
		const m = page.url.pathname.match(/^\/pgmr\/([^/]+)/);
		const slug = m ? m[1]! : null;
		return slug && slug !== 'p' ? slug : null;
	});

	$effect(() => {
		if (corpus !== 'pgmr') return;
		const slug = pgmrActiveSlug;
		if (!slug) {
			pgmrActiveChapter = null;
			return;
		}
		(async () => {
			pgmrActiveChapter = await loadPgmrChapter(slug);
		})();
	});

	// ─── Vatican II state ────────────────────────────────────────────────────
	let vatIIStructure: VatIIStructure | null = $state(null);
	let vatIIActiveDoc: VatIIDoc | null = $state(null);

	$effect(() => {
		if (corpus !== 'vatican-ii') return;
		(async () => {
			vatIIStructure = await loadVatIIStructure();
		})();
	});

	const vatIIActiveSlug = $derived.by((): string | null => {
		const m = page.url.pathname.match(/^\/vatican-ii\/([^/]+)/);
		return m ? m[1]! : null;
	});

	$effect(() => {
		if (corpus !== 'vatican-ii') return;
		const slug = vatIIActiveSlug;
		if (!slug) {
			vatIIActiveDoc = null;
			return;
		}
		(async () => {
			vatIIActiveDoc = await loadVatIIDoc(slug);
		})();
	});

	// ─── CIC state ───────────────────────────────────────────────────────────
	let cicStructure: CicStructure | null = $state(null);
	let cicActiveLivre: CicLivre | null = $state(null);

	$effect(() => {
		if (corpus !== 'cic') return;
		(async () => {
			cicStructure = await loadCicStructure();
		})();
	});

	const cicActiveSlug = $derived.by((): string | null => {
		const m = page.url.pathname.match(/^\/cic\/(?:1983|1917)\/([^/]+)/);
		return m ? m[1]! : null;
	});

	$effect(() => {
		if (corpus !== 'cic') return;
		const slug = cicActiveSlug;
		if (!slug) {
			cicActiveLivre = null;
			return;
		}
		(async () => {
			cicActiveLivre = await loadCicLivre(slug);
		})();
	});

	// ─── Breviloquium state ──────────────────────────────────────────────────
	let brevStructure: BrevStructure | null = $state(null);

	$effect(() => {
		if (corpus !== 'breviloquium') return;
		(async () => {
			brevStructure = await loadBreviloquiumStructure();
		})();
	});

	const brevActiveSlug = $derived.by((): string | null => {
		const m = page.url.pathname.match(/^\/breviloquium\/([^/]+)/);
		return m ? m[1]! : null;
	});

	// Appendix outline (loaded on demand for the appendix pages so the sidebar
	// shows the chapter/section outline of the page being read).
	type PetitAppendixSlug = 'annee-liturgique' | 'histoire-revelation';
	let piusXPetitAppendix: PiusXPetitLiturgicalAppendix | PiusXPetitAppendix | null = $state(null);
	let piusXPetitAppendixSlug: PetitAppendixSlug | null = $state(null);

	const activePetitAppendix = $derived.by((): PetitAppendixSlug | null => {
		const m = page.url.pathname.match(/^\/petit-catechisme\/([^/]+)/);
		const slug = m ? m[1] : null;
		if (slug === 'annee-liturgique' || slug === 'histoire-revelation') return slug;
		return null;
	});

	$effect(() => {
		if (corpus !== 'pius-x-petit') return;
		const slug = activePetitAppendix;
		if (!slug) {
			piusXPetitAppendix = null;
			piusXPetitAppendixSlug = null;
			return;
		}
		if (piusXPetitAppendixSlug === slug && piusXPetitAppendix) return;
		(async () => {
			const data =
				slug === 'annee-liturgique'
					? await loadPiusXPetitLiturgicalAppendix(slug)
					: await loadPiusXPetitAppendix(slug);
			if (activePetitAppendix === slug) {
				piusXPetitAppendix = data;
				piusXPetitAppendixSlug = slug;
			}
		})();
	});

	// ─── Liturgical calendar state ────────────────────────────────────────────
	let calendrierFeasts: (CalendrierFeast | CalendrierFixedFeast)[] = $state([]);
	let calendrierBaseHref: string = $state('/calendrier');

	$effect(() => {
		if (corpus !== 'calendrier') return;
		const m = page.url.pathname.match(/^\/calendrier\/([^/]+)/);
		const annee = m ? m[1] : null;
		if (!annee) {
			calendrierFeasts = [];
			return;
		}
		calendrierBaseHref = `/calendrier/${annee}`;
		(async () => {
			if (annee === 'solennites') {
				const idx = await loadCalendrierIndex();
				calendrierFeasts = idx.fixed_feasts;
			} else if (annee === 'a' || annee === 'b' || annee === 'c') {
				const year = await loadCalendrierYear(annee);
				calendrierFeasts = year.feasts;
			} else {
				calendrierFeasts = [];
			}
		})();
	});

	// ─── Compendium state ─────────────────────────────────────────────────────
	let compendiumStructure: CompendiumStructure | null = $state(null);
	let activeCompendiumPart: CompendiumPart | null = $state(null);

	$effect(() => {
		if (corpus !== 'compendium') return;
		(async () => {
			compendiumStructure = await loadCompendiumStructure();
		})();
	});

	$effect(() => {
		if (corpus !== 'compendium') return;
		const m = page.url.pathname.match(/^\/compendium\/([^/]+)/);
		const slug = m ? m[1] : null;
		if (!slug) {
			activeCompendiumPart = null;
			return;
		}
		if (activeCompendiumPart?.slug === slug) return;
		(async () => {
			try {
				activeCompendiumPart = await loadCompendiumPart(slug);
			} catch {
				activeCompendiumPart = null;
			}
		})();
	});

	// Detect a paragraph URL like /cec/{n} or /cec/{n}-{m} → derive the deepest
	// container the paragraph belongs to (article > chapter > section > part)
	// so the sidebar can highlight it AND auto-load the chapter detail. Out-of-
	// range numbers (e.g. /cec/99999) yield null so we don't speculatively 404
	// the per-paragraph context shard.
	const activeParagraph = $derived.by(() => {
		const m = page.url.pathname.match(/^\/cec\/(\d+)(?:-\d+)?$/);
		if (!m) return null;
		const n = parseInt(m[1]!, 10);
		return n >= 1 && n <= 2865 ? n : null;
	});

	// Per-paragraph context lookup (~30 byte shard) — replaces a 1.83 MB bundle
	// fetch that the audit flagged as the largest avoidable payload on /cec.
	let ctxLoadGen = 0;
	$effect(() => {
		if (corpus !== 'ccc') return;
		if (activeParagraph === null) {
			activeContext = null;
			return;
		}
		const myGen = ++ctxLoadGen;
		(async () => {
			const ctx = await loadParagraphContext(activeParagraph);
			if (myGen === ctxLoadGen) activeContext = ctx;
		})();
	});

	// The href of the deepest item the current page corresponds to.
	// Used for sidebar item highlighting (passed via context to SidebarItem).
	function deepestHref(c: ParagraphContext): string {
		const hash = c.heading ? `#${c.heading.id}` : '';
		if (c.article && c.section && c.chapter) {
			return `/cec/${c.part.slug}/${c.section.slug}/${c.chapter.slug}/${c.article.slug}${hash}`;
		}
		if (c.chapter && c.section) {
			return `/cec/${c.part.slug}/${c.section.slug}/${c.chapter.slug}${hash}`;
		}
		// articles_direct: article belongs to section with no enclosing chapter
		if (c.article && c.section) {
			return `/cec/${c.part.slug}/${c.section.slug}/${c.article.slug}${hash}`;
		}
		if (c.section) {
			return `/cec/${c.part.slug}/${c.section.slug}`;
		}
		return `/cec/${c.part.slug}`;
	}

	const activeHref: string = $derived.by(() => {
		if (corpus === 'compendium') {
			const ah = $activeHeading;
			const hash = ah && ah.pathname === page.url.pathname ? `#${ah.id}` : '';
			return page.url.pathname + hash;
		}
		if (activeParagraph === null) {
			// On non-paragraph URLs (article / chapter / section / part), append
			// the scroll-spy heading hash so the Sidebar highlights the section
			// the reader is currently in. The hash is only applied when it was
			// emitted by scroll-spy on THIS pathname — otherwise a hash from a
			// previous page would briefly bleed into the next page's activeHref
			// and double-highlight an unrelated entry alongside the new article.
			const ah = $activeHeading;
			const hash = ah && ah.pathname === page.url.pathname ? `#${ah.id}` : '';
			const raw = page.url.pathname + hash;
			// Trent chapter pages emit section headings as #h-{slug}. The sidebar
			// items link to /trente/{chapter}/{slug} (path segments, not hashes).
			// Convert /trente/{chapter}#h-{slug} → /trente/{chapter}/{slug} so the
			// existing prefix-match logic highlights the right section item.
			if (corpus === 'trent') {
				const m = raw.match(/^(\/trente\/[^/]+)#h-(.+)$/);
				if (m) return `${m[1]}/${m[2]}`;
			}
			// Grand Catéchisme part pages emit:
			//   chapter headings: #c-{chSlug}        → /grand-catechisme/{part}/{chSlug}
			//   section headings: #c-{chSlug}-s-{si} → /grand-catechisme/{part}/{chSlug}#s-{si}
			if (corpus === 'pius-x-grand') {
				const mSec = raw.match(/^(\/grand-catechisme\/[^/]+)#c-(.+)-s-(\d+)$/);
				if (mSec) return `${mSec[1]}/${mSec[2]}#s-${mSec[3]}`;
				const mCh = raw.match(/^(\/grand-catechisme\/[^/]+)#c-(.+)$/);
				if (mCh) return `${mCh[1]}/${mCh[2]}`;
			}
			// Petit Catéchisme part pages emit the same heading pattern.
			if (corpus === 'pius-x-petit') {
				const mSec = raw.match(/^(\/petit-catechisme\/[^/]+)#c-(.+)-s-(\d+)$/);
				if (mSec) return `${mSec[1]}/${mSec[2]}#s-${mSec[3]}`;
				const mCh = raw.match(/^(\/petit-catechisme\/[^/]+)#c-(.+)$/);
				if (mCh) return `${mCh[1]}/${mCh[2]}`;
			}
			return raw;
		}
		const c = activeContext;
		if (!c) return page.url.pathname;
		return deepestHref(c);
	});

	// As the reader scrolls and activeHref shifts, keep the highlighted entry
	// in view inside the (often-tall) sidebar. `block: 'nearest'` only scrolls
	// when the entry is actually clipped, so manual sidebar scrolling isn't
	// fought. Also re-runs when activeChapter resolves so the deeper entries
	// rendered after the chapter detail arrives can be scrolled into view.
	$effect(() => {
		if (!navEl) return;
		const target = activeHref;
		void activeChapter;
		const link =
			navEl.querySelector<HTMLElement>(`a[href="${CSS.escape(target)}"]`) ??
			navEl.querySelector<HTMLElement>(`a[href="${CSS.escape(target.replace(/#.*$/, ''))}"]`);
		link?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	});

	// Load detailed chapter data when on a chapter URL OR when on a paragraph URL
	// whose context places it in a chapter — so we can expand headings/en_brefs.
	let chapterLoadGen = 0;
	$effect(() => {
		if (corpus !== 'ccc') return;
		const m = page.url.pathname.match(/^\/cec\/[^/]+\/[^/]+\/([^/]+)/);
		const directSlug = m ? m[1]! : null;
		const c = activeContext as ParagraphContext | null;
		const ctxSlug: string | null = c && c.chapter ? c.chapter.slug : null;
		const slug = directSlug ?? ctxSlug;
		if (!slug) {
			activeChapter = null;
			return;
		}
		// Skip the network round-trip when the slug already matches what's
		// loaded — keeps the rich tree rendering uninterrupted while the
		// reader navigates between articles within the same chapter.
		if (activeChapter?.slug === slug) return;
		const myGen = ++chapterLoadGen;
		(async () => {
			try {
				const ch = await loadChapter(slug);
				if (myGen === chapterLoadGen) activeChapter = ch;
			} catch {
				if (myGen === chapterLoadGen) activeChapter = null;
			}
		})();
	});

	function chapterChildren(ch: Chap, partSlug: string, sectionSlug: string): Item[] {
		const baseHref = `/cec/${partSlug}/${sectionSlug}/${ch.slug}`;
		const out: Item[] = [];
		const detail = activeChapter && activeChapter.slug === ch.slug ? activeChapter : null;

		// Préambule — paragraphs that sit in the chapter before the first
		// article (e.g. Chapter 2's §§422-429 "La Bonne Nouvelle"). Surface
		// them as a top-level entry so readers can jump in without guessing
		// they live "above" Article 2.
		const chapFirstP = ch.paragraphs?.[0];
		const firstArtP = ch.articles?.[0]?.paragraphs?.[0];
		if (chapFirstP && firstArtP && chapFirstP < firstArtP) {
			out.push({
				title: 'Préambule',
				href: baseHref
			});
		}
		// Always build the rich tree from whatever article data is available.
		// Structure-level articles already carry `headings` (recursive), so we
		// can render the full article→Roman→sub_heading nesting before the
		// chapter detail finishes loading. en_brefs and paragraphes only exist
		// on the detail and layer in once it arrives. Without this, navigating
		// between chapters briefly flashed a flat article-only tree before the
		// detail re-expanded the new active chapter.
		const articlesSource = (detail?.articles as Article[] | undefined) ?? ch.articles;
		const enBrefs = detail?.en_brefs ?? [];
		const chapterHeadings = detail?.headings ?? ch.headings;

		{
			for (const a of articlesSource) {
				const articleHref = `${baseHref}/${a.slug}`;
				const articleParas = a.paragraphs;
				const articleMin = articleParas.length > 0 ? articleParas[0]! : 0;
				const articleMax = articleParas.length > 0 ? articleParas[articleParas.length - 1]! : 0;

				// All headings + en_brefs belonging to this article, ordered
				// by paragraph position. Tag each entry with a "level" so the
				// nesting pass below can group level-3 sub_headings as
				// children of the preceding level-2 heading.
				type Entry = {
					sortKey: number;
					level: number; // 2 = Roman heading, 3 = sub-heading, 2 = en_bref (treated as section sibling)
					item: Item;
				};
				const entries: Entry[] = [];
				for (const h of a.headings) {
					entries.push({
						sortKey: h.paragraph_start,
						level: h.level ?? 2,
						item: { title: h.title, href: `${articleHref}#${h.id}` }
					});
				}
				for (const block of enBrefs) {
					if (block.paragraphs.length === 0) continue;
					const firstP = block.paragraphs[0]!;
					if (firstP < articleMin || firstP > articleMax) continue;
					entries.push({
						sortKey: firstP,
						level: 2,
						item: { title: 'En Bref', href: `${baseHref}#en-bref-${firstP}` }
					});
				}
				entries.sort((x, y) => x.sortKey - y.sortKey);

				// Nest level-3 sub_headings under their parent level-2 heading
				// (the most recent level-2 in document order). Returns a flat
				// list of level-2 items, each potentially carrying nested
				// children. Pass-through for entries without nesting context.
				function nestLevels(es: Entry[]): Item[] {
					const result: Item[] = [];
					let current: Item | null = null;
					let currentChildren: Item[] | null = null;
					for (const e of es) {
						if (e.level >= 3 && current) {
							if (!currentChildren) {
								currentChildren = [];
								current.children = currentChildren;
							}
							currentChildren.push(e.item);
						} else {
							current = { ...e.item };
							currentChildren = null;
							result.push(current);
						}
					}
					return result;
				}

				// If the article carries Paragraphe wrappers, nest entries
				// under them: each Paragraphe owns the entries whose first
				// paragraph falls in [paragraphe.paragraph_start, next
				// Paragraphe.paragraph_start). Entries that precede the first
				// Paragraphe become direct article children (article intro).
				const paragraphes = (a.paragraphes ?? [])
					.slice()
					.sort((x, y) => x.paragraph_start - y.paragraph_start);
				let articleChildren: Item[];
				if (paragraphes.length > 0) {
					const buckets: Item[] = [];
					const intro: Item[] = [];
					const introEntries: Entry[] = [];
					for (const e of entries) {
						let bucketIdx = -1;
						for (let i = 0; i < paragraphes.length; i++) {
							const start = paragraphes[i]!.paragraph_start;
							const end =
								i + 1 < paragraphes.length ? paragraphes[i + 1]!.paragraph_start - 1 : articleMax;
							if (e.sortKey >= start && e.sortKey <= end) {
								bucketIdx = i;
								break;
							}
						}
						if (bucketIdx === -1) introEntries.push(e);
					}
					intro.push(...nestLevels(introEntries));
					for (let i = 0; i < paragraphes.length; i++) {
						const pg = paragraphes[i]!;
						const start = pg.paragraph_start;
						const end =
							i + 1 < paragraphes.length ? paragraphes[i + 1]!.paragraph_start - 1 : articleMax;
						const slice = entries.filter((e) => e.sortKey >= start && e.sortKey <= end);
						const children = nestLevels(slice);
						buckets.push({
							title: pg.title,
							number: pg.number,
							typeLabel: 'Paragraphe',
							href: `${articleHref}#paragraphe-${pg.number}`,
							children: children.length > 0 ? children : undefined
						});
					}
					articleChildren = [...intro, ...buckets];
				} else {
					articleChildren = nestLevels(entries);
				}

				out.push({
					title: a.title,
					number: a.number,
					typeLabel: 'Article',
					href: articleHref,
					children: articleChildren.length > 0 ? articleChildren : undefined
				});
			}
			if (articlesSource.length === 0) {
				// Chapter has no articles — fall back to chapter-level headings
				// + en_brefs.
				for (const h of chapterHeadings) {
					out.push({ title: h.title, href: `${baseHref}#${h.id}` });
				}
				for (const block of enBrefs) {
					if (block.paragraphs.length === 0) continue;
					const firstP = block.paragraphs[0];
					out.push({ title: 'En Bref', href: `${baseHref}#en-bref-${firstP}` });
				}
			} else {
				// Any en_brefs not associated with an article go at chapter level.
				const inAnyArticle = (firstP: number) =>
					articlesSource.some((a) => {
						const ps = a.paragraphs;
						return ps.length > 0 && firstP >= ps[0]! && firstP <= ps[ps.length - 1]!;
					});
				for (const block of enBrefs) {
					if (block.paragraphs.length === 0) continue;
					const firstP = block.paragraphs[0]!;
					if (!inAnyArticle(firstP)) {
						out.push({ title: 'En Bref', href: `${baseHref}#en-bref-${firstP}` });
					}
				}
			}
		}
		return out;
	}

	const tree: Item[] = $derived.by(() => {
		if (corpus === 'pius-x-grand') {
			if (!piusXGrandStructure) return [];
			return piusXGrandStructure.parts.map(
				(part): Item => ({
					title: part.title,
					href: `/grand-catechisme/${part.slug}`,
					children: part.chapters.map((ch): Item => {
						const chHref = `/grand-catechisme/${part.slug}/${ch.slug}`;
						// Build section children from structure data (no extra fetches).
						// Show sections for chapters that have 2+ titled sections.
						const titled = ch.sections
							.map((sec, si) => ({ sec, si }))
							.filter(({ sec }) => sec.title !== null);
						const sectionChildren: Item[] | undefined =
							titled.length > 1
								? titled.map(({ sec, si }) => ({
										title: sec.title!.replace(/^§\s*\d+\.\s*/, ''),
										href: `${chHref}#s-${si}`
									}))
								: undefined;
						return {
							title: ch.title,
							href: chHref,
							children: sectionChildren
						};
					})
				})
			);
		}
		if (corpus === 'pius-x-petit') {
			// Appendix outline takes precedence on appendix pages.
			if (activePetitAppendix && piusXPetitAppendix) {
				const baseHref = `/petit-catechisme/${activePetitAppendix}`;
				if (activePetitAppendix === 'annee-liturgique') {
					const ap = piusXPetitAppendix as PiusXPetitLiturgicalAppendix;
					return ap.chapters.map(
						(ch): Item => ({
							title: ch.title,
							kicker: `Chapitre ${ch.roman}`,
							href: `${baseHref}#ch-${ch.roman}`,
							children: ch.sections.map(
								(sec): Item => ({
									title: sec.title,
									href: `${baseHref}#ch-${ch.roman}-s-${sec.n}`
								})
							)
						})
					);
				}
				if (activePetitAppendix === 'histoire-revelation') {
					const ap = piusXPetitAppendix as PiusXPetitAppendix;
					return ap.sections.map(
						(sec): Item => ({
							title: sec.title,
							kicker: sec.roman,
							href: `${baseHref}#s-${sec.roman}`
						})
					);
				}
			}

			if (!piusXPetitStructure) return [];

			function petitChapterItem(
				partSlug: string,
				ch: import('$lib/data/types').PiusXPetitStructureChapter
			): Item {
				const chHref = `/petit-catechisme/${partSlug}/${ch.slug}`;
				const sections = ch.sections;
				const children: Item[] | undefined =
					sections && sections.length > 0
						? sections.flatMap((sec, si): Item[] => {
								const secItem: Item = { title: sec.title, href: `${chHref}#s-${si}` };
								if (sec.commandments && sec.commandments.length > 0) {
									secItem.children = sec.commandments.map(
										(cmd): Item => ({
											title: `${cmd.roman} ${cmd.text}`,
											href: `${chHref}#cmd-${cmd.ordinal}`
										})
									);
								}
								return [secItem];
							})
						: undefined;
				return { title: ch.title, href: chHref, children };
			}

			const allParts: Item[] = [];

			allParts.push({
				title: piusXPetitStructure.intro.title,
				href: `/petit-catechisme/${piusXPetitStructure.intro.part_slug}`
			});

			for (const part of piusXPetitStructure.parts) {
				const partHref = `/petit-catechisme/${part.slug}`;
				const chapters = part.chapters
					? part.chapters.map((ch) => petitChapterItem(part.slug, ch))
					: part.sections!.flatMap((sec) =>
							sec.chapters.map((ch) => petitChapterItem(part.slug, ch))
						);
				allParts.push({ title: part.title, href: partHref, children: chapters });
			}
			return allParts;
		}
		if (corpus === 'catechisme-illustre') {
			if (!catIllustreStructure) return [];
			const out: Item[] = [];
			for (const f of catIllustreStructure.front_matter) {
				out.push({ title: f.title, href: `/catechisme-illustre/${f.slug}` });
			}
			for (const ch of catIllustreStructure.chapters) {
				out.push({
					title: ch.title,
					kicker: `Leçon ${ch.roman}`,
					href: `/catechisme-illustre/${ch.slug}`
				});
			}
			for (const f of catIllustreStructure.back_matter) {
				out.push({ title: f.title, href: `/catechisme-illustre/${f.slug}` });
			}
			return out;
		}
		if (corpus === 'denzinger') {
			if (!denzingerStructure) return [];
			// Render parts → units → sections (decree/doctrine titles).
			// Sections only render when the unit has 2+ of them (avoid
			// duplicating the unit title for single-section units).
			return denzingerStructure.parts.map(
				(p): Item => ({
					title: p.title,
					kicker: `DH ${p.first_n ?? '?'}–${p.last_n ?? '?'}`,
					href: `/denzinger/sommaire#${p.slug}`,
					children: p.units.map((u): Item => {
						const range =
							u.first_n != null
								? `DH ${u.first_n}${u.last_n !== u.first_n ? `–${u.last_n}` : ''}`
								: undefined;
						function fmtRange(a: number, b: number): string {
							return `DH ${a}${b !== a ? `–${b}` : ''}`;
						}
						const sections = u.sections ?? [];
						// Build a flat list of section + chapter items, only when
						// the unit has more than one chunk worth surfacing.
						const sectionItems: Item[] = [];
						for (const s of sections) {
							if (s.title) {
								sectionItems.push({
									title: s.title,
									href: `/denzinger/${u.slug}#${s.anchor}`,
									kicker: fmtRange(s.first_n, s.last_n),
									children: s.chapters?.length
										? s.chapters.map((c) => ({
												title: c.title,
												href: `/denzinger/${u.slug}#${c.anchor}`,
												kicker: fmtRange(c.first_n, c.last_n)
											}))
										: undefined
								});
							} else if (s.chapters?.length) {
								// No section title — surface chapters at unit level.
								for (const c of s.chapters) {
									sectionItems.push({
										title: c.title,
										href: `/denzinger/${u.slug}#${c.anchor}`,
										kicker: fmtRange(c.first_n, c.last_n)
									});
								}
							}
						}
						return {
							title: u.title,
							kicker: range,
							href: `/denzinger/${u.slug}`,
							children: sectionItems.length > 1 ? sectionItems : undefined
						};
					})
				})
			);
		}
		if (corpus === 'boulanger') {
			if (!boulangerStructure) return [];
			const activeSlug = boulangerActiveSlug;
			const activeLesson = boulangerActiveLesson;
			return boulangerStructure.tomes.map(
				(t): Item => ({
					title: t.title,
					kicker: `Tome ${t.n}`,
					href: t.lessons[0]
						? `/doctrine-catholique/${t.lessons[0].slug}`
						: `/doctrine-catholique/sommaire#tome-${t.n}`,
					children: t.lessons.map((l): Item => {
						const isActive = l.slug === activeSlug;
						const miniTocChildren =
							isActive && activeLesson?.slug === l.slug
								? activeLesson.mini_toc.map(
										(item): Item => ({
											title: item.label,
											kicker: `${item.roman}.`,
											href: `/doctrine-catholique/${l.slug}#${item.anchor}`,
											children: item.children.length
												? item.children.map(
														(c): Item => ({
															title: c.label,
															kicker: `${c.n}°`,
															href: `/doctrine-catholique/${l.slug}#${c.anchor}`
														})
													)
												: undefined
										})
									)
								: undefined;
						return {
							title: l.title,
							kicker: `Leçon ${l.n}`,
							href: `/doctrine-catholique/${l.slug}`,
							children: miniTocChildren
						};
					})
				})
			);
		}
		if (corpus === 'cdse') {
			if (!cdseStructure) return [];
			const activeSlug = cdseActiveSlug;
			const activeChapter = cdseActiveChapter;
			const out: Item[] = [];
			for (const p of cdseStructure.parts) {
				if (p.kind === 'index') continue;
				const partItem: Item = {
					title: p.title,
					kicker:
						p.kind === 'part'
							? p.title.replace(/ partie$/i, '')
							: p.kind === 'intro'
								? 'Introduction'
								: p.kind === 'conclusion'
									? 'Conclusion'
									: 'Préambule',
					href: p.chapters[0] ? `/doctrine-sociale/${p.chapters[0].slug}` : '/doctrine-sociale',
					children: p.chapters.map((c): Item => {
						const isActive = c.slug === activeSlug;
						const miniTocChildren =
							isActive && activeChapter?.slug === c.slug
								? activeChapter.blocks
										.filter((b) => b.kind === 'heading' && b.level === 1)
										.map(
											(b): Item => ({
												title: b.kind === 'heading' ? b.title : '',
												href: `/doctrine-sociale/${c.slug}#${b.kind === 'heading' ? b.anchor : ''}`
											})
										)
								: undefined;
						return {
							title: c.title,
							kicker:
								c.n !== null
									? `Chapitre ${c.n}`
									: p.kind === 'intro'
										? 'Introduction'
										: p.kind === 'conclusion'
											? 'Conclusion'
											: undefined,
							href: `/doctrine-sociale/${c.slug}`,
							children: miniTocChildren && miniTocChildren.length > 0 ? miniTocChildren : undefined
						};
					})
				};
				out.push(partItem);
			}
			return out;
		}
		if (corpus === 'pgmr') {
			if (!pgmrStructure) return [];
			const activeSlug = pgmrActiveSlug;
			const activeChapter = pgmrActiveChapter;
			return pgmrStructure.chapters.map((c): Item => {
				const isActive = c.slug === activeSlug;
				const miniTocChildren =
					isActive && activeChapter?.slug === c.slug
						? activeChapter.blocks
								.filter((b) => b.kind === 'heading' && b.level === 1)
								.map(
									(b): Item => ({
										title: b.kind === 'heading' ? b.title : '',
										href: `/pgmr/${c.slug}#${b.kind === 'heading' ? b.anchor : ''}`
									})
								)
						: undefined;
				return {
					title: c.title,
					kicker: c.n !== null ? `Chapitre ${c.n}` : 'Préambule',
					href: `/pgmr/${c.slug}`,
					children: miniTocChildren && miniTocChildren.length > 0 ? miniTocChildren : undefined
				};
			});
		}
		// Build a nested Item tree from the flat toc using `level`. Every
		// node is `defaultExpanded` so the rail shows the full hierarchy
		// without click-to-expand (this is a small corpus).
		function tocToItems(
			toc: { level: number; anchor: string; title: string; n?: number }[],
			base: string
		): Item[] {
			type Frame = { item: Item; level: number };
			const root: Item[] = [];
			const stack: Frame[] = [];
			for (const e of toc) {
				let kicker: string | undefined;
				let displayTitle = e.title;
				const chap = displayTitle.match(/^(CHAPITRE\s+[A-ZIVXLC]+)(?:\s*[:.\-—]\s*)(.+)$/i);
				if (chap) {
					kicker = chap[1]!.toUpperCase();
					displayTitle = chap[2]!;
				} else if (e.n !== undefined) {
					// Red non-italic number + italic body. Styled via global
					// rules in app.css so Svelte doesn't tree-shake the class
					// names (they appear only inside {@html …}).
					displayTitle = `<span class="vii-num">${e.n}.</span> <em class="vii-title">${e.title}</em>`;
				}
				// Visual level clamped to 4 — tree-building uses the raw
				// e.level (which may go up to 5 for §s under letter sub-
				// headings) but SidebarItem only styles up to lvl-4.
				const level: 2 | 3 | 4 = e.level <= 2 ? 2 : e.level === 3 ? 3 : 4;
				const item: Item = {
					title: displayTitle,
					href: `${base}#${e.anchor}`,
					level,
					defaultExpanded: true,
					...(kicker ? { kicker } : {}),
					children: []
				};
				while (stack.length > 0 && stack[stack.length - 1]!.level >= e.level) stack.pop();
				if (stack.length === 0) root.push(item);
				else stack[stack.length - 1]!.item.children!.push(item);
				stack.push({ item, level: e.level });
			}
			const clean = (items: Item[]): Item[] =>
				items.map((it) => ({
					...it,
					children: it.children && it.children.length > 0 ? clean(it.children) : undefined
				}));
			return clean(root);
		}
		if (corpus === 'vatican-ii') {
			if (!vatIIStructure || !vatIIActiveSlug) return [];
			const activeDoc = vatIIActiveDoc;
			const docRef = vatIIStructure.docs.find((d) => d.slug === vatIIActiveSlug);
			if (!docRef) return [];
			const KIND_SHORT = {
				constitution: 'Const.',
				decree: 'Décret',
				declaration: 'Décl.'
			} as const;
			const miniTocChildren =
				activeDoc?.slug === docRef.slug
					? tocToItems(activeDoc.toc, `/vatican-ii/${docRef.slug}`)
					: undefined;
			return [
				{
					title: docRef.title,
					kicker: `${docRef.abbr} · ${KIND_SHORT[docRef.kind]} ${docRef.date.slice(0, 4)}`,
					href: `/vatican-ii/${docRef.slug}`,
					children: miniTocChildren && miniTocChildren.length > 0 ? miniTocChildren : undefined
				}
			];
		}
		if (corpus === 'cic') {
			if (!cicStructure) return [];
			// Identify which code's index/reader we're on. Without an active
			// code, fall back to listing both (defensive — the layout normally
			// hides the sidebar at /cic exactly).
			const codeMatch = page.url.pathname.match(/^\/cic\/(1983|1917)/);
			const activeCode = codeMatch?.[1] as '1983' | '1917' | undefined;

			if (activeCode && !cicActiveSlug) {
				// /cic/[code] index — show that code's livres as a flat list.
				const entry = cicStructure.codes.find((c) => c.code === activeCode);
				if (!entry) return [];
				return entry.livres.map(
					(l): Item => ({
						title: l.title,
						kicker: `Livre ${l.n}`,
						href: `/cic/${activeCode}/${l.slug}`
					})
				);
			}

			// /cic/[code]/[livre] reader — show the livre's heading tree, properly
			// nested so chapitres sit under their titre and articles under their
			// chapitre (matches the body's visual hierarchy).
			const activeLivre = cicActiveLivre;
			if (!activeLivre || activeLivre.slug !== cicActiveSlug) return [];
			const base = `/cic/${activeLivre.code}/${activeLivre.slug}`;
			const labelMap = {
				partie: 'Partie',
				section: 'Section',
				titre: 'Titre',
				chapitre: 'Chap.',
				article: 'Art.'
			} as const;
			const depthMap = { partie: 1, section: 2, titre: 3, chapitre: 4, article: 5 } as const;
			const levelMap: Record<keyof typeof depthMap, 2 | 3 | 4> = {
				partie: 2,
				section: 2,
				titre: 3,
				chapitre: 4,
				article: 4
			};

			const headings = activeLivre.blocks.filter((b) => b.kind === 'heading') as Extract<
				(typeof activeLivre.blocks)[number],
				{ kind: 'heading' }
			>[];

			const root: Item[] = [];
			const stack: { depth: number; item: Item }[] = [];
			for (const h of headings) {
				const d = depthMap[h.level];
				while (stack.length && stack[stack.length - 1]!.depth >= d) stack.pop();
				const item: Item = {
					title: h.title,
					href: `${base}#${h.anchor}`,
					level: levelMap[h.level],
					...(h.label ? { kicker: `${labelMap[h.level]} ${h.label}` } : {}),
					children: []
				};
				if (stack.length === 0) root.push(item);
				else stack[stack.length - 1]!.item.children!.push(item);
				stack.push({ depth: d, item });
			}
			// Strip empty children arrays so leaf items don't render the
			// expand chevron.
			function prune(items: Item[]) {
				for (const it of items) {
					if (it.children && it.children.length === 0) delete it.children;
					else if (it.children) prune(it.children);
				}
			}
			prune(root);

			return [
				{
					title: activeLivre.title,
					kicker: `Livre ${activeLivre.n}`,
					href: base,
					defaultExpanded: true,
					children: root
				}
			];
		}
		if (corpus === 'breviloquium') {
			if (!brevStructure) return [];
			// Show every part with its chapter list. Auto-expand the part
			// containing the active chapter; collapse the rest so the rail
			// stays compact (79 chapters is too many for one flat list).
			const items: Item[] = [];
			for (const part of brevStructure.parts) {
				const containsActive = part.chapters.some((c) => c.slug === brevActiveSlug);
				const partKicker =
					part.kind === 'partie'
						? `Partie ${part.roman}`
						: part.kind === 'prologue'
							? 'Préambule'
							: 'Épilogue';
				items.push({
					title: part.title,
					kicker: partKicker,
					href: `/breviloquium#${part.slug}`,
					level: 2,
					defaultExpanded: containsActive,
					children: part.chapters.map(
						(c): Item => ({
							title: c.title,
							kicker: c.label,
							href: `/breviloquium/${c.slug}`,
							level: 4
						})
					)
				});
			}
			return items;
		}
		if (corpus === 'calendrier') {
			if (calendrierFeasts.length === 0) return [];
			const SEASON_LABELS: Record<CalendrierSeason, string> = {
				avent: 'Avent',
				noel: 'Noël',
				careme: 'Carême',
				pascal: 'Triduum & Pâques',
				solennite: 'Solennités du Seigneur',
				ordinaire: 'Temps Ordinaire'
			};
			const SEASON_ORDER: CalendrierSeason[] = [
				'avent',
				'noel',
				'careme',
				'pascal',
				'solennite',
				'ordinaire'
			];
			const baseHref = calendrierBaseHref;
			const isFixed = baseHref === '/calendrier/solennites';

			function feastToItem(f: CalendrierFeast | CalendrierFixedFeast): Item {
				const feastHref = `${baseHref}#f-${f.slug}`;
				const showClusters = f.clusters.length > 1;
				return {
					title: f.title,
					...('date' in f && f.date ? { kicker: f.date } : {}),
					href: feastHref,
					children: showClusters
						? f.clusters.map(
								(c): Item => ({
									title: c.theme.charAt(0).toUpperCase() + c.theme.slice(1),
									href: `${baseHref}#c-${f.slug}-${c.i}`
								})
							)
						: undefined
				};
			}

			if (isFixed) {
				return calendrierFeasts.map(feastToItem);
			}

			const groups: Partial<Record<CalendrierSeason, (CalendrierFeast | CalendrierFixedFeast)[]>> =
				{};
			for (const f of calendrierFeasts) {
				(groups[f.season] ??= []).push(f);
			}
			return SEASON_ORDER.filter((s) => groups[s]).map(
				(s): Item => ({
					title: SEASON_LABELS[s],
					href: `${baseHref}#season-${s}`,
					children: groups[s]!.map(feastToItem)
				})
			);
		}
		if (corpus === 'trent') {
			if (!trentStructure) return [];
			return trentStructure.parts.map((part, partIdx): Item => {
				const isPrologue = part.slug === 'prologue';
				const firstCh = part.chapters[0];
				const firstSec = firstCh?.sections[0];
				const partHref =
					firstCh && firstSec ? `/trente/${firstCh.slug}/${firstSec.slug}` : '/trente';
				const partTypeLabel = isPrologue ? undefined : 'Partie';
				const partNumber = isPrologue ? undefined : partIdx;
				return {
					title: part.title,
					...(partTypeLabel ? { typeLabel: partTypeLabel } : {}),
					...(partNumber !== undefined ? { number: partNumber } : {}),
					href: partHref,
					children: part.chapters.map((ch): Item => {
						const chHref = `/trente/${ch.slug}`;
						// Split "Du Xième article : Et en Jésus-Christ..." into
						// kicker2 (descriptor) + title (article content).
						const colonIdx = ch.title.indexOf(' : ');
						const chTitle = colonIdx > 0 ? ch.title.slice(colonIdx + 3) : ch.title;
						const chKicker2 = colonIdx > 0 ? ch.title.slice(0, colonIdx) : undefined;
						return {
							title: chTitle,
							...(ch.number > 0 ? { kicker: `Chapitre ${ch.number}` } : {}),
							...(chKicker2 ? { kicker2: chKicker2 } : {}),
							href: chHref,
							children: ch.sections.map(
								(sec): Item => ({
									title: sec.title,
									href: `/trente/${ch.slug}/${sec.slug}`
								})
							)
						};
					})
				};
			});
		}
		if (corpus === 'compendium') {
			if (!compendiumStructure) return [];
			return compendiumStructure.parts.map((part): Item => {
				const partHref = `/compendium/${part.slug}`;
				const isActive = activeCompendiumPart?.slug === part.slug;
				let children: Item[] | undefined;
				if (isActive && activeCompendiumPart) {
					// Build a 3-deep heading tree (h2 → h3 → h4). Individual
					// questions are NOT included — the sidebar is a structural
					// outline of the part, not a Q-by-Q index.
					children = [];
					let currentH2: Item | null = null;
					let currentH3: Item | null = null;
					for (const node of activeCompendiumPart.flow) {
						if (node.kind !== 'heading') continue;
						const item: Item = {
							title: node.title,
							href: `${partHref}#${node.id}`,
							level: node.level,
							...(node.kicker ? { kicker: node.kicker } : {})
						};
						if (node.level === 2) {
							children.push(item);
							currentH2 = item;
							currentH3 = null;
						} else if (node.level === 3) {
							const parent = currentH2 ?? null;
							if (parent) (parent.children = parent.children ?? []).push(item);
							else children.push(item);
							currentH3 = item;
						} else {
							// level 4
							const parent = currentH3 ?? currentH2 ?? null;
							if (parent) (parent.children = parent.children ?? []).push(item);
							else children.push(item);
						}
					}
				} else {
					// Non-active parts: show just the depth-2 sections as a peek.
					children = part.sections.map(
						(sec): Item => ({
							title: sec.title,
							href: `${partHref}#s-${sec.title.toLowerCase().replace(/\s+/g, '-')}`
						})
					);
				}
				return {
					title: part.title,
					number: part.number,
					typeLabel: 'Partie',
					href: partHref,
					children: children && children.length > 0 ? children : undefined
				};
			});
		}
		// ─── CCC tree ─────────────────────────────────────────────────────────
		if (!structure) return [];
		return structure.parts.map((part): Item => {
			if (part.prologue) {
				return { title: part.title, href: `/cec/prologue` };
			}
			return {
				title: part.title,
				number: part.number,
				typeLabel: 'Partie',
				href: `/cec/${part.slug}`,
				children: part.sections.map(
					(section): Item => ({
						title: section.title,
						number: section.number,
						typeLabel: 'Section',
						href: `/cec/${part.slug}/${section.slug}`,
						children: [
							...section.chapters.map((chapter): Item => {
								const children = chapterChildren(chapter, part.slug, section.slug);
								return {
									title: chapter.title,
									number: chapter.number,
									typeLabel: 'Chapitre',
									href: `/cec/${part.slug}/${section.slug}/${chapter.slug}`,
									children: children.length > 0 ? children : undefined
								};
							}),
							...(section.articles_direct ?? []).map(
								(article): Item => ({
									title: article.title,
									number: article.number,
									typeLabel: 'Article',
									href: `/cec/${part.slug}/${section.slug}/${article.slug}`
								})
							)
						]
					})
				)
			};
		});
	});
</script>

<!--
	Always rendered; visibility driven by html[data-sidebar='closed'] (set by
	theme-init.js before paint and synced from the store on toggle). Avoids
	the SSR/hydration mismatch that previously caused CLS 0.16.
-->
<aside
	class="sidebar-rail hidden lg:flex sticky top-[80px] h-[calc(100vh-80px)] bg-panel border-r border-border z-20 flex-none flex-col"
	aria-hidden={!$sidebarOpen}
>
	<div class="flex items-center justify-between p-2 border-b border-border">
		{#if sommaireHref}
			<a
				href={sommaireHref}
				class="font-ui text-xs uppercase tracking-wider text-muted ml-2 hover:text-accent transition-colors"
				>Sommaire</a
			>
		{:else}
			<span class="font-ui text-xs uppercase tracking-wider text-muted ml-2">Sommaire</span>
		{/if}
		<button
			type="button"
			onclick={() => sidebarOpen.set(false)}
			class="w-7 h-7 flex items-center justify-center rounded hover:bg-accent/10 text-muted hover:text-accent text-base leading-none"
			aria-label="Fermer le sommaire"
		>
			✕
		</button>
	</div>
	<nav
		bind:this={navEl}
		class="flex-1 overflow-y-auto p-3 font-ui styled-scroll styled-scroll-accent"
		aria-label={corpus === 'compendium'
			? 'Plan du Compendium'
			: corpus === 'trent'
				? 'Plan du Catéchisme de Trente'
				: corpus === 'pius-x-grand'
					? 'Plan du Grand Catéchisme'
					: corpus === 'pius-x-petit'
						? 'Plan du Petit Catéchisme'
						: corpus === 'catechisme-illustre'
							? 'Plan du Catéchisme illustré'
							: corpus === 'denzinger'
								? 'Plan du Denzinger'
								: corpus === 'calendrier'
									? 'Calendrier liturgique'
									: 'Plan du Catéchisme'}
		style="scrollbar-gutter: stable;"
	>
		<ul class="space-y-0.5">
			{#each tree as item (item.href)}
				<SidebarItem {item} {activeHref} />
			{/each}
		</ul>
	</nav>
</aside>

<style>
	/* Rail width is the source of truth for layout shift. SSR ships
	   width: 320px; theme-init.js sets data-sidebar='closed' on <html>
	   before first paint when the user has it closed, collapsing the rail
	   to width: 0 from the very first frame. Toggle clicks animate via
	   the CSS transition. */
	.sidebar-rail {
		width: 320px;
		overflow: hidden;
		transition: width 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	:global(html[data-sidebar='closed']) .sidebar-rail {
		width: 0;
		border-right-width: 0;
	}
</style>
