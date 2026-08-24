import { describe, it, expect, vi } from 'vitest';
import {
	loadParagraph,
	loadCompendiumStructure,
	loadCompendiumPart,
	loadCompendiumCitedBy,
	loadCompendiumQRanges,
	loadNclBook,
	loadNclParagraphsBook
} from '$lib/data/loaders';

describe('loaders', () => {
	it('loadParagraph resolves to typed paragraph', async () => {
		const fakeFetch = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						corpus: 'ccc',
						number: 27,
						text_html: '<span>x</span>',
						cross_refs: [],
						bible_refs: [],
						citations: [],
						magisterial_refs: []
					})
			})
		) as unknown as typeof fetch;
		const p = await loadParagraph(27, fakeFetch);
		expect(p.number).toBe(27);
	});

	it('loadParagraph throws on 404', async () => {
		const fakeFetch = vi.fn(() =>
			Promise.resolve({ ok: false, status: 404 })
		) as unknown as typeof fetch;
		await expect(loadParagraph(99999, fakeFetch)).rejects.toThrow();
	});
});

describe('compendium loaders', () => {
	const fakeFetch = (data: unknown) =>
		(async () => ({ ok: true, status: 200, json: async () => data })) as unknown as typeof fetch;

	it('fetches structure.json', async () => {
		const f = fakeFetch({ parts: [] });
		const s = await loadCompendiumStructure(f);
		expect(s.parts).toEqual([]);
	});

	it('fetches a part bundle by slug', async () => {
		const bundle = { slug: 'profession-foi', number: 1, title: 'X', flow: [] };
		const f = fakeFetch(bundle);
		const out = await loadCompendiumPart('profession-foi', f);
		expect(out.slug).toBe('profession-foi');
	});

	it('fetches cited-by index', async () => {
		const f = fakeFetch({ '27': [1, 5] });
		const out = await loadCompendiumCitedBy(f);
		expect(out['27']).toEqual([1, 5]);
	});

	it('fetches q-ranges', async () => {
		const f = fakeFetch([{ part: 'p1', from: 1, to: 217 }]);
		const out = await loadCompendiumQRanges(f);
		expect(out[0]?.part).toBe('p1');
	});
});

// loadNclBook and loadNclParagraphsBook are the two loaders BibleReader's
// infinite scroll calls at a book boundary, the only place a real network
// request happens mid-session. Their module-scope Map caches must drop a
// rejected promise instead of keeping it, or a single dropped request at a
// boundary permanently disables that book for the life of the module.
describe('ncl book loaders do not cache a rejection', () => {
	it('loadNclBook: a fetcher that rejects once then succeeds returns success on the second call', async () => {
		const usfx = 'GEN';
		let dataCalls = 0;
		const fetcher = vi.fn((url: string) => {
			if (url.includes('manifest.json')) {
				return Promise.resolve({ ok: true, status: 200, json: async () => [usfx] });
			}
			dataCalls++;
			if (dataCalls === 1) return Promise.reject(new Error('network blip'));
			return Promise.resolve({
				ok: true,
				status: 200,
				json: async () => ({ '1': { '1': 'Au commencement' } })
			});
		}) as unknown as typeof fetch;

		await expect(loadNclBook(usfx, fetcher)).rejects.toThrow('network blip');
		const book = await loadNclBook(usfx, fetcher);
		expect(book?.['1']?.['1']).toBe('Au commencement');
	});

	it('loadNclParagraphsBook: a fetcher that rejects once then succeeds returns success on the second call', async () => {
		const usfx = 'JHN';
		let dataCalls = 0;
		const fetcher = vi.fn((url: string) => {
			if (url.includes('manifest.json')) {
				return Promise.resolve({ ok: true, status: 200, json: async () => [usfx] });
			}
			dataCalls++;
			if (dataCalls === 1) return Promise.reject(new Error('network blip'));
			return Promise.resolve({
				ok: true,
				status: 200,
				json: async () => ({ '1': [] })
			});
		}) as unknown as typeof fetch;

		await expect(loadNclParagraphsBook(usfx, fetcher)).rejects.toThrow('network blip');
		const book = await loadNclParagraphsBook(usfx, fetcher);
		expect(book?.['1']).toEqual([]);
	});
});
