<script lang="ts">
	import { onMount, onDestroy, tick, untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { replaceState } from '$app/navigation';
	import ChapterNavBar from './ChapterNavBar.svelte';
	import BibleChapter from './BibleChapter.svelte';
	import type { BibleVerseIndex, NclChapterBlocks, NclSectionMap } from '$lib/data/types';
	import { bookBySlug, type BookInfo } from '$lib/utils/bibleBookSlug';
	import { loadNclBook, loadNclParagraphsBook } from '$lib/data/loaders';
	import { nextChapterRef, type ChapterRef } from '$lib/utils/chapterCursor';
	import { debounce } from '$lib/utils/debounce';
	import {
		shouldLoadNext,
		createChapterObserver,
		observeAllAnchors,
		observeNewAnchor,
		type Crossing
	} from '$lib/utils/infiniteScroll';
	import { prefs } from '$lib/stores/prefs';

	let {
		book,
		chapter,
		verses,
		verseIdx,
		totalChapters,
		sectionsByBook = {},
		concordanceManifest = {},
		chapterCounts = {},
		paragraphs = null
	}: {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		verseIdx: BibleVerseIndex;
		totalChapters: number;
		sectionsByBook?: NclSectionMap;
		concordanceManifest?: Record<string, number[]>;
		chapterCounts?: Record<string, number>;
		paragraphs?: NclChapterBlocks | null;
	} = $props();

	// Follows the pref alone. Citation count affects only whether the control
	// is disabled, never the layout attribute, because data-study-mode drives
	// the column-width compensation in app.css.
	const studyMode = $derived($prefs.bibleStudyMode);

	// The footer nav only renders with infinite scroll off, and then the entry
	// chapter is the only chapter · these correctly stay on the props.
	const prevHref = $derived(chapter > 1 ? `/bible/${book.slug}/${chapter - 1}` : null);
	const nextHref = $derived(chapter < totalChapters ? `/bible/${book.slug}/${chapter + 1}` : null);

	interface LoadedChapter {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		paragraphs: NclChapterBlocks | null;
	}

	/** Verses in `entry` that the Catechism cites · drives whether the
	 *  Lecture/Étude toggle is enabled. */
	function totalCitedIn(entry: LoadedChapter): number {
		const chIdx = verseIdx[entry.book.usfx]?.[String(entry.chapter)];
		if (!chIdx) return 0;
		return entry.verses.reduce((t, v) => t + ((chIdx[String(v.v)]?.length ?? 0) > 0 ? 1 : 0), 0);
	}

	function entryChapter(): LoadedChapter {
		return { book, chapter, verses, paragraphs };
	}

	let loaded = $state<LoadedChapter[]>([entryChapter()]);
	let container: HTMLElement | undefined = $state();

	// The chapter the reader is actually on, which with infinite scroll on is
	// not necessarily the one the route loaded. The chrome follows this.
	//
	// Seeded from the props and then owned by the observer · capturing only the
	// initial value is the point, so the compiler's `state_referenced_locally`
	// advice to make these derived is exactly backwards here. A later route
	// change re-seeds them through the reset effect below, not through
	// reactivity, so that scroll-driven updates in between are not clobbered.
	// svelte-ignore state_referenced_locally
	let activeSlug = $state(book.slug);
	// svelte-ignore state_referenced_locally
	let activeChapter = $state(chapter);

	const activeBook = $derived(bookBySlug(activeSlug) ?? book);
	// `loaded` is never empty · the reset effect always seeds it with the entry
	// chapter. The `?? loaded[0]` is for the window between an active chapter
	// being pruned and the observer reporting its replacement.
	const activeEntry = $derived<LoadedChapter | undefined>(
		loaded.find((l) => l.book.slug === activeSlug && l.chapter === activeChapter) ?? loaded[0]
	);
	const activeTotalChapters = $derived(chapterCounts[activeBook.usfx] ?? totalChapters);
	const hasConcordance = $derived(
		(concordanceManifest[activeBook.slug] ?? []).includes(activeChapter)
	);

	// The history entry is debounced; the bar label is not. A reader scrolling
	// fast should see the label keep up, while the history stays quiet.
	const syncUrl = debounce((slug: string, ch: number) => {
		if (!browser || destroyed) return;
		// The active chapter can move between scheduling and firing · a
		// param-only navigation reuses this component, so `destroyed` is false
		// and the trailing edge would otherwise write a URL for a chapter the
		// reader has already left.
		if (slug !== activeSlug || ch !== activeChapter) return;
		const path = `/bible/${slug}/${ch}`;
		if (window.location.pathname === path) return;
		replaceState(path, {});
	}, 200);

	function setActive(slug: string, ch: number) {
		if (slug === activeSlug && ch === activeChapter) return;
		activeSlug = slug;
		activeChapter = ch;
		syncUrl(slug, ch);
	}

	// Bumped on every route change. An in-flight load captures the value before
	// its await and discards its result if the generation moved on · otherwise a
	// navigation that lands mid-append splices a chapter from the OLD book onto
	// the freshly reset window. Reachable in practice: appending across a book
	// boundary is a real network request, and the reader can use the chapter
	// grid while it is in flight.
	let generation = 0;

	// A click on the chapter grid or a prev/next link re-runs load and hands us
	// new props. Without this the new chapter would be appended onto a window
	// built around the old one. ODR has no equivalent because scrolling is its
	// only way to reach another chapter.
	$effect(() => {
		const fresh = entryChapter();
		untrack(() => {
			generation += 1;
			loaded = [fresh];
			// A URL write scheduled just before this navigation is now for a
			// chapter the reader has left. The callback re-checks its own
			// arguments too, so this is belt and braces · it just avoids leaving
			// a pointless timer armed.
			syncUrl.cancel();
			activeSlug = fresh.book.slug;
			activeChapter = fresh.chapter;
			// The reset destroys the old chapter's anchor and creates a new one
			// that nothing is watching · `observeAllAnchors` runs only in
			// `onMount`, and `observeNewAnchor` covers only appended chapters.
			// Without this, after a chapter-grid click the observer never reports
			// an `enter` for the chapter the reader is actually on.
			tick().then(() => {
				if (!destroyed && container) observeAllAnchors(container, ensureObserver());
			});
		});
	});

	// Single mutex across both directions. A prepend measures scrollHeight to
	// compute its compensation, and a concurrent append whose tick() has not
	// flushed leaves that measurement stale, so the compensation overshoots.
	// Serialising all loads removes the whole class of bug (ODR's
	// BibleReader.svelte:94-98 records the same finding).
	let loading = false;
	let destroyed = false;
	let scrollReady = false;
	let scrollRaf = 0;
	let observer: IntersectionObserver | null = null;

	function ensureObserver(): IntersectionObserver {
		if (!observer) observer = createChapterObserver(onCrossing);
		return observer;
	}

	function isLoaded(ref: ChapterRef): boolean {
		return loaded.some((l) => l.book.slug === ref.bookSlug && l.chapter === ref.chapter);
	}

	async function fetchChapter(ref: ChapterRef): Promise<LoadedChapter | null> {
		const info = bookBySlug(ref.bookSlug);
		if (!info) return null;
		// Within a book both of these are module-cache hits, because +page.ts
		// already asked for them. Only a book boundary costs a request.
		const [bookData, paragraphsBook] = await Promise.all([
			loadNclBook(ref.usfx),
			loadNclParagraphsBook(ref.usfx)
		]);
		const chData = bookData?.[String(ref.chapter)];
		if (!chData) return null;
		const nextVerses = Object.entries(chData)
			.map(([v, text]) => ({ v: parseInt(v, 10), text }))
			.sort((a, b) => a.v - b.v);
		return {
			book: info,
			chapter: ref.chapter,
			verses: nextVerses,
			paragraphs: paragraphsBook?.[String(ref.chapter)] ?? null
		};
	}

	async function loadNext() {
		if (loading || !$prefs.infiniteScroll) return;
		const last = loaded[loaded.length - 1];
		if (!last) return;
		const ref = nextChapterRef(
			{ bookSlug: last.book.slug, usfx: last.book.usfx, chapter: last.chapter },
			chapterCounts
		);
		if (!ref || isLoaded(ref)) return;

		loading = true;
		const gen = generation;
		try {
			const entry = await fetchChapter(ref);
			if (entry && !destroyed && gen === generation) {
				loaded = [...loaded, entry];
				await tick();
				if (container) observeNewAnchor(container, ensureObserver(), ref.bookSlug, ref.chapter);
			}
		} catch (e) {
			console.warn('Failed to load the next chapter:', e);
		} finally {
			loading = false;
		}
	}

	function onScrollCheck() {
		if (!browser || !$prefs.infiniteScroll || !scrollReady) return;
		if (shouldLoadNext(window.scrollY, window.innerHeight, document.documentElement.scrollHeight)) {
			loadNext();
		}
	}

	function onScroll() {
		if (scrollRaf) return;
		scrollRaf = requestAnimationFrame(() => {
			scrollRaf = 0;
			onScrollCheck();
		});
	}

	function onCrossing(c: Crossing) {
		if (c.kind === 'enter') {
			setActive(c.bookSlug, c.chapter);
			return;
		}
		// exit-up · this chapter's anchor dropped below the band while the reader
		// scrolled up, which means the chapter loaded before it is now the one
		// being read.
		const idx = loaded.findIndex((l) => l.book.slug === c.bookSlug && l.chapter === c.chapter);
		if (idx > 0) {
			const prev = loaded[idx - 1];
			// Guard required by noUncheckedIndexedAccess · idx > 0 already proves
			// this element exists, but the compiler does not know that.
			if (prev) setActive(prev.book.slug, prev.chapter);
		}
	}

	onMount(() => {
		if (container) observeAllAnchors(container, ensureObserver());
		window.addEventListener('scroll', onScroll, { passive: true });
		scrollReady = true;
	});

	onDestroy(() => {
		destroyed = true;
		syncUrl.cancel();
		observer?.disconnect();
		if (browser) {
			window.removeEventListener('scroll', onScroll);
			if (scrollRaf) cancelAnimationFrame(scrollRaf);
		}
	});
</script>

<svelte:head>
	<title
		>{activeBook.frenchName}
		{activeChapter} dans la Bible · Catéchisme de l'Église Catholique</title
	>
</svelte:head>

<!-- Chapter navigation bar · sticky below the global TopBar. Optional: readers
     who navigate by scrolling can reclaim the row. The concordance route has
     its own bar and is deliberately unaffected. -->
{#if !$prefs.hideChapterNav}
	<ChapterNavBar
		book={activeBook}
		chapter={activeChapter}
		totalChapters={activeTotalChapters}
		{chapterCounts}
		{hasConcordance}
		citedVerseCount={activeEntry ? totalCitedIn(activeEntry) : 0}
		variant="reader"
	/>
{/if}

<main
	bind:this={container}
	class="mx-auto max-w-reader px-6 max-md:px-4 pt-8 max-md:pt-5 pb-16"
	data-corpus="bible"
	data-bible-layout={$prefs.bibleLayout}
	data-study-mode={studyMode}
>
	<!-- Keyed, and the key is load-bearing: without it a prepend in Task 9 would
	     re-create every chapter's DOM and destroy the scroll position the
	     compensation is trying to preserve. -->
	{#each loaded as item, i (item.book.slug + '-' + item.chapter)}
		<BibleChapter
			book={item.book}
			chapter={item.chapter}
			verses={item.verses}
			paragraphs={item.paragraphs}
			sections={sectionsByBook[item.book.usfx] ?? []}
			{verseIdx}
			{studyMode}
			headingLevel={i === 0 ? 'h1' : 'h2'}
		/>
	{/each}

	{#if !$prefs.infiniteScroll}
		<nav
			class="mt-16 pt-8 border-t border-border flex justify-between font-ui text-sm"
			aria-label="Chapitre précédent ou suivant"
		>
			{#if prevHref}
				<a href={prevHref} class="text-accent hover:underline whitespace-nowrap"
					>← Chapitre {chapter - 1}</a
				>
			{:else}<span></span>{/if}
			{#if nextHref}
				<a href={nextHref} class="text-accent hover:underline whitespace-nowrap"
					>Chapitre {chapter + 1} →</a
				>
			{:else}<span></span>{/if}
		</nav>
	{/if}
</main>

<style>
	/* Gap between stacked chapters, as a *bottom* margin on all but the last.
	   Deliberately not a top margin on all but the first: pruning a chapter off
	   the front would then change the surviving first chapter's box height, and
	   the scroll compensation would have to carry a magic constant to match
	   (ODR's BibleReader.svelte:214 does exactly that). Bottom margins keep
	   front-pruning purely subtractive. Back-pruning changes the last element
	   instead, and anything below the viewport cannot move the text above it. */
	main :global([data-chapter-section]:not(:last-of-type)) {
		margin-bottom: 3rem;
	}
</style>
