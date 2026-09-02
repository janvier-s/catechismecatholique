import { test, expect } from '@playwright/test';

function cacheDirectives(header: string): { maxAge: number | null; sMaxAge: number | null } {
	const maxAge = header.match(/(?:^|[ ,])max-age=(\d+)/)?.[1];
	const sMaxAge = header.match(/s-maxage=(\d+)/)?.[1];
	return {
		maxAge: maxAge === undefined ? null : Number(maxAge),
		sMaxAge: sMaxAge === undefined ? null : Number(sMaxAge)
	};
}

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

// Ferial weekdays are three calendar dates in four. They live in the forward
// index under the ferial cycle I/II, a different key space from the Sunday
// cycles, and were absent from the first version of this endpoint.
test('an ordinary weekday returns its meditation programme', async ({ request }) => {
	const res = await request.get('/api/liturgie/2026-09-02');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.corpus).toBe('weekday');
	expect(body.cycle).toBe('II');
	expect(body.celebration).not.toBeNull();
	expect(body.celebration.title).toContain('22e semaine');
	expect(body.meditation.length).toBeGreaterThan(0);
	const paragraphs = body.meditation.flatMap((c: { paragraphs: number[] }) => c.paragraphs);
	expect(paragraphs.length).toBeGreaterThan(0);
});

test('the same weekday slug differs between ferial cycles I and II', async ({ request }) => {
	// Both are "ordinaire-22-mercredi", one in cycle I and one in cycle II.
	const a = await (await request.get('/api/liturgie/2026-09-02')).json();
	const b = await (await request.get('/api/liturgie/2025-09-03')).json();
	expect(a.slug).toBe(b.slug);
	expect(a.cycle).not.toBe(b.cycle);
});

test('a date-proper day with no cycle resolves through the empty cycle segment', async ({
	request
}) => {
	// 3 janvier is a date-proper day: corpus "proper", no yearKey and no ferial
	// cycle, so it is indexed under ":3-janvier".
	const res = await request.get('/api/liturgie/2026-01-03');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.corpus).toBe('proper');
	expect(body.cycle).toBeNull();
	expect(body.celebration).not.toBeNull();
	expect(body.meditation.length).toBeGreaterThan(0);
});

// This test must fail if the rollover is removed. Asserting only that max-age
// sits inside its own clamp cannot do that, because every possible value of
// secondsUntilParisMidnight satisfies such a bound.
test('today expires at the Paris rollover, at the edge as well as the browser', async ({
	request
}) => {
	const today = await request.get('/api/liturgie/today');
	expect(today.status()).toBe(200);
	const t = cacheDirectives(today.headers()['cache-control'] ?? '');

	const fixed = await request.get('/api/liturgie/2026-12-13');
	const f = cacheDirectives(fixed.headers()['cache-control'] ?? '');

	// A fixed date is immutable: default browser TTL, default long edge TTL.
	expect(f.maxAge).toBe(3600);
	expect(f.sMaxAge).toBe(86400);

	// "today" must shorten BOTH. Cloudflare prefers s-maxage, so an unchanged
	// s-maxage here would mean the edge serves yesterday's date after midnight.
	expect(t.sMaxAge).toBe(t.maxAge);
	expect(t.sMaxAge).not.toBe(86400);
	expect(t.maxAge).toBeGreaterThan(0);
	expect(t.maxAge).toBeLessThanOrEqual(3600);
});

test('today resolves to a real calendar date', async ({ request }) => {
	const res = await request.get('/api/liturgie/today');
	const body = await res.json();
	expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	expect(body.slug.length).toBeGreaterThan(0);
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
