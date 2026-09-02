import { describe, it, expect } from 'vitest';
import { apiError, apiJson, CORS_HEADERS } from '$lib/server/api/http';

describe('apiError', () => {
	it('returns the French message and a machine-readable code', async () => {
		const res = apiError('Numéro invalide.', 'paragraph_out_of_range', 404);
		expect(res.status).toBe(404);
		await expect(res.json()).resolves.toEqual({
			error: 'Numéro invalide.',
			code: 'paragraph_out_of_range'
		});
	});

	it('defaults to status 400', () => {
		expect(apiError('x', 'unknown_include').status).toBe(400);
	});

	it('carries the CORS header', () => {
		expect(apiError('x', 'unknown_include').headers.get('access-control-allow-origin')).toBe('*');
	});
});

describe('apiJson', () => {
	it('sets the default cache policy and CORS', () => {
		const res = apiJson({ ok: true });
		expect(res.headers.get('cache-control')).toBe('public, max-age=3600, s-maxage=86400');
		expect(res.headers.get('access-control-allow-origin')).toBe('*');
		expect(res.headers.get('content-type')).toContain('application/json');
	});

	it('honours an explicit max-age', () => {
		const res = apiJson({ ok: true }, 120);
		expect(res.headers.get('cache-control')).toBe('public, max-age=120, s-maxage=86400');
	});
});

describe('CORS_HEADERS', () => {
	it('allows GET and OPTIONS from any origin', () => {
		expect(CORS_HEADERS['Access-Control-Allow-Origin']).toBe('*');
		expect(CORS_HEADERS['Access-Control-Allow-Methods']).toBe('GET, OPTIONS');
	});
});
