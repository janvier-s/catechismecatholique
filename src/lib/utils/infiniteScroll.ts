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
