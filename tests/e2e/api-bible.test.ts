import { test, expect } from '@playwright/test';

test('a verse lookup returns the citing CCC paragraphs', async ({ request }) => {
	const res = await request.get('/api/bible/jean/3/16');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.book).toBe('JHN');
	expect(body.book_slug).toBe('jean');
	expect(body.book_name).toBe('Jean');
	expect(body.chapter).toBe(3);
	expect(body.verse).toBe(16);
	// Real data: Jn 3,16 is cited by these paragraphs of the Catechism.
	expect(body.paragraphs).toEqual([219, 444, 454, 458, 706]);
});

test('the USFX code resolves to the same result as the slug', async ({ request }) => {
	const bySlug = await (await request.get('/api/bible/jean/3/16')).json();
	const byCode = await (await request.get('/api/bible/JHN/3/16')).json();
	expect(byCode).toEqual(bySlug);
});

test('a chapter lookup returns the per-verse breakdown', async ({ request }) => {
	const res = await request.get('/api/bible/jean/3');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.verse).toBeNull();
	expect(typeof body.verses).toBe('object');
	// The chapter union must contain every paragraph the single verse returned.
	const paragraphs = body.paragraphs as number[];
	for (const n of [219, 444, 454, 458, 706]) {
		expect(paragraphs).toContain(n);
	}
	// And it must be deduplicated and ascending.
	expect(paragraphs).toEqual([...new Set(paragraphs)].sort((a, b) => a - b));
});

test('a verse the Catechism never cites returns an empty list, not an error', async ({
	request
}) => {
	const res = await request.get('/api/bible/jean/3/999');
	expect(res.status()).toBe(200);
	expect((await res.json()).paragraphs).toEqual([]);
});

test('an unknown book returns a coded 404', async ({ request }) => {
	const res = await request.get('/api/bible/zzz/1/1');
	expect(res.status()).toBe(404);
	expect((await res.json()).code).toBe('unknown_book');
});

test('the bible route is callable cross-origin', async ({ request }) => {
	const res = await request.get('/api/bible/jean/3/16');
	expect(res.headers()['access-control-allow-origin']).toBe('*');
});
