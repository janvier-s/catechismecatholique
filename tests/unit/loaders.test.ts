import { describe, it, expect, vi } from 'vitest';
import {
	loadParagraph,
	loadCompendiumStructure,
	loadCompendiumPart,
	loadCompendiumCitedBy,
	loadCompendiumQRanges
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
