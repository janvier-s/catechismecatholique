import { test, expect } from '@playwright/test';

const q = (...refs: string[]) =>
	'/api/pericope?' + refs.map((r) => 'ref=' + encodeURIComponent(r)).join('&');

test('resolves a liturgical range to the paragraphs citing it', async ({ request }) => {
	const res = await request.get(q('Lc 7, 11-16'));
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.count).toBe(1);
	const item = body.items[0];
	expect(item.book_slug).toBe('luc');
	expect(item.spans).toEqual([{ chapter: 7, from: 11, to: 16 }]);
	expect(item.paragraphs).toEqual([994, 1503]);
	expect(item.verses['16']).toContain(1503);
});

// The whole point of the route: the same answer without the client owning a
// parser for French references. This must equal the union a client would build
// by hand from the chapter route, or one of the two is wrong.
test('agrees with the chapter route unioned by hand', async ({ request }) => {
	const chapter = await (await request.get('/api/bible/matthieu/6')).json();
	const byHand = new Set<number>();
	for (let v = 24; v <= 33; v++) for (const p of chapter.verses[String(v)] ?? []) byHand.add(p);

	const viaRoute = await (await request.get(q('Mt 6, 24-33'))).json();
	expect(viaRoute.items[0].paragraphs).toEqual([...byHand].sort((a, b) => a - b));
	expect(viaRoute.items[0].paragraphs.length).toBeGreaterThan(5);
});

test('resolves a passage that crosses a chapter boundary', async ({ request }) => {
	// The Passion according to Matthew. A single-chapter lookup cannot express it.
	const res = await request.get(q('Mt 26, 14 - 27, 66'));
	const item = (await res.json()).items[0];
	expect(item.spans.map((s: { chapter: number }) => s.chapter)).toEqual([26, 27]);
	expect(item.paragraphs.length).toBeGreaterThan(10);
});

test('accepts the lectionary shapes: dot groups, half-verses, psalm dual numbering', async ({
	request
}) => {
	const body = await (
		await request.get(q('Gn 49, 1-2.8-10', 'Ps 79, 2ac.3bc, 15-16a', 'Ps 118 (119), 97-98'))
	).json();
	expect(body.count).toBe(3);
	for (const item of body.items) expect(item.code).toBeUndefined();
	expect(body.items[0].spans).toEqual([
		{ chapter: 49, from: 1, to: 2 },
		{ chapter: 49, from: 8, to: 10 }
	]);
	// The parenthesised number wins: the reader is Hebrew-numbered.
	expect(body.items[2].spans[0].chapter).toBe(119);
});

test('one malformed reference does not cost the others their answers', async ({ request }) => {
	const res = await request.get(q('Lc 7, 11-16', 'pas une référence', 'Jn 3, 16'));
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.count).toBe(3);
	expect(body.items[0].paragraphs.length).toBeGreaterThan(0);
	expect(body.items[1].code).toBe('bad_reference');
	expect(body.items[2].paragraphs).toContain(219);
});

test('accepts many references in one semicolon-separated parameter', async ({ request }) => {
	const body = await (
		await request.get('/api/pericope?ref=' + encodeURIComponent('Lc 7, 11-16; Jn 3, 16'))
	).json();
	expect(body.count).toBe(2);
});

test('a request with no reference is a coded 400', async ({ request }) => {
	const res = await request.get('/api/pericope');
	expect(res.status()).toBe(400);
	expect((await res.json()).code).toBe('bad_reference');
});

test('refuses more references than the cap', async ({ request }) => {
	const refs = Array.from({ length: 51 }, (_, i) => `Jn 3, ${i + 1}`);
	const res = await request.get(q(...refs));
	expect(res.status()).toBe(400);
	expect((await res.json()).code).toBe('too_many_refs');
});

test('a passage the Catechism never cites is an empty list, not an error', async ({ request }) => {
	const body = await (await request.get(q('Gn 49, 1-2'))).json();
	expect(body.items[0].code).toBeUndefined();
	expect(body.items[0].paragraphs).toEqual([]);
});

test('the pericope route is callable cross-origin', async ({ request }) => {
	const res = await request.get(q('Jn 3, 16'));
	expect(res.headers()['access-control-allow-origin']).toBe('*');
});
