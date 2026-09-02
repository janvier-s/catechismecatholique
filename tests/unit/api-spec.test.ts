import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { API_ROUTES, buildOpenApi } from '$lib/server/api/spec';
import { ALL_BLOCKS } from '$lib/server/api/include';

/**
 * Every directory under src/routes/api that contains a +server.ts, expressed
 * in OpenAPI path syntax. This is the drift guard: it reads the filesystem,
 * not the spec, so a route added without a spec entry (or a spec entry with
 * no route) fails the build.
 */
function actualRoutes(dir: string, prefix = '/api'): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (name === '+server.ts') {
			out.push(prefix);
			continue;
		}
		if (statSync(full).isDirectory()) {
			// [number=int] -> {number}, [slug] -> {slug}
			const seg = name.startsWith('[') ? `{${name.slice(1, -1).split('=')[0]}}` : name;
			out.push(...actualRoutes(full, `${prefix}/${seg}`));
		}
	}
	return out;
}

describe('API spec coverage', () => {
	const declared = new Set(API_ROUTES.map((r) => r.path));
	const actual = new Set(actualRoutes('src/routes/api'));

	it('finds the routes on disk at all', () => {
		// Guards the guard: if the walker silently returned nothing, the two
		// checks below would both pass vacuously.
		expect(actual.size).toBeGreaterThan(5);
		expect(actual).toContain('/api/cec/{number}');
	});

	it('declares every route that exists', () => {
		const undocumented = [...actual].filter((p) => !declared.has(p));
		expect(undocumented).toEqual([]);
	});

	it('declares no route that does not exist', () => {
		const phantom = [...declared].filter((p) => !actual.has(p));
		expect(phantom).toEqual([]);
	});

	it('gives every route a summary and a usable example', () => {
		for (const r of API_ROUTES) {
			expect(r.summary.length).toBeGreaterThan(0);
			expect(r.example.startsWith('/api/')).toBe(true);
		}
	});

	it('declares no duplicate paths', () => {
		expect(declared.size).toBe(API_ROUTES.length);
	});
});

describe('buildOpenApi', () => {
	it('emits a 3.1 document with a path per declared route', () => {
		const doc = buildOpenApi('https://catechismecatholique.fr') as {
			openapi: string;
			paths: Record<string, unknown>;
		};
		expect(doc.openapi).toBe('3.1.0');
		expect(Object.keys(doc.paths).sort()).toEqual([...API_ROUTES.map((r) => r.path)].sort());
	});

	it('uses the origin it is given as the server URL', () => {
		const doc = buildOpenApi('https://example.test') as { servers: { url: string }[] };
		expect(doc.servers[0]!.url).toBe('https://example.test');
	});

	it('documents every include block by name', () => {
		const doc = JSON.stringify(buildOpenApi('https://example.test'));
		for (const b of ALL_BLOCKS) expect(doc).toContain(b);
	});

	it('documents the error envelope for routes that can fail', () => {
		const doc = buildOpenApi('https://example.test') as {
			paths: Record<string, { get: { responses: Record<string, unknown> } }>;
		};
		const paragraph = doc.paths['/api/cec/{number}']!.get.responses;
		expect(paragraph['400']).toBeDefined();
		expect(JSON.stringify(paragraph['400'])).toContain('paragraph_out_of_range');
	});
});
