import type { Action } from 'svelte/action';
import { activeHeading } from '$lib/stores/scrollSpy';

/**
 * Track the heading the reader is currently inside, and publish its id to
 * `activeHeading` so the Sidebar can keep its matching entry highlighted.
 *
 * Usage on any container wrapping anchor-able headings:
 *   <main use:scrollSpy>...</main>
 *
 * The earlier IntersectionObserver approach only marked a heading active
 * while it was physically intersecting a thin strip below the topbar — once
 * the heading scrolled past, the active highlight blanked out even though
 * the reader was still inside that section. This implementation instead
 * tracks the most-recently-passed heading: the LAST `h2[id]` / `h3[id]`
 * whose top edge is at or above a small offset from the top of the
 * viewport. While reading any paragraph between two headings, the previous
 * heading stays highlighted.
 */
const ACTIVE_OFFSET = 100; // px from viewport top

export const scrollSpy: Action<HTMLElement> = (node) => {
	const headings = Array.from(node.querySelectorAll<HTMLElement>('h2[id], h3[id], h4[id]'));
	if (headings.length === 0) return;

	let raf = 0;

	function update() {
		raf = 0;
		let active: string | null = null;
		for (const h of headings) {
			const top = h.getBoundingClientRect().top;
			if (top <= ACTIVE_OFFSET) active = h.id;
			else break;
		}
		// Fall back to the first heading when the page is at the very top
		// (no heading has crossed the threshold yet).
		if (!active && headings[0]) active = headings[0].id;
		activeHeading.set(active);
	}

	function schedule() {
		if (raf) return;
		raf = requestAnimationFrame(update);
	}

	update();
	window.addEventListener('scroll', schedule, { passive: true });
	window.addEventListener('resize', schedule);

	return {
		destroy() {
			if (raf) cancelAnimationFrame(raf);
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			activeHeading.set(null);
		}
	};
};
