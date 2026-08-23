import { describe, it, expect } from 'vitest';
import { SCROLL_THRESHOLD, shouldLoadNext, chapterCrossing } from '$lib/utils/infiniteScroll';

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
