import { test, expect } from '@playwright/test';

test('the docs page lists every route the OpenAPI document declares', async ({ page, request }) => {
	const spec = await (await request.get('/api/openapi.json')).json();
	const paths = Object.keys(spec.paths);
	expect(paths.length).toBeGreaterThan(5);

	await page.goto('/api');
	for (const path of paths) {
		await expect(page.getByText(path, { exact: false }).first()).toBeVisible();
	}
});

test('the docs page points at the OpenAPI document and the raw data', async ({ page }) => {
	await page.goto('/api');
	// openapi.json is linked twice on purpose: once as a row in the generated
	// route table, once in the prose that explains what it is.
	const openapi = page.getByRole('link', { name: /openapi\.json/ });
	await expect(openapi.first()).toBeVisible();
	await expect(openapi).toHaveCount(2);
	await expect(page.getByRole('link', { name: /cited-by\.json/ })).toBeVisible();
});

test('the docs page documents the include blocks', async ({ page }) => {
	await page.goto('/api');
	await expect(page.getByRole('heading', { name: "Blocs d'étude" })).toBeVisible();
	// The ai fence must be stated on the page, not just implemented.
	await expect(page.getByText('generated', { exact: false }).first()).toBeVisible();
});

test('llms.txt advertises the OpenAPI document', async ({ request }) => {
	const body = await (await request.get('/llms.txt')).text();
	expect(body).toContain('/api/openapi.json');
	expect(body).toContain('/api/liturgie/');
});

test('the OpenAPI document is served as JSON and is cross-origin readable', async ({ request }) => {
	const res = await request.get('/api/openapi.json');
	expect(res.status()).toBe(200);
	expect(res.headers()['content-type']).toContain('application/json');
	expect(res.headers()['access-control-allow-origin']).toBe('*');
	const doc = await res.json();
	expect(doc.openapi).toBe('3.1.0');
	// The server URL must reflect the host actually serving the document.
	expect(doc.servers[0].url).toMatch(/^https?:\/\//);
});

// The examples on /api were captured from live responses. This test is what
// keeps them that way: it reads the documented URLs and top-level field names
// straight off the page, then checks them against the running API. A field
// renamed in a handler without a matching edit to the docs fails here.
test('every documented example matches what the API actually returns', async ({
	page,
	request
}) => {
	await page.goto('/api');
	const blocks = await page.locator('.prose-body pre').allInnerTexts();

	const cases: { url: string; keys: string[] }[] = [];
	let pendingUrl: string | null = null;
	for (const block of blocks) {
		const text = block.trim();
		// Take the rest of the line, not just the first token: a documented URL
		// can carry a space (?ref=Lc 7, 11-16), and stopping at the space would
		// silently test a truncated URL that still answers 200.
		const url = text.match(/^GET (\/api\/.*)$/m)?.[1]?.trim();
		if (url) pendingUrl = url;
		// Top-level fields sit at exactly two spaces of indent in every example.
		const keys = [...text.matchAll(/^ {2}"([a-zA-Z_]+)":/gm)].map((m) => m[1]!);
		if (keys.length > 0 && pendingUrl) {
			cases.push({ url: pendingUrl, keys });
			pendingUrl = null;
		}
	}

	// Guard the extraction itself: a formatting change that stopped matching
	// would otherwise turn this test into a silent no-op.
	expect(cases.length).toBeGreaterThanOrEqual(8);

	for (const { url, keys } of cases) {
		const res = await request.get(encodeURI(url));
		expect(res.status(), `${url} should be reachable`).toBe(200);
		const body = await res.json();
		for (const key of keys) {
			expect(body, `${url} should carry the documented field "${key}"`).toHaveProperty(key);
		}
	}
});

test('the playground sends a real request and shows the response', async ({ page }) => {
	await page.goto('/api');
	const playground = page.locator('.playground');
	await expect(playground).toBeVisible();

	// The URL field is prefilled from the selected route's example.
	const field = playground.locator('input');
	await expect(field).toHaveValue(/^\/api\//);

	await playground.getByRole('button', { name: 'Envoyer' }).click();
	await expect(playground.locator('.output')).toContainText('"number": 2559');
	await expect(playground.locator('.status')).toContainText('200');
});

test('the playground follows the route selector and accepts an edited address', async ({
	page
}) => {
	await page.goto('/api');
	const playground = page.locator('.playground');
	const field = playground.locator('input');

	await playground.locator('select').selectOption('/api/liturgie/{date}');
	await expect(field).toHaveValue('/api/liturgie/today');

	await field.fill('/api/liturgie/2026-12-13');
	await field.press('Enter');
	await expect(playground.locator('.output')).toContainText('troisieme-dimanche-de-lavent');
});

test('the playground refuses an address outside the API', async ({ page }) => {
	await page.goto('/api');
	const playground = page.locator('.playground');
	await playground.locator('input').fill('https://example.com/');
	await playground.locator('input').press('Enter');
	await expect(playground.locator('.failure')).toBeVisible();
	await expect(playground.locator('.output')).toHaveCount(0);
});

test('the docs page title names the Catechism, not just the API', async ({ page }) => {
	await page.goto('/api');
	await expect(page).toHaveTitle(/API du Catéchisme/);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('API du Catéchisme');
});
