import { test, expect } from '@playwright/test';

test('a fixed date returns the celebration and its meditation clusters', async ({ request }) => {
	// 2026-12-13 is the third Sunday of Advent, year B.
	const res = await request.get('/api/liturgie/2026-12-13');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.date).toBe('2026-12-13');
	expect(body.slug).toBe('troisieme-dimanche-de-lavent');
	expect(body.cycle).toBe('b');
	expect(body.celebration).not.toBeNull();
	expect(body.meditation.length).toBeGreaterThan(0);
	expect(body.meditation[0]).toHaveProperty('theme');
	expect(body.meditation[0]).toHaveProperty('paragraphs');
});

// The reason the index is keyed by cycle and slug rather than slug alone.
// These three dates are the SAME liturgical day in years C, A and B, and the
// Homiletic Directory proposes different paragraphs for each. A slug-only key
// would return one year's programme for all three.
test('the same Sunday in different years returns different paragraphs', async ({ request }) => {
	const byCycle: Record<string, { cycle: string; meditation: unknown[] }> = {};
	for (const date of ['2024-12-15', '2025-12-14', '2026-12-13']) {
		const res = await request.get(`/api/liturgie/${date}`);
		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.slug).toBe('troisieme-dimanche-de-lavent');
		byCycle[body.cycle] = body;
	}

	expect(Object.keys(byCycle).sort()).toEqual(['a', 'b', 'c']);
	const serialised = Object.values(byCycle).map((b) => JSON.stringify(b.meditation));
	expect(new Set(serialised).size).toBe(3);
});

test('a fixed feast with no cycle still resolves', async ({ request }) => {
	// 2026-01-01, Sainte Marie Mère de Dieu · a fixed solemnity, indexed with
	// an empty cycle segment, so it exercises the cycle-less fallback key.
	const res = await request.get('/api/liturgie/2026-01-01');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.date).toBe('2026-01-01');
	expect(Array.isArray(body.meditation)).toBe(true);
});

test('today resolves and is cached only until the date rollover', async ({ request }) => {
	const res = await request.get('/api/liturgie/today');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	const cache = res.headers()['cache-control'] ?? '';
	const maxAge = Number(cache.match(/max-age=(\d+)/)?.[1] ?? '99999');
	expect(maxAge).toBeLessThanOrEqual(3600);
	expect(maxAge).toBeGreaterThan(0);
});

test('a malformed date returns a coded 400', async ({ request }) => {
	const res = await request.get('/api/liturgie/hier');
	expect(res.status()).toBe(400);
	expect((await res.json()).code).toBe('bad_date');
});

test('a date outside the calendar range returns a coded 404', async ({ request }) => {
	const res = await request.get('/api/liturgie/1850-01-01');
	expect(res.status()).toBe(404);
	expect((await res.json()).code).toBe('bad_date');
});

test('the liturgie route is callable cross-origin', async ({ request }) => {
	const res = await request.get('/api/liturgie/2026-12-13');
	expect(res.headers()['access-control-allow-origin']).toBe('*');
});
