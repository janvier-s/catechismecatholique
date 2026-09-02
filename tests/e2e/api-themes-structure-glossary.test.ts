import { test, expect } from '@playwright/test';

test('the theme vocabulary lists themes with counts', async ({ request }) => {
	const res = await request.get('/api/themes');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.count).toBeGreaterThan(0);
	expect(body.themes).toHaveLength(body.count);
	expect(body.themes[0]).toHaveProperty('slug');
	expect(body.themes[0]).toHaveProperty('count');
	expect(body.themes[0].glossary_url).toBe(`/glossaire/${body.themes[0].slug}`);
});

test('a theme returns its paragraphs, and the count matches the vocabulary', async ({
	request
}) => {
	const list = await (await request.get('/api/themes')).json();
	const first = list.themes[0];

	const res = await request.get(`/api/themes/${first.slug}`);
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.slug).toBe(first.slug);
	expect(body.paragraphs.length).toBeGreaterThan(0);
	// The vocabulary's count and the per-theme paragraph list must agree.
	expect(body.count).toBe(first.count);
	expect(body.paragraphs).toHaveLength(first.count);
});

test('an unknown theme returns a coded 404', async ({ request }) => {
	const res = await request.get('/api/themes/ce-theme-nexiste-pas');
	expect(res.status()).toBe(404);
	expect((await res.json()).code).toBe('unknown_slug');
});

test('the structure tree is returned and can be trimmed', async ({ request }) => {
	const full = await (await request.get('/api/structure')).json();
	expect(Array.isArray(full.parts)).toBe(true);
	expect(full.parts.length).toBeGreaterThan(0);

	const shallow = await (await request.get('/api/structure?depth=1')).json();
	expect(shallow.parts).toHaveLength(full.parts.length);
	expect(shallow.parts[0].sections).toBeUndefined();
	// Trimming must not drop the part's own identity.
	expect(shallow.parts[0].slug).toBe(full.parts[0].slug);
});

test('an unparseable depth is treated as no limit rather than an error', async ({ request }) => {
	const res = await request.get('/api/structure?depth=abc');
	expect(res.status()).toBe(200);
	const body = await res.json();
	const full = await (await request.get('/api/structure')).json();
	expect(body).toEqual(full);
});

test('the glossary lists entries and resolves one by slug', async ({ request }) => {
	const list = await (await request.get('/api/glossary')).json();
	expect(list.count).toBeGreaterThan(0);
	expect(Array.isArray(list.clusters)).toBe(true);
	const first = list.entries[0];
	expect(first.url).toBe(`/glossaire/${first.slug}`);

	const res = await request.get(`/api/glossary/${first.slug}`);
	expect(res.status()).toBe(200);
	const entry = await res.json();
	expect(entry.slug).toBe(first.slug);
	expect(entry.url).toBe(`/glossaire/${first.slug}`);
	// The single-entry route carries the definition the listing omits.
	expect(entry).toHaveProperty('directRefs');
});

test('an unknown glossary slug returns a coded 404', async ({ request }) => {
	const res = await request.get('/api/glossary/ce-terme-nexiste-pas');
	expect(res.status()).toBe(404);
	expect((await res.json()).code).toBe('unknown_slug');
});

test('themes and glossary share one slug namespace', async ({ request }) => {
	// The spec states these are two views of one identifier. A theme's slug
	// must therefore resolve as a glossary entry.
	const list = await (await request.get('/api/themes')).json();
	const slug = list.themes[0].slug;
	const res = await request.get(`/api/glossary/${slug}`);
	expect(res.status()).toBe(200);
	expect((await res.json()).slug).toBe(slug);
});
