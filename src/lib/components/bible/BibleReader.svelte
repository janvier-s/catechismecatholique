<script lang="ts">
	import { onMount, onDestroy, tick, untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { replaceState } from '$app/navigation';
	import ChapterNavBar from './ChapterNavBar.svelte';
	import BibleChapter from './BibleChapter.svelte';
	import type { BibleVerseIndex, NclChapterBlocks, NclSectionMap } from '$lib/data/types';
	import { bookBySlug, type BookInfo } from '$lib/utils/bibleBookSlug';
	import { loadNclBook, loadNclParagraphsBook } from '$lib/data/loaders';
	import { nextChapterRef, prevChapterRef, type ChapterRef } from '$lib/utils/chapterCursor';
	import { debounce } from '$lib/utils/debounce';
	import {
		shouldLoadNext,
		createChapterObserver,
		observeAllAnchors,
		observeNewAnchor,
		CHAPTER_ANCHOR_SELECTOR,
		type Crossing
	} from '$lib/utils/infiniteScroll';
	import { prefs } from '$lib/stores/prefs';
	import { anchorChromeShift } from '$lib/stores/chrome';

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
			// Re-armed on every arrival, not only on mount. A param-only navigation
			// reuses this component, so nothing else would re-arm it: a reader who
			// lands on Genèse 1, reads for a minute, then jumps to Genèse 9 from the
			// chapter grid would otherwise arrive with the cooldown long expired and
			// get Genèse 8 prepended underneath them on the next active change.
			navCooldownUntil = Date.now() + NAV_COOLDOWN_MS;
			// Any navigation is a fresh start. Neither record survives it, so a
			// reader who hit a flaky connection at a book boundary is never stuck
			// with a chapter that stays unreachable for the life of the component ·
			// re-deriving a structurally absent ref costs one cache-hit lookup.
			missing.clear();
			loadAttempts.clear();
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

	/** Chapters above and below the reader stay in the DOM; beyond this many, the
	 *  far end is pruned. Five covers a fast scroll in either direction without
	 *  letting a long book accumulate unbounded. */
	const MAX_LOADED = 5;

	/** How long after an arrival the rolling preload stays out of the way, so a
	 *  reader who has just landed is not immediately shifted by a prepend. */
	const NAV_COOLDOWN_MS = 2000;

	let navCooldownUntil = 0;
	let preloadTimer: ReturnType<typeof setTimeout> | null = null;

	/** Attempts a chapter gets before it is given up on. A throw from
	 *  `fetchChapter` is a dropped request, which is transient and only possible
	 *  at a book boundary · retrying costs one request, while not retrying strands
	 *  the reader at the end of a book with no way forward and no footer nav to
	 *  fall back on. */
	const MAX_LOAD_ATTEMPTS = 3;

	/** Refs whose chapter does not exist · an unknown slug, or a chapter number
	 *  past the end of its book. Structural, so it can never succeed on a retry
	 *  and the entry is permanent. */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const missing = new Set<string>();

	/** Failed attempts per ref, for loads that *threw*. Distinct from `missing`
	 *  because a dropped request says nothing about whether the chapter is there.
	 *  Both exist so a dead chapter is attempted a bounded number of times rather
	 *  than once per animation frame for as long as the reader keeps scrolling
	 *  near the bottom · offline, that would otherwise be a stream of failing
	 *  requests and a console.warn per frame.
	 *
	 *  Non-reactive — read only from the imperative load paths, never rendered,
	 *  so the reactive versions' sources would be pure overhead
	 *  (ParagraphActions.svelte takes the same exemption). */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const loadAttempts = new Map<string, number>();

	function refKey(ref: ChapterRef): string {
		return `${ref.bookSlug}-${ref.chapter}`;
	}

	/** Record a throw against `ref`'s attempt budget. */
	function recordFailure(ref: ChapterRef) {
		const key = refKey(ref);
		loadAttempts.set(key, (loadAttempts.get(key) ?? 0) + 1);
	}

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

	/** The chapter that would come after the loaded window, or null at the end of
	 *  the canon. */
	function nextRef(): ChapterRef | null {
		const last = loaded[loaded.length - 1];
		if (!last) return null;
		return nextChapterRef(
			{ bookSlug: last.book.slug, usfx: last.book.usfx, chapter: last.chapter },
			chapterCounts
		);
	}

	/** The chapter that would come before the loaded window, or null at Genèse 1. */
	function prevRef(): ChapterRef | null {
		const first = loaded[0];
		if (!first) return null;
		return prevChapterRef(
			{ bookSlug: first.book.slug, usfx: first.book.usfx, chapter: first.chapter },
			chapterCounts
		);
	}

	/** Whether `ref` is worth a request: it exists, is not already on the page,
	 *  is not known to be absent, and has attempts left. The single place the two
	 *  failure records are consulted, so both loaders stay symmetric. */
	function loadable(ref: ChapterRef | null): ref is ChapterRef {
		if (!ref || isLoaded(ref)) return false;
		const key = refKey(ref);
		return !missing.has(key) && (loadAttempts.get(key) ?? 0) < MAX_LOAD_ATTEMPTS;
	}

	async function loadNext() {
		if (loading || !$prefs.infiniteScroll) return;
		const ref = nextRef();
		if (!loadable(ref)) return;

		loading = true;
		const gen = generation;
		try {
			const entry = await fetchChapter(ref);
			if (!entry) missing.add(refKey(ref));
			if (entry && !destroyed && gen === generation) {
				loadAttempts.delete(refKey(ref));
				loaded = [...loaded, entry];
				await tick();
				// Re-checked after the tick, as in loadPrev · a navigation landing in
				// that window has already replaced the window being extended here.
				// An `if` rather than an early `return`, so the trailing
				// checkPreload() past the `finally` still runs, as it does there.
				if (!destroyed && gen === generation) {
					if (container) observeNewAnchor(container, ensureObserver(), ref.bookSlug, ref.chapter);
					const excess = loaded.length - MAX_LOADED;
					if (excess > 0) await pruneFront(excess);
				}
			}
		} catch (e) {
			recordFailure(ref);
			console.warn('Failed to load the next chapter:', e);
		} finally {
			loading = false;
		}
		checkPreload();
	}

	async function loadPrev() {
		if (loading || !$prefs.infiniteScroll) return;
		const ref = prevRef();
		if (!loadable(ref)) return;

		loading = true;
		const gen = generation;
		try {
			const entry = await fetchChapter(ref);
			if (!entry) missing.add(refKey(ref));
			if (entry && !destroyed && gen === generation) {
				loadAttempts.delete(refKey(ref));
				// Measure immediately before the mutation. After tick() the difference
				// is exactly the prepended chapter's rendered height, margin included.
				const y = window.scrollY;
				const oldHeight = document.documentElement.scrollHeight;
				loaded = [entry, ...loaded];
				await tick();
				const delta = document.documentElement.scrollHeight - oldHeight;
				if (!destroyed && gen === generation) {
					window.scrollTo({ top: y + delta, behavior: 'instant' });
					// Synchronously after the scrollTo, before the browser dispatches the
					// resulting scroll event. See the note on anchorChromeShift in
					// stores/chrome.ts · awaiting in between forfeits the guarantee.
					anchorChromeShift(delta);
					if (container) observeNewAnchor(container, ensureObserver(), ref.bookSlug, ref.chapter);
					const excess = loaded.length - MAX_LOADED;
					// Pruning from the back only touches content below the viewport, so
					// no compensation is needed · the observer's hold on the anchors
					// leaving still has to be released.
					if (excess > 0) {
						unobserveTail(excess);
						loaded = loaded.slice(0, loaded.length - excess);
						// Flush before releasing the mutex, exactly as loadNext does via
						// pruneFront's own tick(). Without it the trailing checkPreload()
						// can start a second loadPrev while this slice is still pending,
						// and that one reads a scrollHeight which still includes the
						// unremoved tail · its tick() then flushes both mutations at once,
						// so its delta computes as (new chapter − pruned tail) ≈ 0 and the
						// compensation under-scrolls by a whole chapter. Svelte's
						// microtask ordering happens to save it today; that is a
						// dependency on scheduler internals, not a guarantee.
						await tick();
					}
				}
			}
		} catch (e) {
			recordFailure(ref);
			console.warn('Failed to load the previous chapter:', e);
		} finally {
			loading = false;
		}
		checkPreload();
	}

	/** Drop `count` chapters from above the viewport and pull the scroll position
	 *  up by exactly what they occupied, so the text does not jump. */
	async function pruneFront(count: number) {
		if (count <= 0 || !container || destroyed) return;
		const gen = generation;
		const sections = container.querySelectorAll<HTMLElement>(':scope > [data-chapter-section]');
		for (let i = 0; i < count && i < sections.length; i++) {
			const el = sections[i];
			// noUncheckedIndexedAccess · the loop bound already proves this, but the
			// compiler does not know it.
			if (!el) continue;
			// An IntersectionObserver holds a strong reference to every target it
			// watches, and nothing else in this feature ever unobserves. Release the
			// anchors going away with this slice.
			const anchor = el.querySelector(CHAPTER_ANCHOR_SELECTOR);
			if (anchor) observer?.unobserve(anchor);
		}
		// Measured off the document, the same way loadPrev does, rather than by
		// summing the boxes of the elements being removed. A sum cannot see layout
		// changes the removal itself causes — the surviving first chapter's heading
		// is re-tagged h1, and any future difference between the two would silently
		// desynchronise the compensation from what actually happened.
		const y = window.scrollY;
		const oldHeight = document.documentElement.scrollHeight;
		loaded = loaded.slice(count);
		await tick();
		if (destroyed || gen !== generation) return;
		// Negative: a removal shrinks the document. Applied with the same sign in
		// both places, so `y + delta` pulls the reader up and the chrome anchor
		// follows by the identical amount.
		const delta = document.documentElement.scrollHeight - oldHeight;
		window.scrollTo({ top: Math.max(0, y + delta), behavior: 'instant' });
		anchorChromeShift(delta);
	}

	/** Release the observer's hold on the last `count` chapters' anchors. Call
	 *  before the slice that drops them, while they are still in the DOM. */
	function unobserveTail(count: number) {
		if (!container) return;
		const sections = container.querySelectorAll<HTMLElement>(':scope > [data-chapter-section]');
		for (let i = Math.max(0, sections.length - count); i < sections.length; i++) {
			const el = sections[i];
			if (!el) continue;
			const anchor = el.querySelector(CHAPTER_ANCHOR_SELECTOR);
			if (anchor) observer?.unobserve(anchor);
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

	/**
	 * Keep two chapters loaded either side of the active one.
	 *
	 * Reacts to the *active chapter* changing, never to `loaded` changing: each
	 * load calls back in here once it has released the mutex, which is what
	 * cascades a multi-chapter catch-up. Reacting to `loaded` instead would
	 * recurse, since every load mutates it.
	 *
	 * This is also the only path to `loadPrev`. The scroll handler must never
	 * reach it: each prepend's compensation fires another scroll event, the
	 * handler would see the reader near the top again, and it would cascade.
	 */
	function checkPreload() {
		if (!browser || !$prefs.infiniteScroll || !scrollReady || destroyed) return;
		if (Date.now() < navCooldownUntil) return;
		const idx = loaded.findIndex((l) => l.book.slug === activeSlug && l.chapter === activeChapter);
		if (idx === -1) return;
		// Forward first · that is the direction people read. The `loadable` test is
		// what keeps the forward branch from swallowing the call: at the end of the
		// canon, or once a chapter is recorded in `failed`, `loadNext` would return
		// without ever calling back in here and the window could never grow
		// backwards again.
		if (loaded.length - 1 - idx < 2 && loadable(nextRef())) {
			loadNext();
			return;
		}
		if (idx < 2) loadPrev();
	}

	$effect(() => {
		// Tracked reads · this effect must run when the active chapter changes and
		// at no other time. untrack() keeps checkPreload's reads of `loaded` out of
		// this effect's dependencies, which would otherwise recurse.
		void activeSlug;
		void activeChapter;
		untrack(() => checkPreload());
	});

	onMount(() => {
		if (container) observeAllAnchors(container, ensureObserver());
		window.addEventListener('scroll', onScroll, { passive: true });
		scrollReady = true;
		navCooldownUntil = Date.now() + NAV_COOLDOWN_MS;
		// Appending below the fold cannot shift what is on screen, so the first
		// forward preload is safe to run on a timer. Prepends wait for the cooldown
		// armed just above · this timer is scheduled after it, so it can only fire
		// once the cooldown has elapsed.
		preloadTimer = setTimeout(() => {
			onScrollCheck();
			checkPreload();
		}, NAV_COOLDOWN_MS);
	});

	onDestroy(() => {
		destroyed = true;
		syncUrl.cancel();
		if (preloadTimer) clearTimeout(preloadTimer);
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
