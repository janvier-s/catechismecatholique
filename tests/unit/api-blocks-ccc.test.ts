import { describe, it, expect } from 'vitest';
import { assembleBlocks } from '$lib/server/api/blocks';

// ONE shared double for the whole file. Several loaders behind these blocks
// memoise at module level (loadEnBrefsIndex, loadCecLiturgy), so the first
// double to reach them wins for every later test. Cases are therefore
// distinguished by paragraph number, never by swapping the double.
const ROUTES: Record<string, unknown> = {
	'en-brefs-index.json': [
		{ first: 44, last: 49, paragraphs: [44, 45], parent_kind: 'chapter', parent_slug: 'x' },
		{ first: 68, last: 73, paragraphs: [68], parent_kind: 'chapter', parent_slug: 'y' }
	],
	'/paragraphs/2559.json': {
		corpus: 'ccc',
		number: 2559,
		text_html: '<span>x</span>',
		cross_refs: [],
		bible_refs: [{ text: 'Ps 130, 1', book: 'Ps', chapter: 130, verseStart: 1 }],
		citations: [],
		magisterial_refs: []
	},
	'/paragraphs/7.json': {
		corpus: 'ccc',
		number: 7,
		text_html: '<span>x</span>',
		cross_refs: [],
		bible_refs: [{ text: 'Zz 1, 1', book: 'Zz', chapter: 1, verseStart: 1 }],
		citations: [],
		magisterial_refs: []
	},
	'/calendrier/cec/25.json': {
		occasions: [
			{
				slug: 'troisieme-dimanche-de-lavent',
				title: 'Troisième Dimanche de l’Avent',
				season: 'avent',
				color: 'rose',
				cycle: 'a',
				clusters: [
					{ theme: 'la joie', paragraphs: [2559] },
					{ theme: 'la patience', paragraphs: [227] }
				]
			}
		],
		paragraphs: { '2559': [0] }
	}
};

const fetcher = (async (input: RequestInfo | URL) => {
	const url = String(input);
	for (const [frag, payload] of Object.entries(ROUTES)) {
		if (url.includes(frag)) {
			return { ok: true, status: 200, json: async () => payload, text: async () => '' };
		}
	}
	return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
}) as unknown as typeof fetch;

describe('en_bref block', () => {
	it('returns the summary range covering the paragraph', async () => {
		const r = await assembleBlocks(70, ['en_bref'], fetcher);
		expect(r.data.en_bref).toEqual({
			first: 68,
			last: 73,
			paragraphs: [68],
			parent_kind: 'chapter',
			parent_slug: 'y'
		});
	});

	it('returns null when no summary covers the paragraph', async () => {
		const r = await assembleBlocks(2000, ['en_bref'], fetcher);
		expect(r.data.en_bref).toBeNull();
		expect(r.partial).toEqual([]);
	});
});

describe('bible block', () => {
	it('resolves each scripture reference to a book slug and URL', async () => {
		const r = await assembleBlocks(2559, ['bible'], fetcher);
		expect(r.data.bible).toEqual([
			{
				text: 'Ps 130, 1',
				book: 'Ps',
				book_slug: 'psaumes',
				book_name: 'Psaumes',
				chapter: 130,
				verse_start: 1,
				verse_end: null,
				url: '/bible/psaumes/130'
			}
		]);
	});

	it('keeps an unrecognised abbreviation without inventing a URL', async () => {
		const r = await assembleBlocks(7, ['bible'], fetcher);
		const refs = r.data.bible as Array<Record<string, unknown>>;
		expect(refs[0]!.book).toBe('Zz');
		expect(refs[0]!.book_slug).toBeNull();
		expect(refs[0]!.url).toBeNull();
	});
});

describe('liturgy block', () => {
	// The occasion carries two clusters but only one names this paragraph.
	// The block must return that one theme, not the day's whole programme.
	it('returns only the themes whose cluster contains the paragraph', async () => {
		const r = await assembleBlocks(2559, ['liturgy'], fetcher);
		expect(r.data.liturgy).toEqual([
			{
				slug: 'troisieme-dimanche-de-lavent',
				title: 'Troisième Dimanche de l’Avent',
				season: 'avent',
				color: 'rose',
				cycle: 'a',
				themes: ['la joie']
			}
		]);
	});
});
