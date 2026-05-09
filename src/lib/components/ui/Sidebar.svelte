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
		loadCalendrierIndex,
		loadCalendrierYear
	} from '$lib/data/loaders';
	import type {
		Chapter,
		ParagraphContext,
		Corpus,
		CompendiumStructure,
		CompendiumPart,
		TrentStructure,
		PiusXGrandStructure,
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
		children?: Item[];
	};

	let { corpus = 'ccc' as Corpus }: { corpus?: Corpus } = $props();

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
		<span class="font-ui text-xs uppercase tracking-wider text-muted ml-2">Sommaire</span>
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
