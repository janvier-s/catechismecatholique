import { describe, it, expect } from 'vitest';
import { lookupBible } from '$lib/server/api/bibleLookup';

// The index is passed in, so this suite is free of the module-level
// memoisation that constrains the block tests.
const INDEX = {
	'1CO': { '1': { '2': [401, 752, 1695], '18': [268, 401] } },
	JHN: { '3': { '16': [219, 444, 458] } }
};

describe('lookupBible', () => {
	it('resolves a book slug, chapter and verse to paragraphs', () => {
		const r = lookupBible('jean', '3', '16', INDEX);
		expect(r).toEqual({
			ok: true,
			body: {
				book: 'JHN',
				book_slug: 'jean',
				book_name: 'Jean',
				chapter: 3,
				verse: 16,
				paragraphs: [219, 444, 458]
			}
		});
	});

	it('accepts the USFX code as well as the slug', () => {
		const r = lookupBible('JHN', '3', '16', INDEX);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.body.paragraphs).toEqual([219, 444, 458]);
	});

	it('accepts a lowercase USFX code', () => {
		const r = lookupBible('jhn', '3', '16', INDEX);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.body.book).toBe('JHN');
	});

	it('returns the whole chapter when no verse is given', () => {
		const r = lookupBible('1-corinthiens', '1', null, INDEX);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.body.verse).toBeNull();
		expect(r.body.verses).toEqual({ '2': [401, 752, 1695], '18': [268, 401] });
		// Union across every verse in the chapter, deduplicated and sorted.
		// 401 appears in both verses and must appear once.
		expect(r.body.paragraphs).toEqual([268, 401, 752, 1695]);
	});

	it('omits the per-verse breakdown for a single-verse lookup', () => {
		const r = lookupBible('jean', '3', '16', INDEX);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.body.verses).toBeUndefined();
	});

	it('rejects an unknown book', () => {
		const r = lookupBible('evangile-de-zz', '1', '1', INDEX);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('unknown_book');
		expect(r.message).toContain('evangile-de-zz');
	});

	it('returns an empty result rather than an error for an uncited verse', () => {
		const r = lookupBible('jean', '3', '17', INDEX);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.body.paragraphs).toEqual([]);
	});

	it('returns an empty chapter for a known book the CCC never cites there', () => {
		const r = lookupBible('jean', '21', null, INDEX);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.body.paragraphs).toEqual([]);
		expect(r.body.verses).toEqual({});
	});

	// A malformed chapter or verse is not an unknown book · the codes differ so
	// a client can tell "no such book" from "that is not a number".
	it('rejects a non-numeric chapter with bad_reference', () => {
		const r = lookupBible('jean', 'trois', null, INDEX);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('bad_reference');
	});

	it('rejects a non-numeric verse with bad_reference', () => {
		const r = lookupBible('jean', '3', 'seize', INDEX);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('bad_reference');
	});

	it('still reports an unknown book as unknown_book, not bad_reference', () => {
		const r = lookupBible('evangile-de-zz', '1', '1', INDEX);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('unknown_book');
	});
});
