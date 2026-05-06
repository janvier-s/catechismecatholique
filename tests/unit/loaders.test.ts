import { describe, it, expect, vi } from 'vitest';
import { loadParagraph } from '$lib/data/loaders';

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
