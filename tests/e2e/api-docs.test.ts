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
