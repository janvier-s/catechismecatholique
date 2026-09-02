import { test, expect } from '@playwright/test';

// These key sets are a public contract. Adding a key here is allowed only
// when the field is genuinely new and documented; REMOVING or RENAMING one is
// a breaking change and must not happen without a /api/v2.
const PARAGRAPH_KEYS = [
	'number',
	'corpus',
	'text_html',
	'text',
	'cross_refs',
	'bible_refs',
	'citations',
	'magisterial_refs',
	'breadcrumb',
	'prev',
	'next',
	'permalink'
];

const SEARCH_KEYS = ['q', 'hits', 'mode', 'tokens', 'matchedTokens', 'suggestions'];

test('GET /api/cec/2559 returns exactly the documented key set', async ({ request }) => {
	const res = await request.get('/api/cec/2559');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(Object.keys(body).sort()).toEqual([...PARAGRAPH_KEYS].sort());
});

test('GET /api/search returns exactly the documented key set', async ({ request }) => {
	const res = await request.get('/api/search?q=eucharistie');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(Object.keys(body).sort()).toEqual([...SEARCH_KEYS].sort());
});

test('the paragraph route is callable cross-origin', async ({ request }) => {
	const res = await request.get('/api/cec/1');
	expect(res.headers()['access-control-allow-origin']).toBe('*');
});

test('an out-of-range paragraph returns a coded 404', async ({ request }) => {
	const res = await request.get('/api/cec/9999');
	expect(res.status()).toBe(404);
	const body = await res.json();
	expect(body.code).toBe('paragraph_out_of_range');
	expect(typeof body.error).toBe('string');
});

test('the batch route returns one item per requested paragraph', async ({ request }) => {
	const res = await request.get('/api/cec?numbers=1,2,3');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.count).toBe(3);
	expect(body.items.map((i: { number: number }) => i.number)).toEqual([1, 2, 3]);
});

test('the batch route refuses a wide range with a wide include', async ({ request }) => {
	const res = await request.get('/api/cec?range=1-50&include=all');
	expect(res.status()).toBe(400);
	const body = await res.json();
	expect(body.code).toBe('too_many_blocks');
});

// The acceptance side of the same cap: 10 paragraphs x 9 blocks = 90 fetches,
// just under MAX_BLOCK_FETCHES. Without this, tightening the cap check would
// silently reject legitimate requests and only the rejection test would run.
test('the batch route serves a request just under the fetch cap', async ({ request }) => {
	const res = await request.get('/api/cec?range=1-10&include=all');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.count).toBe(10);
	expect(body.items[0]).toHaveProperty('themes');
	expect(body.items[0]).not.toHaveProperty('ai');
});

test('the batch route rejects an unknown include block by name', async ({ request }) => {
	const res = await request.get('/api/cec?numbers=1&include=trent');
	expect(res.status()).toBe(400);
	const body = await res.json();
	expect(body.code).toBe('unknown_include');
	expect(body.error).toContain('trent');
});
