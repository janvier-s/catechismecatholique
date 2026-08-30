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

// loadNclBook awaits its manifest as the first step inside the very try block
// this diff just made retry-safe. A rejection one level down, in the manifest
// promise itself, would otherwise poison every one of BibleReader's retries
// before the book fetch being retried is ever reached. Each test resets the
// module registry so the manifest singleton these loaders cache at module
// scope starts empty, rather than reusing whatever the tests above resolved.
describe('ncl manifest loaders do not cache a rejection', () => {
	it('loadNclManifest: a fetcher that rejects once then succeeds returns success on the second call', async () => {
		vi.resetModules();
		const { loadNclManifest } = await import('$lib/data/loaders');
		let calls = 0;
		const fetcher = vi.fn(() => {
			calls++;
			if (calls === 1) return Promise.reject(new Error('network blip'));
			return Promise.resolve({ ok: true, status: 200, json: async () => ['GEN'] });
		}) as unknown as typeof fetch;

		await expect(loadNclManifest(fetcher)).rejects.toThrow('network blip');
		const manifest = await loadNclManifest(fetcher);
		expect(manifest.has('GEN')).toBe(true);
	});

	it('loadNclParagraphsManifest: a fetcher that rejects once then succeeds returns success on the second call', async () => {
		vi.resetModules();
		const { loadNclParagraphsManifest } = await import('$lib/data/loaders');
		let calls = 0;
		const fetcher = vi.fn(() => {
			calls++;
			if (calls === 1) return Promise.reject(new Error('network blip'));
			return Promise.resolve({ ok: true, status: 200, json: async () => ['JHN'] });
		}) as unknown as typeof fetch;

		await expect(loadNclParagraphsManifest(fetcher)).rejects.toThrow('network blip');
		const manifest = await loadNclParagraphsManifest(fetcher);
		expect(manifest.has('JHN')).toBe(true);
	});
});

describe('loadCalendrierReading', () => {
	it('resolves the fetched entry on success', async () => {
		const fetcher = vi.fn(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				json: async () => ({ date: '2025-11-30', lectures: [] })
			})
		) as unknown as typeof fetch;
		const { loadCalendrierReading } = await import('$lib/data/loaders');
		const entry = await loadCalendrierReading('premier-dimanche-de-lavent', 'a', fetcher);
		expect(entry?.date).toBe('2025-11-30');
		expect(fetcher).toHaveBeenCalledWith(
			'/data/calendrier/readings/a--premier-dimanche-de-lavent.json'
		);
	});

	it('resolves to null on a 404 (a known AELF gap)', async () => {
		const fetcher = vi.fn(() =>
			Promise.resolve({ ok: false, status: 404 })
		) as unknown as typeof fetch;
		const { loadCalendrierReading } = await import('$lib/data/loaders');
		const entry = await loadCalendrierReading('second-dimanche-apres-noel', 'a', fetcher);
		expect(entry).toBeNull();
	});

	it('rejects on a non-404 failure and does not cache the rejection', async () => {
		let calls = 0;
		const fetcher = vi.fn(() => {
			calls++;
			if (calls === 1) return Promise.resolve({ ok: false, status: 500 });
			return Promise.resolve({
				ok: true,
				status: 200,
				json: async () => ({ date: '2026-01-01', lectures: [] })
			});
		}) as unknown as typeof fetch;
		const { loadCalendrierReading } = await import('$lib/data/loaders');
		await expect(loadCalendrierReading('la-solennite-de-noel', undefined, fetcher)).rejects.toThrow();
		const entry = await loadCalendrierReading('la-solennite-de-noel', undefined, fetcher);
		expect(entry?.date).toBe('2026-01-01');
	});
});
