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
		shouldLoadPrev,
		createChapterObserver,
		observeAllAnchors,
		observeNewAnchor,
		prunableFromFront,
		prunableFromBack,
		activeAnchorIndex,
		CHAPTER_ANCHOR_SELECTOR,
		type Crossing
	} from '$lib/utils/infiniteScroll';
	import { createFailureLog, refKey } from '$lib/utils/chapterRetry';
	import { prefs } from '$lib/stores/prefs';
	import { anchorChromeShift } from '$lib/stores/chrome';

	let {
		book,
		chapter,
		verses,
		verseIdx,
		totalChapters,
		sectionsByBook = {},
		chapterCounts = {},
		paragraphs = null
	}: {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		verseIdx: BibleVerseIndex;
		totalChapters: number;
		sectionsByBook?: NclSectionMap;
		chapterCounts?: Record<string, number>;
		paragraphs?: NclChapterBlocks | null;
	} = $props();

	const studyMode = $derived($prefs.bibleStudyMode);

	interface LoadedChapter {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		paragraphs: NclChapterBlocks | null;
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
	const activeTotalChapters = $derived(chapterCounts[activeBook.usfx] ?? totalChapters);

	// The footer nav only renders with infinite scroll off. That is true for
	// the whole component's life when the pref started off, but a reader can
	// also toggle it off mid-scroll with several chapters already appended and
	// `activeChapter` well past the entry props · derived off `active*`, not
	// the route props, so the links (and the label below) point at the
	// chapter actually on screen either way.
	const prevHref = $derived(
		activeChapter > 1 ? `/bible/${activeBook.slug}/${activeChapter - 1}` : null
	);
	const nextHref = $derived(
		activeChapter < activeTotalChapters ? `/bible/${activeBook.slug}/${activeChapter + 1}` : null
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
			// chapter grid would otherwise arrive with the cooldown long expired,
			// and the prepend for Genèse 8 would go out in the same frame as the
			// router's scroll reset for the new route rather than safely after it.
			// See NAV_COOLDOWN_MS · clearing that race is the whole job.
			navCooldownUntil = Date.now() + NAV_COOLDOWN_MS;
			// Re-armed alongside the cooldown above, for the same reason. Without
			// this, a reader who navigates in-app to a chapter short enough to fit
			// inside the viewport (Psaume 117, any single-chapter book) never
			// triggers a scroll event, and `onMount`'s timer already fired once and
			// is gone: nothing would ever call checkPreload again for that chapter,
			// and infinite scroll would silently stop growing from that navigation
			// on.
			armPreloadTimer();
			// The reused component's own scrollY is about to be left behind by the
			// DOM shrinking to just `fresh` · the first post-navigation scroll
			// check (often the browser's own clamp of that stale position, not the
			// reader) must land as a fresh baseline, not a comparison. See
			// scrollBaselineSet's declaration.
			scrollBaselineSet = false;
			// Any navigation is a fresh start. No record survives it, so a reader
			// who hit a flaky connection at a book boundary is never stuck with a
			// chapter that stays unreachable for the life of the component ·
			// re-deriving a structurally absent ref costs one cache-hit lookup.
			clearFailures();
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

	/** scrollY as of the previous onScrollCheck tick, and whether it is safe to
	 *  compare against yet. An in-app navigation reuses this component and does
	 *  not reset window.scrollY, so the moment `loaded` collapses to the new
	 *  entry chapter, the document shrinks out from under a scroll position the
	 *  reader never chose · the browser clamps it, firing a genuine scroll event
	 *  that looks identical to the reader having scrolled up. Requiring one
	 *  scroll-position sample since the last landing, before trusting a drop as
	 *  real upward scrolling, is what tells the two apart without a time-based
	 *  guard that would just bring back the delay this exists to remove. */
	let lastScrollY = 0;
	let scrollBaselineSet = false;

	/** Chapters above and below the reader stay in the DOM; beyond this many, the
	 *  far end is pruned. Five covers a fast scroll in either direction without
	 *  letting a long book accumulate unbounded. */
	const MAX_LOADED = 5;

	/** How long after an arrival the rolling preload stays out of the way.
	 *
	 *  Short on purpose, and the shortness is the point. A reader lands with
	 *  `scrollY` already at 0, so wheeling *up* dispatches no scroll event at
	 *  all · `onScrollCheck`'s backward branch is unreachable there, and until
	 *  this gate opens the previous chapter is not on the page, so upward input
	 *  moves nothing whatsoever. At the two seconds this used to hold, that read
	 *  as the reader having to scroll a long way, or wait, before the previous
	 *  chapter would come.
	 *
	 *  What the gate is actually for is the browser's own scroll restoration,
	 *  which lands its `scrollTo` a frame or two after mount (measured at
	 *  40-55ms in both dev and preview builds) · a prepend racing it would
	 *  restore the reader to an offset that now points at different text. The
	 *  prepend itself is invisible: `loadPrev` compensates by exactly the height
	 *  it adds. So this only has to clear restoration, not the reader's
	 *  attention span, and a margin of several times the measured figure is
	 *  still far below anything a reader can perceive. */
	const NAV_COOLDOWN_MS = 300;

	let navCooldownUntil = 0;
	let preloadTimer: ReturnType<typeof setTimeout> | null = null;

	/** Which refs are absent or have failed, and how long each is held off for.
	 *  Non-reactive · read only from the imperative load paths, never rendered,
	 *  so the reactive versions' sources would be pure overhead
	 *  (ParagraphActions.svelte takes the same exemption). `loadFailed` below is
	 *  the one piece of it the markup needs. */
	const failures = createFailureLog();

	let retryTimer: ReturnType<typeof setTimeout> | null = null;

	/** True once the chapter after the window has spent its whole budget. Drives
	 *  the notice at the end of the document · without it the page simply stops
	 *  growing and there is no footer nav to explain why or to leave by. Mirrors
	 *  `failures.exhausted` into reactive state, since the log is a plain object. */
	let loadFailed = $state(false);

	/** Forget everything recorded against the failing refs. Called on a route
	 *  change and by the reader's own Réessayer, both of which are fresh intent. */
	function clearFailures() {
		failures.clearAll();
		if (retryTimer) clearTimeout(retryTimer);
		retryTimer = null;
		loadFailed = false;
	}

	/** Record a throw against `ref`'s attempt budget, hold it off for the backoff,
	 *  and come back on our own once that expires. Coming back matters: a reader
	 *  parked at the end of the document generates no scroll events, so nothing
	 *  else would ever call in again and the recovery would depend on them
	 *  fidgeting. */
	function recordFailure(ref: ChapterRef) {
		const wait = failures.record(refKey(ref), Date.now());
		loadFailed = failures.exhausted;
		if (wait === null) return;
		if (retryTimer) clearTimeout(retryTimer);
		retryTimer = setTimeout(() => {
			retryTimer = null;
			if (destroyed) return;
			onScrollCheck();
			checkPreload();
		}, wait);
	}

	/** Clear one ref's failure record after it loads, then re-ask the log whether
	 *  anything is still exhausted · see FailureLog.exhausted for why this is a
	 *  question rather than a flag. */
	function clearFailure(key: string) {
		failures.clearOne(key);
		loadFailed = failures.exhausted;
	}

	/** Give the failed ref its budget back and go again, from the reader's own
	 *  click. */
	function retryNow() {
		clearFailures();
		onScrollCheck();
		checkPreload();
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
		return failures.eligible(refKey(ref), Date.now());
	}

	async function loadNext() {
		if (loading || !$prefs.infiniteScroll) return;
		const ref = nextRef();
		if (!loadable(ref)) return;

		loading = true;
		const gen = generation;
		try {
			const entry = await fetchChapter(ref);
			if (!entry) failures.markMissing(refKey(ref));
			if (entry && !destroyed && gen === generation) {
				clearFailure(refKey(ref));
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
			if (!entry) failures.markMissing(refKey(ref));
			if (entry && !destroyed && gen === generation) {
				clearFailure(refKey(ref));
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
					// Pruning from the back needs no compensation, and `prunableFromBack`
					// is what makes that true rather than assumed: every chapter it
					// returns starts below the fold, so the document cannot shrink past
					// `scrollY + innerHeight` and the browser has nothing to clamp. An
					// unnoticed clamp would be banked by the chrome reducer as upward
					// travel and could pop the bars. The observer's hold on the anchors
					// leaving still has to be released.
					const drop = prunableFromBack(
						excess,
						sectionEls().map((el) => el.getBoundingClientRect().top),
						window.innerHeight
					);
					if (drop > 0) {
						unobserveTail(drop);
						loaded = loaded.slice(0, loaded.length - drop);
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

	/** The rendered chapter sections, in document order. Empty before mount. */
	function sectionEls(): HTMLElement[] {
		if (!container) return [];
		return [...container.querySelectorAll<HTMLElement>(':scope > [data-chapter-section]')];
	}

	/** Drop up to `count` chapters from above the viewport and pull the scroll
	 *  position up by exactly what they occupied, so the text does not jump. */
	async function pruneFront(count: number) {
		if (count <= 0 || !container || destroyed) return;
		const gen = generation;
		const sections = sectionEls();
		const drop = prunableFromFront(
			count,
			sections.map((el) => el.getBoundingClientRect().bottom)
		);
		if (drop === 0) return;
		for (let i = 0; i < drop; i++) {
			const el = sections[i];
			if (!el) continue;
			// An IntersectionObserver holds a strong reference to every target it
			// watches, and nothing else in this feature ever unobserves. Release the
			// anchors going away with this slice.
			const anchor = el.querySelector(CHAPTER_ANCHOR_SELECTOR);
			if (anchor) observer?.unobserve(anchor);
		}
		// Measured off the document, the same way loadPrev does, rather than by
		// summing the boxes of the elements being removed. A sum cannot see layout
		// changes the removal itself causes: the surviving first chapter's heading
		// is re-tagged h1, and any future difference between the two would silently
		// desynchronise the compensation from what actually happened.
		const y = window.scrollY;
		const oldHeight = document.documentElement.scrollHeight;
		loaded = loaded.slice(drop);
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
		const sections = sectionEls();
		for (let i = Math.max(0, sections.length - count); i < sections.length; i++) {
			const el = sections[i];
			if (!el) continue;
			const anchor = el.querySelector(CHAPTER_ANCHOR_SELECTOR);
			if (anchor) observer?.unobserve(anchor);
		}
	}

	/**
	 * Position-based fallback for the active chapter, recomputed on every scroll
	 * tick alongside the IntersectionObserver. A thin DOM adapter over
	 * `activeAnchorIndex`, which holds the reasoning and the rule.
	 *
	 * Goes through `setActive`, so the debounce and generation guard still
	 * apply, and calling it every tick is harmless · setActive no-ops when the
	 * slug/chapter are already current.
	 */
	function activeFromPosition() {
		if (!container) return;
		const anchors = [...container.querySelectorAll<HTMLElement>(CHAPTER_ANCHOR_SELECTOR)];
		const idx = activeAnchorIndex(
			anchors.map((el) => el.getBoundingClientRect().top),
			window.innerHeight
		);
		const candidate = idx === -1 ? undefined : anchors[idx];
		if (!candidate) return;
		const bookSlug = candidate.dataset.bookSlug;
		const chapterNum = parseInt(candidate.dataset.chapterNum ?? '', 10);
		if (bookSlug && Number.isFinite(chapterNum) && chapterNum > 0) setActive(bookSlug, chapterNum);
	}

	function onScrollCheck() {
		if (!browser || !$prefs.infiniteScroll || !scrollReady) return;
		activeFromPosition();
		const y = window.scrollY;
		if (shouldLoadNext(y, window.innerHeight, document.documentElement.scrollHeight)) {
			loadNext();
		} else if (scrollBaselineSet && y < lastScrollY && shouldLoadPrev(y)) {
			// Mirrors the loadNext() branch above, for a reader who has scrolled
			// up to the top of the loaded window. `checkPreload` reacts to the
			// *active chapter* changing, so it cannot help here: arriving at the
			// top of the first loaded chapter changes no crossing, and the window
			// would sit there refusing to grow until the reader moved enough to
			// activate something. Note this is unreachable at a fresh landing,
			// where scrollY is already 0 and wheeling up dispatches no event at
			// all · that case belongs to the arrival preload, see
			// NAV_COOLDOWN_MS.
			// loadPrev's compensation moves scrollY well past SCROLL_THRESHOLD,
			// so this cannot cascade the way calling checkPreload here would.
			// `y < lastScrollY` requires a genuine upward move, not just a low
			// position · see scrollBaselineSet's comment for why that matters.
			loadPrev();
		}
		lastScrollY = y;
		scrollBaselineSet = true;
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
		// Also called here, not only from onScrollCheck: `onCrossing`'s exit-up
		// branch treats ANY on-screen, non-intersecting anchor as a genuine
		// upward exit, but `observeNewAnchor`'s first observation of a freshly
		// appended chapter reports exactly that shape whenever the cascade from
		// the onMount preload timer appends several short chapters that
		// together still fit under one viewport, with no scrolling involved.
		// checkPreload runs at the end of every load in that cascade, so
		// recomputing here catches up on whatever `onCrossing` got wrong before
		// the reader has done anything.
		activeFromPosition();
		if (Date.now() < navCooldownUntil) return;
		const idx = loaded.findIndex((l) => l.book.slug === activeSlug && l.chapter === activeChapter);
		if (idx === -1) return;
		// Forward first · that is the direction people read. The `loadable` test is
		// what keeps the forward branch from swallowing the call: at the end of the
		// canon, or once a chapter is recorded in `missing` or has spent its
		// attempts, `loadNext` would return without ever calling back in here and
		// the window could never grow backwards again.
		if (loaded.length - 1 - idx < 2 && loadable(nextRef())) {
			loadNext();
			return;
		}
		// Never pull the window backwards while the reader is at the end of the
		// document, however far from the end of the *window* the active chapter
		// looks. `activeFromPosition` keeps `activeChapter` correct across a
		// scroll step bigger than the observer's activation band, which is what
		// used to leave `idx` stuck near the start of `loaded` while the reader
		// kept scrolling down: `idx < 2` became true at the bottom of the
		// document, and the prepend that followed tail-pruned exactly the chapter
		// the append just added, the two loaders trading one chapter forever
		// while the page stopped growing, with no footer nav to leave by. This
		// check is now belt and braces for the gap between a jump landing and the
		// next scroll tick recomputing the position, rather than the only thing
		// standing between here and that loop. Verified against a viewport-step
		// descent from /bible/2-jean/1.
		if (shouldLoadNext(window.scrollY, window.innerHeight, document.documentElement.scrollHeight))
			return;
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

	/** Appending below the fold cannot shift what is on screen, so the first
	 *  forward preload is always safe to run on a timer rather than waiting on a
	 *  scroll event that a chapter shorter than the viewport never fires. Fires
	 *  once the cooldown armed alongside every call site has elapsed. Called
	 *  from `onMount` and, again, from the reset effect on every subsequent
	 *  in-app navigation · see the comment there for why the second call site
	 *  exists. */
	function armPreloadTimer() {
		if (preloadTimer) clearTimeout(preloadTimer);
		preloadTimer = setTimeout(() => {
			preloadTimer = null;
			onScrollCheck();
			checkPreload();
		}, NAV_COOLDOWN_MS);
	}

	onMount(() => {
		if (container) observeAllAnchors(container, ensureObserver());
		window.addEventListener('scroll', onScroll, { passive: true });
		scrollReady = true;
		navCooldownUntil = Date.now() + NAV_COOLDOWN_MS;
		armPreloadTimer();
	});

	onDestroy(() => {
		destroyed = true;
		syncUrl.cancel();
		if (preloadTimer) clearTimeout(preloadTimer);
		if (retryTimer) clearTimeout(retryTimer);
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

<!-- Chapter navigation bar · sticky below the global TopBar. Always visible:
     it's the primary way to jump to an arbitrary book/chapter, not something
     to toggle off · hideChapterNav instead gates the in-article prev/next
     strip (ChapterPrevNext, rendered once per chapter inside BibleChapter). -->
<ChapterNavBar
	book={activeBook}
	chapter={activeChapter}
	totalChapters={activeTotalChapters}
	{chapterCounts}
/>

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
			totalChapters={chapterCounts[item.book.usfx] ?? totalChapters}
			{chapterCounts}
			{verseIdx}
			{studyMode}
			headingLevel={i === 0 ? 'h1' : 'h2'}
		/>
	{/each}

	<!-- With infinite scroll on there is no footer nav, so a load that has given
	     up leaves a page that simply stops growing and says nothing. This is the
	     only thing standing between the reader and a dead end. -->
	{#if $prefs.infiniteScroll && loadFailed}
		<p class="load-failed font-ui text-sm text-subtle" role="status">
			La suite n'a pas pu être chargée.
			<button type="button" class="text-accent hover:underline" onclick={retryNow}>Réessayer</button
			>
		</p>
	{/if}

	{#if !$prefs.infiniteScroll}
		<nav
			class="mt-16 pt-8 border-t border-border flex justify-between font-ui text-sm"
			aria-label="Chapitre précédent ou suivant"
		>
			{#if prevHref}
				<a href={prevHref} class="text-accent hover:underline whitespace-nowrap"
					>← Chapitre {activeChapter - 1}</a
				>
			{:else}<span></span>{/if}
			{#if nextHref}
				<a href={nextHref} class="text-accent hover:underline whitespace-nowrap"
					>Chapitre {activeChapter + 1} →</a
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
	.load-failed {
		margin-top: 4rem;
		padding-top: 2rem;
		border-top: 1px solid var(--color-border);
		text-align: center;
	}
</style>
