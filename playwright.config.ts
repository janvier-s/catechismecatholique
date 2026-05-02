import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	testMatch: ['**/*.e2e.{ts,js}', 'tests/e2e/**/*.test.{ts,js}'],
	// miniflare's KV/cache SQLite store doesn't support concurrent workers in dev preview
	workers: 1
});
