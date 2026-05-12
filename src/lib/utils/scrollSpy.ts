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
 * while it was physically intersecting a thin strip below the topbar · once
 * the heading scrolled past, the active highlight blanked out even though
 * the reader was still inside that section. This implementation instead
 * tracks the most-recently-passed heading: the LAST `h2[id]` / `h3[id]`
 * whose top edge is at or above the activation line. The line sits at
 * roughly the upper third of the viewport so a heading lights up in the
 * sidebar as soon as it scrolls into the comfortable reading band · not
 * only when it has reached the very top.
 */
const ACTIVE_OFFSET_RATIO = 0.33;

export const scrollSpy: Action<HTMLElement> = (node) => {
	const headings = Array.from(
		node.querySelectorAll<HTMLElement>('h2[id], h3[id], h4[id], aside[id^="en-bref-"]')
	);
	if (headings.length === 0) return;

	let raf = 0;

	function update() {
		raf = 0;
		const activationLine = window.innerHeight * ACTIVE_OFFSET_RATIO;
		let active: string | null = null;
		for (const h of headings) {
			const top = h.getBoundingClientRect().top;
			if (top <= activationLine) active = h.id;
			else break;
		}
		// Fall back to the first heading when the page is at the very top
		// (no heading has crossed the threshold yet).
		if (!active && headings[0]) active = headings[0].id;
		activeHeading.set(active ? { pathname: location.pathname, id: active } : null);
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
