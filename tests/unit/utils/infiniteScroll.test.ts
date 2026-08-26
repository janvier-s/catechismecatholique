import { describe, it, expect } from 'vitest';
import {
	SCROLL_THRESHOLD,
	shouldLoadNext,
	shouldLoadPrev,
	chapterCrossing,
	prunableFromFront,
	prunableFromBack,
	activeAnchorIndex
} from '$lib/utils/infiniteScroll';

describe('shouldLoadNext', () => {
	it('is false near the top of a long document', () => {
		expect(shouldLoadNext(0, 800, 5000)).toBe(false);
	});

	it('is true once within the threshold of the bottom', () => {
		expect(shouldLoadNext(4000, 800, 5000)).toBe(true);
	});

	it('is false exactly at the threshold, true one pixel past it', () => {
		// 3800 + 800 === 5000 - 400
		expect(shouldLoadNext(3800, 800, 5000)).toBe(false);
		expect(shouldLoadNext(3801, 800, 5000)).toBe(true);
	});

	it('is true when the document is shorter than the viewport', () => {
		expect(shouldLoadNext(0, 800, 500)).toBe(true);
	});

	it('exposes the threshold it uses', () => {
		expect(SCROLL_THRESHOLD).toBe(400);
	});
});

describe('shouldLoadPrev', () => {
	it('is false when well below the top of the document', () => {
		expect(shouldLoadPrev(4000)).toBe(false);
	});

	it('is true once within the threshold of the top', () => {
		expect(shouldLoadPrev(300)).toBe(true);
	});

	it('is true at the very top', () => {
		expect(shouldLoadPrev(0)).toBe(true);
	});

	it('is false exactly at the threshold, true one pixel inside it', () => {
		expect(shouldLoadPrev(400)).toBe(false);
		expect(shouldLoadPrev(399)).toBe(true);
	});
});

const base = { viewportHeight: 800, bookSlug: 'genese', chapter: 3 };

describe('chapterCrossing', () => {
	it('reports entry when the anchor is intersecting the band', () => {
		expect(chapterCrossing({ ...base, isIntersecting: true, top: 120 })).toEqual({
			kind: 'enter',
			bookSlug: 'genese',
			chapter: 3
		});
	});

	it('reports a scroll-up exit when the anchor sits below the band, still on screen', () => {
		expect(chapterCrossing({ ...base, isIntersecting: false, top: 400 })).toEqual({
			kind: 'exit-up',
			bookSlug: 'genese',
			chapter: 3
		});
	});

	it('ignores an anchor scrolled off the top of the viewport', () => {
		expect(chapterCrossing({ ...base, isIntersecting: false, top: -50 })).toBeNull();
	});

	it('ignores an anchor below the fold, which is what a freshly appended one reports', () => {
		expect(chapterCrossing({ ...base, isIntersecting: false, top: 900 })).toBeNull();
	});

	it('ignores an anchor exactly at the fold', () => {
		expect(chapterCrossing({ ...base, isIntersecting: false, top: 800 })).toBeNull();
	});

	it('ignores an anchor exactly at the top edge of the viewport', () => {
		expect(chapterCrossing({ ...base, isIntersecting: false, top: 0 })).toBeNull();
	});

	it('ignores an anchor with no book slug', () => {
		expect(chapterCrossing({ ...base, bookSlug: '', isIntersecting: true, top: 10 })).toBeNull();
	});

	it('ignores an unparseable chapter number', () => {
		expect(chapterCrossing({ ...base, chapter: 0, isIntersecting: true, top: 10 })).toBeNull();
	});
});

describe('prunableFromFront', () => {
	// Bottoms are viewport coordinates: <= 0 means fully scrolled past.
	it('drops nothing when the first section is still on screen', () => {
		expect(prunableFromFront(2, [200, 900, 1600])).toBe(0);
	});

	it('drops the sections that have scrolled entirely above the fold', () => {
		expect(prunableFromFront(2, [-500, -100, 700])).toBe(2);
	});

	it('stops at the first section still intersecting, even with budget left', () => {
		expect(prunableFromFront(3, [-500, 50, -100])).toBe(1);
	});

	it('never exceeds the requested count', () => {
		expect(prunableFromFront(1, [-900, -500, -100])).toBe(1);
	});

	it('treats a section ending exactly at the fold as still visible', () => {
		// bottom === 0 is the boundary · not > 0, so it is prunable.
		expect(prunableFromFront(1, [0])).toBe(1);
		expect(prunableFromFront(1, [1])).toBe(0);
	});

	it('is a no-op on an empty document or a zero budget', () => {
		expect(prunableFromFront(3, [])).toBe(0);
		expect(prunableFromFront(0, [-500, -100])).toBe(0);
	});
});

describe('prunableFromBack', () => {
	// Tops are viewport coordinates: >= innerHeight means below the fold.
	it('drops nothing when the last section is on screen', () => {
		expect(prunableFromBack(2, [-400, 100, 600], 800)).toBe(0);
	});

	it('drops trailing sections that start below the fold', () => {
		expect(prunableFromBack(2, [-400, 900, 1700], 800)).toBe(2);
	});

	it('stops at the first trailing section that is visible', () => {
		expect(prunableFromBack(3, [-400, 500, 1700], 800)).toBe(1);
	});

	it('treats a section starting exactly at the fold as prunable', () => {
		expect(prunableFromBack(1, [0, 800], 800)).toBe(1);
		expect(prunableFromBack(1, [0, 799], 800)).toBe(0);
	});

	it('never exceeds the requested count', () => {
		expect(prunableFromBack(1, [900, 1700, 2500], 800)).toBe(1);
	});

	it('is a no-op on an empty document or a zero budget', () => {
		expect(prunableFromBack(3, [], 800)).toBe(0);
		expect(prunableFromBack(0, [900, 1700], 800)).toBe(0);
	});
});

describe('activeAnchorIndex', () => {
	// The activation line sits at ACTIVE_BAND_RATIO (0.3) of the viewport, so
	// 240 for an 800px one.
	it('returns -1 when every anchor is still below the line', () => {
		expect(activeAnchorIndex([300, 1100], 800)).toBe(-1);
	});

	it('picks the last anchor at or above the line', () => {
		expect(activeAnchorIndex([-900, -100, 700], 800)).toBe(1);
	});

	it('includes an anchor sitting exactly on the line', () => {
		expect(activeAnchorIndex([240], 800)).toBe(0);
		expect(activeAnchorIndex([241], 800)).toBe(-1);
	});

	it('survives a jump that carries an anchor clean past the band', () => {
		// The case the IntersectionObserver misses: no anchor is inside the band
		// at this frame, yet the reader is plainly on the third chapter.
		expect(activeAnchorIndex([-3000, -2000, -1000, 900], 800)).toBe(2);
	});

	it('returns -1 for an empty document', () => {
		expect(activeAnchorIndex([], 800)).toBe(-1);
	});
});
