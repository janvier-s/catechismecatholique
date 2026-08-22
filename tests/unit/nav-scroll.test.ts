import { describe, it, expect } from 'vitest';
import { expandedBookScrollTop, type NavScrollMetrics } from '$lib/utils/nav-scroll';

/** Container occupying y=100..695 on screen, currently scrolled to 400. */
const base: NavScrollMetrics = {
	scrollTop: 400,
	containerTop: 100,
	containerHeight: 595,
	headerTop: 300,
	gridBottom: 500,
	blockHeight: 200
};

describe('expandedBookScrollTop', () => {
	it('does not scroll when the expanded book already fits on screen', () => {
		expect(expandedBookScrollTop(base)).toBeNull();
	});

	it('pulls up just enough when a fitting grid hangs below the fold', () => {
		// Grid bottom is 60px past the container bottom (695).
		const m = { ...base, gridBottom: 755 };
		expect(expandedBookScrollTop(m)).toBe(460);
	});

	it('aligns the book header to the top when the block is taller than the container', () => {
		// Psalms: 150 chapters, 835px of grid inside a 595px container.
		const m: NavScrollMetrics = {
			scrollTop: 1000,
			containerTop: 100,
			containerHeight: 595,
			headerTop: 340,
			gridBottom: 1215,
			blockHeight: 880
		};
		// header sits 240px below the container top, so scroll down by 240.
		expect(expandedBookScrollTop(m)).toBe(1240);
	});

	it('prefers header alignment over bottom alignment for an oversized block', () => {
		const m: NavScrollMetrics = { ...base, blockHeight: 900, gridBottom: 2000 };
		// Bottom alignment would jump to the last chapter; header wins.
		expect(expandedBookScrollTop(m)).toBe(base.scrollTop + (base.headerTop - base.containerTop));
	});

	it('scrolls back up when the header sits above the fold', () => {
		const m = { ...base, headerTop: 40 };
		expect(expandedBookScrollTop(m)).toBe(340);
	});

	it('treats a block exactly the container height as fitting', () => {
		const m = { ...base, blockHeight: 595, gridBottom: 695 };
		expect(expandedBookScrollTop(m)).toBeNull();
	});

	it('never returns a negative scroll position', () => {
		const m: NavScrollMetrics = {
			scrollTop: 10,
			containerTop: 100,
			containerHeight: 595,
			headerTop: 40,
			gridBottom: 300,
			blockHeight: 200
		};
		expect(expandedBookScrollTop(m)).toBe(0);
	});
});
