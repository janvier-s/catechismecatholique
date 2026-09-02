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
