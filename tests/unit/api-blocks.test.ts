import { describe, it, expect, vi } from 'vitest';
import { assembleBlocks, BLOCKS } from '$lib/server/api/blocks';

// ONE shared double for the whole file. loadCitedBy, loadSourcesIndex and
// loadParagraphThemes all memoise at module level, so the first double to
// reach them wins for every later test. Cases are distinguished by paragraph
// number, never by swapping the double.
const ROUTES: Record<string, unknown> = {
	'cited-by.json': { '2559': [2098, 2721] },
	'paragraph-themes.json': { '2559': [{ name: 'Prière', slug: 'priere' }] },
	'abbreviations.json': { GS: 'Gaudium et Spes' },
	'sources-index.json': [
		{ category: 'Conciles', doc_name: 'GS', location: '19', paragraphs: [2559] },
		{ category: 'Conciles', doc_name: 'LG', location: '1', paragraphs: [1] }
	],
	'/paragraphs/2559.json': {
		corpus: 'ccc',
		number: 2559,
		text_html: '<span>x</span>',
		cross_refs: [],
		bible_refs: [],
		citations: [],
		magisterial_refs: [
			{ type: 'magisterial', raw: 'GS 19, 1' },
			{ type: 'bible', raw: 'Ps 130, 1' }
		]
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

describe('assembleBlocks', () => {
	it('returns an empty object for no blocks', async () => {
		const r = await assembleBlocks(1, [], fetcher);
		expect(r).toEqual({ data: {}, partial: [] });
	});

	it('places each block under its own top-level key', async () => {
		const r = await assembleBlocks(2559, ['cited_by', 'themes'], fetcher);
		expect(r.partial).toEqual([]);
		expect(r.data.cited_by).toEqual([2098, 2721]);
		expect(r.data.themes).toEqual([
			{ name: 'Prière', slug: 'priere', glossary_url: '/glossaire/priere' }
		]);
	});

	it('returns an empty array when the paragraph has no entry', async () => {
		const r = await assembleBlocks(999, ['cited_by'], fetcher);
		expect(r.data.cited_by).toEqual([]);
		expect(r.partial).toEqual([]);
	});

	// The failure-isolation contract: a client asking for eight blocks must not
	// lose the paragraph text because one shard 404'd.
	it('isolates a failing block instead of failing the response', async () => {
		const boom = vi.fn(async () => {
			throw new Error('shard exploded');
		});
		const original = BLOCKS.themes;
		BLOCKS.themes = boom;
		try {
			const r = await assembleBlocks(2559, ['cited_by', 'themes'], fetcher);
			expect(r.data.cited_by).toEqual([2098, 2721]);
			expect(r.data.themes).toBeNull();
			expect(r.partial).toEqual(['themes']);
		} finally {
			BLOCKS.themes = original;
		}
	});

	it('sources returns the filtered magisterial refs with abbreviations expanded', async () => {
		const r = await assembleBlocks(2559, ['sources'], fetcher);
		expect(r.data.sources).toEqual({
			refs: [{ type: 'magisterial', raw: 'GS 19, 1', display: 'Gaudium et Spes 19, 1' }],
			documents: [{ category: 'Conciles', doc_name: 'GS', location: '19' }]
		});
	});
});
