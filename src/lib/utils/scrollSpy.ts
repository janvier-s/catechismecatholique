import type { Action } from 'svelte/action';
import { activeHeading } from '$lib/stores/scrollSpy';

/**
 * Track the heading currently sitting just below the sticky topbar inside the
 * given container, and publish its id to the `activeHeading` store. The
 * Sidebar reads that store to keep the matching nested entry highlighted as
 * the reader scrolls.
 *
 * Usage on any container that wraps anchor-able headings:
 *   <main use:scrollSpy>...</main>
 *
 * The action observes every `h2[id]` and `h3[id]` descendant. The active
 * heading is the topmost one that's currently within a strip just below the
 * sticky topbar (rootMargin top -90px, bottom -70%).
 */
export const scrollSpy: Action<HTMLElement> = (node) => {
	const headings = Array.from(node.querySelectorAll<HTMLElement>('h2[id], h3[id]'));
	if (headings.length === 0) return;

	const visible = new Set<string>();
	const order = headings.map((h) => h.id);

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const id = (entry.target as HTMLElement).id;
				if (entry.isIntersecting) visible.add(id);
				else visible.delete(id);
			}
			const top = order.find((id) => visible.has(id));
			activeHeading.set(top ?? null);
		},
		{ rootMargin: '-90px 0px -70% 0px' }
	);

	for (const h of headings) observer.observe(h);
	if (order[0]) activeHeading.set(order[0]);

	return {
		destroy() {
			observer.disconnect();
			activeHeading.set(null);
		}
	};
};
