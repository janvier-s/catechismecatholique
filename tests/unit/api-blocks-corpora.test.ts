import { describe, it, expect } from 'vitest';
import { assembleBlocks } from '$lib/server/api/blocks';

// ONE shared double for the whole file. loadCompendiumCitedBy,
// loadCdseCitedByCcc, loadDenzingerRefs and loadDenzingerIndex all memoise at
// module level, so the first double to reach them wins for every later test.
// Cases are distinguished by paragraph number, never by swapping the double.
//
// Direction matters and is verified against the shipped data: refs.json is
// keyed by CCC paragraph, while enchiridion/cited-by.json is the inverse,
// keyed by Denzinger number. Using the latter would return plausible but
// wrong numbers.
const ROUTES: Record<string, unknown> = {
	'compendium/cited-by.json': { '1': [1], '2559': [534, 535] },
	'cdse/cited-by-ccc.json': { '2559': [17, 20] },
	'enchiridion/refs.json': { '1': [160, 170], '2': [9999] },
	'enchiridion/index.json': {
		'160': { unit_slug: 'symbole-de-foi' },
		'170': { unit_slug: 'symbole-de-foi' }
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

describe('compendium block', () => {
	it('returns the Compendium questions covering the paragraph', async () => {
		const r = await assembleBlocks(2559, ['compendium'], fetcher);
		expect(r.data.compendium).toEqual([
			{ question: 534, url: '/compendium/534' },
			{ question: 535, url: '/compendium/535' }
		]);
	});

	it('returns an empty array when the paragraph maps to nothing', async () => {
		const r = await assembleBlocks(999, ['compendium'], fetcher);
		expect(r.data.compendium).toEqual([]);
		expect(r.partial).toEqual([]);
	});
});

describe('cdse block', () => {
	it('returns the social-doctrine paragraphs citing this one', async () => {
		const r = await assembleBlocks(2559, ['cdse'], fetcher);
		expect(r.data.cdse).toEqual([
			{ paragraph: 17, url: '/doctrine-sociale/17' },
			{ paragraph: 20, url: '/doctrine-sociale/20' }
		]);
	});

	it('returns an empty array for a paragraph no CDSE paragraph cites', async () => {
		const r = await assembleBlocks(999, ['cdse'], fetcher);
		expect(r.data.cdse).toEqual([]);
	});
});

describe('denzinger block', () => {
	// Keyed by CCC paragraph 1, whose entry in refs.json is [160, 170]. If the
	// block read cited-by.json instead, paragraph 1 would resolve against
	// Denzinger number 1 and return different numbers entirely.
	it('resolves via refs.json, which is keyed by CCC paragraph', async () => {
		const r = await assembleBlocks(1, ['denzinger'], fetcher);
		expect(r.data.denzinger).toEqual([
			{ number: 160, unit_slug: 'symbole-de-foi', url: '/enchiridion/symbole-de-foi' },
			{ number: 170, unit_slug: 'symbole-de-foi', url: '/enchiridion/symbole-de-foi' }
		]);
	});

	it('omits the URL for a number missing from the index', async () => {
		const r = await assembleBlocks(2, ['denzinger'], fetcher);
		expect(r.data.denzinger).toEqual([{ number: 9999, unit_slug: null, url: null }]);
	});
});
