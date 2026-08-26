/** Distance from the bottom of the document at which the next chapter loads. */
export const SCROLL_THRESHOLD = 400;

/** Top fraction of the viewport treated as the "reading" band. Shared by the
 *  IntersectionObserver's `rootMargin` below and BibleReader's position-based
 *  fallback, so the two can never independently drift onto different lines. */
export const ACTIVE_BAND_RATIO = 0.3;

/** True when the reader is within `SCROLL_THRESHOLD` of the document's end. */
export function shouldLoadNext(scrollY: number, innerHeight: number, docHeight: number): boolean {
	return scrollY + innerHeight > docHeight - SCROLL_THRESHOLD;
}

/** True when the reader is within `SCROLL_THRESHOLD` of the document's start.
 *  Mirrors `shouldLoadNext` · without it, a reader who scrolls up to the top of
 *  the loaded window has no scroll-driven path to the chapter before it, and
 *  depends on `checkPreload`, which reacts only to the active chapter changing
 *  and so cannot see them arrive. */
export function shouldLoadPrev(scrollY: number): boolean {
	return scrollY < SCROLL_THRESHOLD;
}

export interface Crossing {
	kind: 'enter' | 'exit-up';
	bookSlug: string;
	chapter: number;
}

export interface CrossingInput {
	isIntersecting: boolean;
	/** The anchor's `boundingClientRect.top`, in viewport coordinates. */
	top: number;
	viewportHeight: number;
	bookSlug: string;
	chapter: number;
}

/**
 * Decide what an observation of a chapter anchor means, given no DOM.
 *
 * The observer's root margin puts the activation band across the top 30% of
 * the viewport, so an intersecting anchor means that chapter just became the
 * one being read. A *non*-intersecting anchor is ambiguous, and the `top`
 * bounds are what disambiguate it:
 *
 * - `top <= 0` · scrolled off the top. The reader is below this chapter and
 *   moving away from it, so there is nothing to activate.
 * - `top >= viewportHeight` · below the fold. This is what a freshly appended
 *   anchor reports on its very first observation, and treating it as a
 *   crossing would activate the wrong chapter the instant one is loaded.
 * - in between · genuinely on screen and below the band, which only happens
 *   when the reader is scrolling up past it. The caller should then activate
 *   the chapter loaded immediately before this one.
 */
export function chapterCrossing(input: CrossingInput): Crossing | null {
	const { isIntersecting, top, viewportHeight, bookSlug, chapter } = input;
	if (!bookSlug || !Number.isFinite(chapter) || chapter <= 0) return null;
	if (isIntersecting) return { kind: 'enter', bookSlug, chapter };
	if (top > 0 && top < viewportHeight) return { kind: 'exit-up', bookSlug, chapter };
	return null;
}

/**
 * How many of the leading `count` sections can go without taking any text off
 * the reader's screen · everything before the first one still intersecting the
 * viewport. Takes each section's `boundingClientRect.bottom`, in document
 * order.
 *
 * This is what lets BibleReader's front-prune compensation be exact. Removing
 * only content above the fold means the document shrinks by precisely the
 * distance the surviving text moves up, and since the pixels above the fold are
 * exactly `scrollY` and no more, the remaining document is still at least one
 * viewport tall, so `scrollHeight` never bottoms out on its own floor and
 * under-reports the delta.
 *
 * Stopping early is always safe: the window simply stays above its cap until
 * the reader has scrolled on.
 */
export function prunableFromFront(count: number, bottoms: number[]): number {
	let n = 0;
	while (n < count && n < bottoms.length) {
		const bottom = bottoms[n];
		// noUncheckedIndexedAccess · the loop bound already proves this, but the
		// compiler does not know it.
		if (bottom === undefined || bottom > 0) break;
		n++;
	}
	return n;
}

/**
 * The same rule at the other end: how many trailing sections start below the
 * fold, and so can be dropped without moving anything the reader can see or
 * shrinking the document out from under `scrollY`. Takes each section's
 * `boundingClientRect.top`, in document order.
 */
export function prunableFromBack(count: number, tops: number[], viewportHeight: number): number {
	let n = 0;
	while (n < count && n < tops.length) {
		const top = tops[tops.length - 1 - n];
		if (top === undefined || top < viewportHeight) break;
		n++;
	}
	return n;
}

/**
 * Index of the chapter anchor the reader is on, by position alone, or -1 when
 * every anchor is still below the activation line. Takes each anchor's
 * `boundingClientRect.top`, in document order.
 *
 * The position-based counterpart to `chapterCrossing`, and the reason
 * BibleReader recomputes it on every scroll tick. The observer only reports a
 * chapter when an anchor's intersection state *changes* between two
 * consecutive frames. A scroll step bigger than the activation band
 * (`ACTIVE_BAND_RATIO` · PageDown, spacebar, a trackpad fling) can carry an
 * anchor from below the band to above it, or the reverse, without the band
 * ever containing it at a sampled frame, so no crossing is ever delivered and
 * the active chapter silently stops following the reader. `scrollSpy.ts`
 * abandoned IntersectionObserver for headings for exactly this reason; this
 * applies the same rule geometrically, so it cannot miss a jump: the last
 * anchor at or above the activation line is the chapter being read, whatever
 * path the reader took to get there.
 */
export function activeAnchorIndex(tops: number[], viewportHeight: number): number {
	const line = viewportHeight * ACTIVE_BAND_RATIO;
	let candidate = -1;
	for (let i = 0; i < tops.length; i++) {
		const top = tops[i];
		if (top === undefined || top > line) break;
		candidate = i;
	}
	return candidate;
}

export const CHAPTER_ANCHOR_SELECTOR = '[data-chapter-anchor]';

/**
 * Watch every chapter anchor and report crossings. A thin DOM adapter over
 * `chapterCrossing`, holding no logic of its own.
 */
export function createChapterObserver(onCrossing: (c: Crossing) => void): IntersectionObserver {
	return new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const el = entry.target as HTMLElement;
				const crossing = chapterCrossing({
					isIntersecting: entry.isIntersecting,
					top: entry.boundingClientRect.top,
					viewportHeight: window.innerHeight,
					bookSlug: el.dataset.bookSlug ?? '',
					chapter: parseInt(el.dataset.chapterNum ?? '0', 10)
				});
				if (crossing) onCrossing(crossing);
			}
		},
		{ rootMargin: `0px 0px -${Math.round((1 - ACTIVE_BAND_RATIO) * 100)}% 0px`, threshold: 0 }
	);
}

/** Observe every chapter anchor currently inside `container`. */
export function observeAllAnchors(container: HTMLElement, observer: IntersectionObserver): void {
	container.querySelectorAll(CHAPTER_ANCHOR_SELECTOR).forEach((el) => observer.observe(el));
}

/** Observe one newly rendered chapter anchor. Call after `tick()`. */
export function observeNewAnchor(
	container: HTMLElement,
	observer: IntersectionObserver,
	bookSlug: string,
	chapter: number
): void {
	const el = container.querySelector(
		`${CHAPTER_ANCHOR_SELECTOR}[data-book-slug="${bookSlug}"][data-chapter-num="${chapter}"]`
	);
	if (el) observer.observe(el);
}
