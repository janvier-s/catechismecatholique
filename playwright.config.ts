import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	testMatch: ['**/*.e2e.{ts,js}', 'tests/e2e/**/*.test.{ts,js}'],
	// miniflare's KV/cache SQLite store doesn't support concurrent workers in dev preview
	workers: 1,
	// CI runs the full suite sequentially on a single worker against a shared
	// runner — a rare timing flake there shouldn't fail the whole job. Local
	// runs stay strict (0 retries) so a real bug doesn't get masked.
	retries: process.env.CI ? 2 : 0
});
