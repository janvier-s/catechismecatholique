import { readable } from 'svelte/store';
import { browser } from '$app/environment';

/** Scroll depth below which the bars are always shown, so the top of a chapter
 *  never opens with its header already tucked away. */
export const HIDE_AFTER = 100;

/** Cumulative upward scroll needed to bring the bars back. */
export const REVEAL_AFTER_UP = 120;

export interface ChromeScrollState {
	/** Last observed scroll position, clamped to >= 0. */
	lastY: number;
	/** Upward distance travelled since the last direction flip or reveal. */
	upDistance: number;
	hidden: boolean;
}

export function initialChromeState(y = 0): ChromeScrollState {
	return { lastY: Math.max(0, y), upDistance: 0, hidden: false };
}

/**
 * Pure reducer mapping an absolute scroll position onto the next bar state.
 * Kept free of DOM access so the behaviour can be unit-tested directly.
 *
 * The comparison is always against the last decision anchor and a cumulative
 * upward total, never a frame-to-frame delta. That is what stops small scroll
 * jitter from flickering the bars.
 */
export function nextChromeState(state: ChromeScrollState, rawY: number): ChromeScrollState {
	// iOS rubber-banding reports negative positions past the top of the document.
	const y = Math.max(0, rawY);

	if (y <= HIDE_AFTER) return { lastY: y, upDistance: 0, hidden: false };

	if (y > state.lastY) return { lastY: y, upDistance: 0, hidden: true };

	if (y < state.lastY) {
		const upDistance = state.upDistance + (state.lastY - y);
		if (upDistance >= REVEAL_AFTER_UP) return { lastY: y, upDistance: 0, hidden: false };
		return { lastY: y, upDistance, hidden: state.hidden };
	}

	return { ...state, lastY: y };
}

/**
 * Re-anchor after the document shifted underneath the reader, which is what an
 * infinite-scroll prepend or prune compensation does. `hidden` and `upDistance`
 * are left exactly as they were: the page moved, the reader did not scroll, so
 * no decision should change.
 */
export function shiftChromeAnchor(state: ChromeScrollState, delta: number): ChromeScrollState {
	return { ...state, lastY: Math.max(0, state.lastY + delta) };
}

// ── Store wiring ─────────────────────────────────────────────────────────────

let state = initialChromeState(0);
let frame = 0;
let publish: ((hidden: boolean) => void) | null = null;

/** Sources currently forcing the bars to stay put, keyed so overlapping
 *  suspenders (the prefs popover + the nav drawer) cannot untoggle each other. */
const suspenders = new Set<string>();

function currentY(): number {
	return browser ? window.scrollY : 0;
}

function resetState() {
	state = initialChromeState(currentY());
	publish?.(false);
}

function onScroll() {
	if (suspenders.size > 0) return;
	if (frame) return;
	frame = requestAnimationFrame(() => {
		frame = 0;
		if (suspenders.size > 0) return;
		state = nextChromeState(state, window.scrollY);
		publish?.(state.hidden);
	});
}

/** True when the bars should be translated out of view. */
export const chromeHidden = readable(false, (set) => {
	publish = set;
	if (!browser) return;

	state = initialChromeState(window.scrollY);
	window.addEventListener('scroll', onScroll, { passive: true });

	return () => {
		window.removeEventListener('scroll', onScroll);
		if (frame) cancelAnimationFrame(frame);
		frame = 0;
		publish = null;
		state = initialChromeState(0);
		set(false);
	};
});

/**
 * Hold the bars in view while `key` is active. Used by overlays that anchor to
 * `--topbar-height` (the prefs popover, the nav drawer), which would otherwise
 * hang over a gap once the header transformed away.
 */
export function suspendChrome(key: string, active: boolean) {
	if (active) suspenders.add(key);
	else suspenders.delete(key);
	// Re-baseline either way, so releasing a suspender does not immediately
	// re-hide from a stale position recorded before the overlay opened.
	resetState();
}

/** Force the bars back into view, e.g. on navigation or when focus enters one. */
export function revealChrome() {
	resetState();
}

/**
 * Tell the store that `delta` pixels appeared above (positive) or were removed
 * from above (negative) the viewport, and that the accompanying `scrollTo` is
 * compensation rather than intent.
 *
 * Call this synchronously right after the `scrollTo`. The browser dispatches
 * the resulting scroll event afterwards, and `onScroll` reads `window.scrollY`
 * inside a `requestAnimationFrame` rather than at event time · so by the time
 * any frame runs, position and anchor have both moved by `delta` and the
 * reducer sees no travel at all.
 *
 * Deliberately does not publish: unlike `suspendChrome` and `revealChrome`,
 * which reset to visible, this must not change what the bars are doing.
 */
export function anchorChromeShift(delta: number) {
	if (!delta) return;
	state = shiftChromeAnchor(state, delta);
}
