# API Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the study-panel data through the public JSON API, and make that API callable from a browser.

**Architecture:** Thin SvelteKit `+server.ts` routes over the existing `$lib/data/loaders` functions. A shared `src/lib/server/api/` module owns the pieces that must not drift: the CORS/cache/error helpers, the `include` parser, the block registry, and the OpenAPI source of truth. No data is duplicated and no loader is rewritten.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes only), TypeScript strict, Cloudflare Pages + Workers, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-02-api-expansion-design.md`

## Global Constraints

- **No em dashes.** Use middot (`·`), comma, parentheses, or rewrite. Applies to user-facing copy, code comments, and log strings.
- **No French thousands separators in numerals.** Write `2865`, not `2 865`.
- **No `§` markers in our own user-facing text.** Prefer "paragraphe N" or the bare number.
- **Svelte 5 runes only.** `$props()`, `$state()`, `$derived()`, `$effect()`, `import { page } from '$app/state'`. No v4 syntax anywhere.
- **TypeScript strict.** No `any`. `npm run check` must pass.
- **Additive only.** No documented field may be removed or renamed from `/api/cec/{n}` or `/api/search`. Task 1 installs the test that enforces this.
- **CCC paragraph range is 1 to 2865 inclusive.**
- **`Fetch` type** is `export type Fetch = typeof fetch` from `src/lib/data/loaders.ts:72`. Always thread the request-scoped `fetch` through to loaders; never call global `fetch` in a route.
- **Run before every commit:** `npm run format && npm run lint && npm run check && npm run test`.
- **`Paragraph.cross_refs` is `string[]`, not `number[]`** (`src/lib/data/types.ts:66`). Do not "fix" this; the existing API ships it as-is.
- **All cross-corpus indexes are keyed by CCC paragraph number as a *string***: `loadDenzingerRefs()`, `loadCdseCitedByCcc()`, `loadCompendiumCitedBy()`. Look up with `String(n)`.

---

### Task 1: HTTP foundation · CORS, error codes, and the additive-only guard

The API currently sends no `Access-Control-Allow-Origin` header anywhere, so it cannot be called from a browser on another origin. This task fixes that and installs the regression guard that every later task depends on.

**Files:**

- Create: `src/lib/server/api/http.ts`
- Modify: `src/hooks.server.ts`
- Modify: `_headers` (add CORS to the `/data/*` block)
- Modify: `src/routes/api/cec/[number=int]/+server.ts`
- Test: `tests/unit/api-http.test.ts`
- Test: `tests/e2e/api-contract.test.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `apiError(message: string, code: ApiErrorCode, status?: number): Response` · defaults `status` to 400.
  - `apiJson(body: unknown, cacheSeconds?: number): Response` · defaults to `max-age=3600, s-maxage=86400`.
  - `type ApiErrorCode = 'paragraph_out_of_range' | 'unknown_include' | 'too_many_blocks' | 'bad_date' | 'unknown_slug' | 'unknown_book' | 'query_too_short'`
  - `CORS_HEADERS: Record<string, string>`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/api-http.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/api-http.test.ts`
Expected: FAIL, "Failed to resolve import \"$lib/server/api/http\""

- [ ] **Step 3: Write the implementation**

Create `src/lib/server/api/http.ts`:

```ts
/**
 * Shared HTTP shaping for the public API. Every `/api/*` route returns
 * through these helpers so the CORS, cache and error contract stays in one
 * place · see docs/superpowers/specs/2026-09-02-api-expansion-design.md.
 */

export type ApiErrorCode =
	| 'paragraph_out_of_range'
	| 'unknown_include'
	| 'too_many_blocks'
	| 'bad_date'
	| 'unknown_slug'
	| 'unknown_book'
	| 'query_too_short';

// Read-only public data, no credentials, no cookies · `*` is correct here and
// carries no risk. Without it the documented API is uncallable from a browser
// on any other origin.
export const CORS_HEADERS: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Max-Age': '86400'
};

const DEFAULT_MAX_AGE = 3600;
const DEFAULT_S_MAX_AGE = 86400;

export function apiJson(body: unknown, cacheSeconds: number = DEFAULT_MAX_AGE): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': `public, max-age=${cacheSeconds}, s-maxage=${DEFAULT_S_MAX_AGE}`,
			...CORS_HEADERS
		}
	});
}

export function apiError(message: string, code: ApiErrorCode, status = 400): Response {
	return new Response(JSON.stringify({ error: message, code }), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			// Errors must not be cached at the edge · a transient 400 from a bad
			// query string should not be served to the next caller.
			'Cache-Control': 'no-store',
			...CORS_HEADERS
		}
	});
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/api-http.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Wire CORS into the request pipeline**

Modify `src/hooks.server.ts`. Keep the two existing redirects exactly as they are, and add the `/api/*` handling. Replace the final `return resolve(event);` with:

```ts
	if (p === '/api' || p.startsWith('/api/')) {
		// Preflight. Simple GETs do not trigger one, but a client sending a
		// custom header would, and answering it costs nothing.
		if (event.request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}
		const response = await resolve(event);
		for (const [k, v] of Object.entries(CORS_HEADERS)) {
			if (!response.headers.has(k)) response.headers.set(k, v);
		}
		return response;
	}
	return resolve(event);
```

Add the import at the top of the file:

```ts
import { CORS_HEADERS } from '$lib/server/api/http';
```

- [ ] **Step 6: Add CORS to the raw data files**

Modify `_headers`. The `/data/*` block currently reads:

```
/data/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=2592000
```

Change it to:

```
/data/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=2592000
  Access-Control-Allow-Origin: *
```

The `/api` docs page points people at `/data/cec/cited-by.json` for the raw
cross-reference relation, so it has to be fetchable cross-origin.

- [ ] **Step 7: Convert the existing paragraph route to the shared helpers**

Modify `src/routes/api/cec/[number=int]/+server.ts`. Replace the `json` import from `@sveltejs/kit` with the new helpers, keeping every response field byte-identical:

```ts
import { apiError, apiJson } from '$lib/server/api/http';
```

Replace the out-of-range branch:

```ts
	if (!Number.isInteger(n) || n < FIRST || n > LAST) {
		return apiError(
			`Numéro de paragraphe invalide : le Catéchisme va de ${FIRST} à ${LAST}.`,
			'paragraph_out_of_range',
			404
		);
	}
```

Replace the success `json(...)` call with `apiJson(...)`, dropping the inline
`headers` object because `apiJson` now supplies the identical `Cache-Control`.
The response body object itself must not change.

- [ ] **Step 8: Write the additive-only contract guard**

Create `tests/e2e/api-contract.test.ts`:

```ts
import { test, expect } from '@playwright/test';

// These key sets are a public contract. Adding a key here is allowed only
// when the field is genuinely new and documented; REMOVING or RENAMING one is
// a breaking change and must not happen without a /api/v2.
const PARAGRAPH_KEYS = [
	'number',
	'corpus',
	'text_html',
	'text',
	'cross_refs',
	'bible_refs',
	'citations',
	'magisterial_refs',
	'breadcrumb',
	'prev',
	'next',
	'permalink'
];

const SEARCH_KEYS = ['q', 'hits', 'mode', 'tokens', 'matchedTokens', 'suggestions'];

test('GET /api/cec/2559 returns exactly the documented key set', async ({ request }) => {
	const res = await request.get('/api/cec/2559');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(Object.keys(body).sort()).toEqual([...PARAGRAPH_KEYS].sort());
});

test('GET /api/search returns exactly the documented key set', async ({ request }) => {
	const res = await request.get('/api/search?q=eucharistie');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(Object.keys(body).sort()).toEqual([...SEARCH_KEYS].sort());
});

test('the paragraph route is callable cross-origin', async ({ request }) => {
	const res = await request.get('/api/cec/1');
	expect(res.headers()['access-control-allow-origin']).toBe('*');
});

test('an out-of-range paragraph returns a coded 404', async ({ request }) => {
	const res = await request.get('/api/cec/9999');
	expect(res.status()).toBe(404);
	const body = await res.json();
	expect(body.code).toBe('paragraph_out_of_range');
	expect(typeof body.error).toBe('string');
});
```

Note: `/api/cec/9999` must reach the handler rather than the `int` param
matcher rejecting it. `9999` is a valid integer, so it does. A non-integer like
`/api/cec/abc` correctly 404s from the router instead, which is why the test
uses a numeric value.

- [ ] **Step 9: Run the full suite**

Run: `npm run format && npm run lint && npm run check && npm run test && npm run test:e2e`
Expected: all PASS. If the e2e contract test reports extra keys on `/api/cec/2559`, Step 7 changed the body · revert that change, the body must stay identical.

- [ ] **Step 10: Commit**

```bash
git add src/lib/server/api/http.ts src/hooks.server.ts _headers \
  src/routes/api/cec/'[number=int]'/+server.ts \
  tests/unit/api-http.test.ts tests/e2e/api-contract.test.ts
git commit -m "feat(api): CORS, machine-readable error codes, contract guard"
```

---

### Task 2: The `include` parser

**Files:**

- Create: `src/lib/server/api/include.ts`
- Test: `tests/unit/api-include.test.ts`

**Interfaces:**

- Consumes: `ApiErrorCode` from `src/lib/server/api/http.ts`.
- Produces:
  - `type BlockName = 'cited_by' | 'themes' | 'sources' | 'liturgy' | 'compendium' | 'en_bref' | 'bible' | 'cdse' | 'denzinger' | 'ai'`
  - `const ALL_BLOCKS: readonly BlockName[]` · all ten, in the order above.
  - `const DEFAULT_ALL: readonly BlockName[]` · the nine excluding `ai`.
  - `const MAX_EXPLICIT_BLOCKS = 8`
  - `parseInclude(raw: string | null): { ok: true; blocks: BlockName[] } | { ok: false; message: string; code: ApiErrorCode }`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/api-include.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseInclude, ALL_BLOCKS, DEFAULT_ALL } from '$lib/server/api/include';

describe('parseInclude', () => {
	it('returns no blocks when the parameter is absent', () => {
		const r = parseInclude(null);
		expect(r).toEqual({ ok: true, blocks: [] });
	});

	it('returns no blocks for an empty string', () => {
		expect(parseInclude('')).toEqual({ ok: true, blocks: [] });
	});

	it('parses a comma-separated list', () => {
		const r = parseInclude('themes,sources');
		expect(r).toEqual({ ok: true, blocks: ['themes', 'sources'] });
	});

	it('trims whitespace and deduplicates', () => {
		const r = parseInclude(' themes , themes,  sources ');
		expect(r).toEqual({ ok: true, blocks: ['themes', 'sources'] });
	});

	it('expands all to the nine non-ai blocks', () => {
		const r = parseInclude('all');
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.blocks).toEqual([...DEFAULT_ALL]);
		expect(r.blocks).not.toContain('ai');
		expect(r.blocks).toHaveLength(9);
	});

	it('lets ai be requested alongside all', () => {
		const r = parseInclude('all,ai');
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.blocks).toContain('ai');
		expect(r.blocks).toHaveLength(10);
	});

	it('rejects an unknown block by name', () => {
		const r = parseInclude('themes,trent');
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('unknown_include');
		expect(r.message).toContain('trent');
	});

	it('rejects more than eight explicitly named blocks', () => {
		const r = parseInclude(ALL_BLOCKS.slice(0, 9).join(','));
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('too_many_blocks');
	});

	it('does not apply the explicit cap to all', () => {
		expect(parseInclude('all').ok).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/api-include.test.ts`
Expected: FAIL, "Failed to resolve import \"$lib/server/api/include\""

- [ ] **Step 3: Write the implementation**

Create `src/lib/server/api/include.ts`:

```ts
import type { ApiErrorCode } from './http';

export type BlockName =
	| 'cited_by'
	| 'themes'
	| 'sources'
	| 'liturgy'
	| 'compendium'
	| 'en_bref'
	| 'bible'
	| 'cdse'
	| 'denzinger'
	| 'ai';

export const ALL_BLOCKS: readonly BlockName[] = [
	'cited_by',
	'themes',
	'sources',
	'liturgy',
	'compendium',
	'en_bref',
	'bible',
	'cdse',
	'denzinger',
	'ai'
];

/** What `include=all` expands to · everything except the generated commentary. */
export const DEFAULT_ALL: readonly BlockName[] = ALL_BLOCKS.filter((b) => b !== 'ai');

/**
 * Cap on explicitly enumerated blocks. `all` is deliberately exempt: it is one
 * token that expands to nine, and rejecting it would make the shorthand
 * useless.
 */
export const MAX_EXPLICIT_BLOCKS = 8;

export type IncludeResult =
	| { ok: true; blocks: BlockName[] }
	| { ok: false; message: string; code: ApiErrorCode };

function isBlockName(s: string): s is BlockName {
	return (ALL_BLOCKS as readonly string[]).includes(s);
}

export function parseInclude(raw: string | null): IncludeResult {
	if (!raw || raw.trim() === '') return { ok: true, blocks: [] };

	const tokens = raw
		.split(',')
		.map((t) => t.trim())
		.filter((t) => t.length > 0);

	const explicit: BlockName[] = [];
	let sawAll = false;

	for (const t of tokens) {
		if (t === 'all') {
			sawAll = true;
			continue;
		}
		if (!isBlockName(t)) {
			return {
				ok: false,
				code: 'unknown_include',
				message: `Bloc inconnu dans include : « ${t} ». Valeurs acceptées : ${ALL_BLOCKS.join(', ')}, all.`
			};
		}
		explicit.push(t);
	}

	const uniqueExplicit = [...new Set(explicit)];

	if (!sawAll && uniqueExplicit.length > MAX_EXPLICIT_BLOCKS) {
		return {
			ok: false,
			code: 'too_many_blocks',
			message: `include accepte au plus ${MAX_EXPLICIT_BLOCKS} blocs nommés (${uniqueExplicit.length} demandés). Utilisez include=all, ou répartissez la demande sur plusieurs requêtes.`
		};
	}

	// Preserve ALL_BLOCKS order for `all` so the response key order is stable,
	// and caller order for an explicit list so a client sees what it asked for.
	const merged = sawAll ? [...DEFAULT_ALL, ...uniqueExplicit] : uniqueExplicit;
	return { ok: true, blocks: [...new Set(merged)] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/api-include.test.ts`
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
npm run format && npm run lint && npm run check
git add src/lib/server/api/include.ts tests/unit/api-include.test.ts
git commit -m "feat(api): include parameter parser with block caps"
```

---

### Task 3: Block registry, assembler, and the first three blocks

Delivers `?include=cited_by,themes,sources` working end to end on `/api/cec/{n}`, plus the failure-isolation machinery every later block relies on.

**Files:**

- Create: `src/lib/server/api/blocks/citedBy.ts`
- Create: `src/lib/server/api/blocks/themes.ts`
- Create: `src/lib/server/api/blocks/sources.ts`
- Create: `src/lib/server/api/blocks/index.ts`
- Modify: `src/routes/api/cec/[number=int]/+server.ts`
- Test: `tests/unit/api-blocks.test.ts`

**Interfaces:**

- Consumes: `BlockName`, `parseInclude` from `src/lib/server/api/include.ts`; `apiError`, `apiJson` from `src/lib/server/api/http.ts`; `Fetch` from `$lib/data/types` (re-exported from loaders).
- Produces:
  - `type BlockFn = (n: number, fetcher: Fetch) => Promise<unknown>`
  - `const BLOCKS: Record<BlockName, BlockFn>` · this task registers three of ten; Tasks 4, 5 and 6 fill the rest.
  - `assembleBlocks(n: number, blocks: BlockName[], fetcher: Fetch): Promise<{ data: Record<string, unknown>; partial: BlockName[] }>`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/api-blocks.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { assembleBlocks, BLOCKS } from '$lib/server/api/blocks';

// Minimal fetch double: maps a URL substring to a JSON payload. Anything not
// listed resolves to a 404, which is what the isolation test needs.
function fakeFetch(routes: Record<string, unknown>): typeof fetch {
	return (async (input: RequestInfo | URL) => {
		const url = String(input);
		for (const [frag, payload] of Object.entries(routes)) {
			if (url.includes(frag)) {
				return { ok: true, status: 200, json: async () => payload, text: async () => '' };
			}
		}
		return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
	}) as unknown as typeof fetch;
}

describe('assembleBlocks', () => {
	it('returns an empty object for no blocks', async () => {
		const r = await assembleBlocks(1, [], fakeFetch({}));
		expect(r).toEqual({ data: {}, partial: [] });
	});

	it('places each block under its own top-level key', async () => {
		const f = fakeFetch({
			'cited-by.json': { '2559': [2098, 2721] },
			'paragraph-themes.json': { '2559': [{ name: 'Prière', slug: 'priere' }] }
		});
		const r = await assembleBlocks(2559, ['cited_by', 'themes'], f);
		expect(r.partial).toEqual([]);
		expect(r.data.cited_by).toEqual([2098, 2721]);
		expect(r.data.themes).toEqual([
			{ name: 'Prière', slug: 'priere', glossary_url: '/glossaire/priere' }
		]);
	});

	it('returns an empty array when the paragraph has no entry', async () => {
		const f = fakeFetch({ 'cited-by.json': { '13': [1231] } });
		const r = await assembleBlocks(2559, ['cited_by'], f);
		expect(r.data.cited_by).toEqual([]);
		expect(r.partial).toEqual([]);
	});

	it('isolates a failing block instead of failing the response', async () => {
		const boom = vi.fn(async () => {
			throw new Error('shard exploded');
		});
		const original = BLOCKS.themes;
		BLOCKS.themes = boom;
		try {
			const f = fakeFetch({ 'cited-by.json': { '2559': [2098] } });
			const r = await assembleBlocks(2559, ['cited_by', 'themes'], f);
			expect(r.data.cited_by).toEqual([2098]);
			expect(r.data.themes).toBeNull();
			expect(r.partial).toEqual(['themes']);
		} finally {
			BLOCKS.themes = original;
		}
	});

	it('sources returns the filtered magisterial refs with abbreviations expanded', async () => {
		const f = fakeFetch({
			'/paragraphs/2559.json': {
				corpus: 'ccc',
				number: 2559,
				text_html: '<span>x</span>',
				cross_refs: [],
				bible_refs: [],
				citations: [],
				magisterial_refs: [
					{ type: 'magisterial', raw: 'GS 19, 1' },
					{ type: 'bible', raw: 'Ps 130, 1' }
				]
			},
			'abbreviations.json': { GS: 'Gaudium et Spes' },
			'sources-index.json': [
				{ category: 'Conciles', doc_name: 'GS', location: '19', paragraphs: [2559] },
				{ category: 'Conciles', doc_name: 'LG', location: '1', paragraphs: [1] }
			]
		});
		const r = await assembleBlocks(2559, ['sources'], f);
		expect(r.data.sources).toEqual({
			refs: [{ type: 'magisterial', raw: 'GS 19, 1', display: 'Gaudium et Spes 19, 1' }],
			documents: [{ category: 'Conciles', doc_name: 'GS', location: '19' }]
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/api-blocks.test.ts`
Expected: FAIL, "Failed to resolve import \"$lib/server/api/blocks\""

- [ ] **Step 3: Write the three block modules**

Create `src/lib/server/api/blocks/citedBy.ts`:

```ts
import { loadCitedBy } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

/** CCC paragraphs that cross-reference this one · the reverse of `cross_refs`. */
export async function citedByBlock(n: number, fetcher: Fetch): Promise<number[]> {
	const index = await loadCitedBy(fetcher);
	return (index as Record<string, number[]>)[String(n)] ?? [];
}
```

Create `src/lib/server/api/blocks/themes.ts`:

```ts
import { loadParagraphThemes } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

export interface ApiTheme {
	name: string;
	slug: string;
	/** Theme slugs and glossary slugs are one namespace · see the spec. */
	glossary_url: string;
}

export async function themesBlock(n: number, fetcher: Fetch): Promise<ApiTheme[]> {
	const index = await loadParagraphThemes(fetcher);
	const mine = index[String(n)] ?? [];
	return mine.map((t) => ({
		name: t.name,
		slug: t.slug,
		glossary_url: `/glossaire/${t.slug}`
	}));
}
```

Create `src/lib/server/api/blocks/sources.ts`:

```ts
import { loadParagraph, loadAbbreviations, loadSourcesIndex } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';
import type { AbbreviationMap } from '$lib/data/types';

export interface ApiSourceRef {
	type: string;
	raw: string;
	/** `raw` with its leading abbreviation expanded, e.g. "GS 19" to "Gaudium et Spes 19". */
	display: string;
}

export interface ApiSourceDocument {
	category: string;
	doc_name: string;
	location: string;
}

export interface ApiSources {
	refs: ApiSourceRef[];
	documents: ApiSourceDocument[];
}

// Same rule the Sources tab applies · scripture refs are already served in
// `bible_refs`, so they would be duplicated noise here.
const SOURCE_TYPES = new Set(['magisterial', 'patristic', 'liturgical']);

function expand(raw: string, abbrs: AbbreviationMap): string {
	const m = raw.match(/^([A-Z][A-Za-z]*)\b/);
	if (!m) return raw;
	const full = abbrs[m[1]!];
	if (!full) return raw;
	return raw.replace(m[1]!, full);
}

export async function sourcesBlock(n: number, fetcher: Fetch): Promise<ApiSources> {
	const [paragraph, abbrs, index] = await Promise.all([
		loadParagraph(n, fetcher),
		loadAbbreviations(fetcher),
		loadSourcesIndex(fetcher)
	]);

	const refs = paragraph.magisterial_refs
		.filter((r) => SOURCE_TYPES.has(r.type))
		.map((r) => ({ type: r.type, raw: r.raw, display: expand(r.raw, abbrs) }));

	const documents = index
		.filter((e) => e.paragraphs.includes(n))
		.map((e) => ({ category: e.category, doc_name: e.doc_name, location: e.location }));

	return { refs, documents };
}
```

- [ ] **Step 4: Write the registry and assembler**

Create `src/lib/server/api/blocks/index.ts`:

```ts
import type { Fetch } from '$lib/data/loaders';
import type { BlockName } from '../include';
import { citedByBlock } from './citedBy';
import { themesBlock } from './themes';
import { sourcesBlock } from './sources';

export type BlockFn = (n: number, fetcher: Fetch) => Promise<unknown>;

/**
 * One entry per include block. Adding a block is one module plus one line
 * here · nothing else in the routing layer changes.
 *
 * Not `const`: the unit tests swap an entry to exercise failure isolation.
 */
export const BLOCKS: Record<BlockName, BlockFn> = {
	cited_by: citedByBlock,
	themes: themesBlock,
	sources: sourcesBlock,
	// Filled in by Tasks 4, 5 and 6.
	liturgy: notImplemented('liturgy'),
	compendium: notImplemented('compendium'),
	en_bref: notImplemented('en_bref'),
	bible: notImplemented('bible'),
	cdse: notImplemented('cdse'),
	denzinger: notImplemented('denzinger'),
	ai: notImplemented('ai')
};

function notImplemented(name: string): BlockFn {
	return async () => {
		throw new Error(`include block not yet implemented: ${name}`);
	};
}

export interface AssembledBlocks {
	data: Record<string, unknown>;
	/** Blocks that threw · their key is present but null. */
	partial: BlockName[];
}

/**
 * Resolve every requested block in parallel. A block that throws yields null
 * and is named in `partial` rather than failing the whole response: a client
 * asking for eight blocks must not lose the paragraph text because one shard
 * 404'd.
 */
export async function assembleBlocks(
	n: number,
	blocks: BlockName[],
	fetcher: Fetch
): Promise<AssembledBlocks> {
	const settled = await Promise.all(
		blocks.map(async (name) => {
			try {
				return { name, value: await BLOCKS[name](n, fetcher), failed: false };
			} catch {
				return { name, value: null, failed: true };
			}
		})
	);

	const data: Record<string, unknown> = {};
	const partial: BlockName[] = [];
	for (const { name, value, failed } of settled) {
		data[name] = value;
		if (failed) partial.push(name);
	}
	return { data, partial };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/api-blocks.test.ts`
Expected: PASS, 5 tests

- [ ] **Step 6: Wire `include` into the paragraph route**

Modify `src/routes/api/cec/[number=int]/+server.ts`. Add imports:

```ts
import { parseInclude } from '$lib/server/api/include';
import { assembleBlocks } from '$lib/server/api/blocks';
```

After the range check and before the `Promise.all`, add:

```ts
	const inc = parseInclude(url.searchParams.get('include'));
	if (!inc.ok) return apiError(inc.message, inc.code);
```

Change the existing `Promise.all` to fetch the blocks alongside the paragraph:

```ts
	const [paragraph, context, blocks] = await Promise.all([
		loadParagraph(n, fetch),
		loadParagraphContext(n, fetch),
		assembleBlocks(n, inc.blocks, fetch)
	]);
```

Then, in the response object, add the block keys and the `partial` marker
**after** `permalink`, so the documented key order is untouched when no
`include` is passed:

```ts
			permalink: `${url.origin}/cec/${n}`,
			...blocks.data,
			...(blocks.partial.length > 0 ? { partial: blocks.partial } : {})
```

When `include` is absent, `blocks.data` is `{}` and `partial` is omitted, so
the response is byte-identical to today. The Task 1 contract test proves it.

- [ ] **Step 7: Verify the contract still holds**

Run: `npm run test:e2e -- tests/e2e/api-contract.test.ts`
Expected: PASS. A failure here means the default response shape changed, which is a breaking change · fix the route, do not edit the test's key list.

- [ ] **Step 8: Commit**

```bash
npm run format && npm run lint && npm run check && npm run test
git add src/lib/server/api/blocks src/routes/api/cec/'[number=int]'/+server.ts \
  tests/unit/api-blocks.test.ts
git commit -m "feat(api): include blocks for cited_by, themes and sources"
```

---

### Task 4: The remaining CCC-internal blocks · `en_bref`, `bible`, `liturgy`

**Files:**

- Create: `src/lib/server/api/blocks/enBref.ts`
- Create: `src/lib/server/api/blocks/bible.ts`
- Create: `src/lib/server/api/blocks/liturgy.ts`
- Modify: `src/lib/server/api/blocks/index.ts`
- Test: `tests/unit/api-blocks-ccc.test.ts`

**Interfaces:**

- Consumes: `BlockFn` and the `BLOCKS` registry from `src/lib/server/api/blocks/index.ts`; `Fetch` from `$lib/data/loaders`.
- Produces: `enBrefBlock`, `bibleBlock`, `liturgyBlock`, each `(n: number, fetcher: Fetch) => Promise<unknown>`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/api-blocks-ccc.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { assembleBlocks } from '$lib/server/api/blocks';

function fakeFetch(routes: Record<string, unknown>): typeof fetch {
	return (async (input: RequestInfo | URL) => {
		const url = String(input);
		for (const [frag, payload] of Object.entries(routes)) {
			if (url.includes(frag)) {
				return { ok: true, status: 200, json: async () => payload, text: async () => '' };
			}
		}
		return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
	}) as unknown as typeof fetch;
}

describe('en_bref block', () => {
	it('returns the summary range covering the paragraph', async () => {
		const f = fakeFetch({
			'en-brefs-index.json': [
				{ first: 44, last: 49, paragraphs: [44, 45], parent_kind: 'chapter', parent_slug: 'x' },
				{ first: 68, last: 73, paragraphs: [68], parent_kind: 'chapter', parent_slug: 'y' }
			]
		});
		const r = await assembleBlocks(70, ['en_bref'], f);
		expect(r.data.en_bref).toEqual({
			first: 68,
			last: 73,
			paragraphs: [68],
			parent_kind: 'chapter',
			parent_slug: 'y'
		});
	});

	it('returns null when no summary covers the paragraph', async () => {
		const f = fakeFetch({ 'en-brefs-index.json': [{ first: 44, last: 49, paragraphs: [44] }] });
		const r = await assembleBlocks(2000, ['en_bref'], f);
		expect(r.data.en_bref).toBeNull();
		expect(r.partial).toEqual([]);
	});
});

describe('bible block', () => {
	it('resolves each scripture reference to a book slug and URL', async () => {
		const f = fakeFetch({
			'/paragraphs/2559.json': {
				corpus: 'ccc',
				number: 2559,
				text_html: '<span>x</span>',
				cross_refs: [],
				bible_refs: [{ text: 'Ps 130, 1', book: 'Ps', chapter: 130, verseStart: 1 }],
				citations: [],
				magisterial_refs: []
			}
		});
		const r = await assembleBlocks(2559, ['bible'], f);
		expect(r.data.bible).toEqual([
			{
				text: 'Ps 130, 1',
				book: 'Ps',
				book_slug: 'psaumes',
				book_name: 'Psaumes',
				chapter: 130,
				verse_start: 1,
				verse_end: null,
				url: '/bible/psaumes/130'
			}
		]);
	});

	it('keeps an unrecognised abbreviation without inventing a URL', async () => {
		const f = fakeFetch({
			'/paragraphs/7.json': {
				corpus: 'ccc',
				number: 7,
				text_html: '<span>x</span>',
				cross_refs: [],
				bible_refs: [{ text: 'Zz 1, 1', book: 'Zz', chapter: 1, verseStart: 1 }],
				citations: [],
				magisterial_refs: []
			}
		});
		const r = await assembleBlocks(7, ['bible'], f);
		const refs = r.data.bible as Array<Record<string, unknown>>;
		expect(refs[0]!.book_slug).toBeNull();
		expect(refs[0]!.url).toBeNull();
	});
});

describe('liturgy block', () => {
	it('returns the occasions that propose the paragraph for meditation', async () => {
		const f = fakeFetch({
			'/calendrier/cec/25.json': {
				occasions: [
					{
						slug: 'troisieme-dimanche-de-lavent',
						title: 'Troisième Dimanche de l’Avent',
						season: 'avent',
						color: 'rose',
						cycle: 'a',
						clusters: [{ theme: 'la joie', paragraphs: [2559] }]
					}
				],
				paragraphs: { '2559': [0] }
			}
		});
		const r = await assembleBlocks(2559, ['liturgy'], f);
		expect(r.data.liturgy).toEqual([
			{
				slug: 'troisieme-dimanche-de-lavent',
				title: 'Troisième Dimanche de l’Avent',
				season: 'avent',
				color: 'rose',
				cycle: 'a',
				themes: ['la joie']
			}
		]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/api-blocks-ccc.test.ts`
Expected: FAIL, "include block not yet implemented: en_bref"

- [ ] **Step 3: Write the three block modules**

Create `src/lib/server/api/blocks/enBref.ts`:

```ts
import { loadEnBrefsIndex } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

export interface ApiEnBref {
	first: number;
	last: number;
	paragraphs: number[];
	parent_kind?: string;
	parent_slug?: string;
}

/** The "En Bref" summary block whose range covers this paragraph, if any. */
export async function enBrefBlock(n: number, fetcher: Fetch): Promise<ApiEnBref | null> {
	const index = await loadEnBrefsIndex(fetcher);
	const hit = index.find((e) => n >= e.first && n <= e.last);
	if (!hit) return null;
	return {
		first: hit.first,
		last: hit.last,
		paragraphs: hit.paragraphs,
		...(hit.parent_kind ? { parent_kind: hit.parent_kind } : {}),
		...(hit.parent_slug ? { parent_slug: hit.parent_slug } : {})
	};
}
```

Create `src/lib/server/api/blocks/bible.ts`:

```ts
import { loadParagraph } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';
import { bookByAbbr } from '$lib/utils/bibleBookSlug';

export interface ApiBibleRef {
	text: string;
	book: string | null;
	book_slug: string | null;
	book_name: string | null;
	chapter: number | null;
	verse_start: number | null;
	verse_end: number | null;
	url: string | null;
}

/**
 * The paragraph's scripture citations, resolved to book slugs so a client can
 * link straight into the Bible reader. `bible_refs` already ships in the
 * default response as raw strings · this block adds the resolution.
 */
export async function bibleBlock(n: number, fetcher: Fetch): Promise<ApiBibleRef[]> {
	const paragraph = await loadParagraph(n, fetcher);
	return paragraph.bible_refs.map((r) => {
		const book = r.book ? bookByAbbr(r.book) : undefined;
		return {
			text: r.text,
			book: r.book ?? null,
			book_slug: book?.slug ?? null,
			book_name: book?.frenchName ?? null,
			chapter: r.chapter ?? null,
			verse_start: r.verseStart ?? null,
			verse_end: r.verseEnd ?? null,
			url: book && r.chapter ? `/bible/${book.slug}/${r.chapter}` : null
		};
	});
}
```

Create `src/lib/server/api/blocks/liturgy.ts`:

```ts
import { loadCecLiturgy } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

export interface ApiLiturgyOccasion {
	slug: string;
	title: string;
	season: string;
	color: string;
	cycle?: string;
	date?: string;
	/** Only the themes whose cluster actually contains this paragraph. */
	themes: string[];
}

/**
 * Liturgical days on which this paragraph is proposed for meditation
 * alongside the readings. CEC paragraphs are not read at Mass · the wording
 * here must stay "proposé à la méditation", never "lu" or "proclamé".
 */
export async function liturgyBlock(n: number, fetcher: Fetch): Promise<ApiLiturgyOccasion[]> {
	const occasions = await loadCecLiturgy(n, fetcher);
	return occasions.map((o) => ({
		slug: o.slug,
		title: o.title,
		season: o.season,
		color: o.color,
		...(o.cycle ? { cycle: o.cycle } : {}),
		...(o.date ? { date: o.date } : {}),
		themes: o.clusters.filter((c) => c.paragraphs.includes(n)).map((c) => c.theme)
	}));
}
```

- [ ] **Step 4: Register the three blocks**

Modify `src/lib/server/api/blocks/index.ts`. Add the imports:

```ts
import { enBrefBlock } from './enBref';
import { bibleBlock } from './bible';
import { liturgyBlock } from './liturgy';
```

Replace the three `notImplemented` entries in `BLOCKS`:

```ts
	liturgy: liturgyBlock,
	en_bref: enBrefBlock,
	bible: bibleBlock,
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/api-blocks-ccc.test.ts`
Expected: PASS, 5 tests

- [ ] **Step 6: Commit**

```bash
npm run format && npm run lint && npm run check && npm run test
git add src/lib/server/api/blocks tests/unit/api-blocks-ccc.test.ts
git commit -m "feat(api): en_bref, bible and liturgy include blocks"
```

---

### Task 5: The cross-corpus blocks · `compendium`, `cdse`, `denzinger`

All three source indexes are keyed by **CCC paragraph number as a string**, verified against the data files:

- `static/data/compendium/cited-by.json` · `{"1":[1],"2":[1],…}` · CCC paragraph to Compendium question numbers.
- `static/data/cdse/cited-by-ccc.json` via `loadCdseCitedByCcc()` · CCC paragraph to CDSE paragraph numbers.
- `static/data/enchiridion/refs.json` via `loadDenzingerRefs()` · `{"1":[160,170],…}` · CCC paragraph to Denzinger numbers. **Use `refs.json`, not `cited-by.json`** · the latter is keyed by Denzinger number and is the inverse relation.

**Files:**

- Create: `src/lib/server/api/blocks/compendium.ts`
- Create: `src/lib/server/api/blocks/cdse.ts`
- Create: `src/lib/server/api/blocks/denzinger.ts`
- Modify: `src/lib/server/api/blocks/index.ts`
- Test: `tests/unit/api-blocks-corpora.test.ts`

**Interfaces:**

- Consumes: `BLOCKS` registry from `src/lib/server/api/blocks/index.ts`.
- Produces: `compendiumBlock`, `cdseBlock`, `denzingerBlock`, each `(n: number, fetcher: Fetch) => Promise<unknown>`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/api-blocks-corpora.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { assembleBlocks } from '$lib/server/api/blocks';

function fakeFetch(routes: Record<string, unknown>): typeof fetch {
	return (async (input: RequestInfo | URL) => {
		const url = String(input);
		for (const [frag, payload] of Object.entries(routes)) {
			if (url.includes(frag)) {
				return { ok: true, status: 200, json: async () => payload, text: async () => '' };
			}
		}
		return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
	}) as unknown as typeof fetch;
}

describe('compendium block', () => {
	it('returns the Compendium questions covering the paragraph', async () => {
		const f = fakeFetch({ 'compendium/cited-by.json': { '1': [1], '2559': [534, 535] } });
		const r = await assembleBlocks(2559, ['compendium'], f);
		expect(r.data.compendium).toEqual([
			{ question: 534, url: '/compendium/534' },
			{ question: 535, url: '/compendium/535' }
		]);
	});

	it('returns an empty array when the paragraph maps to nothing', async () => {
		const f = fakeFetch({ 'compendium/cited-by.json': { '1': [1] } });
		const r = await assembleBlocks(2559, ['compendium'], f);
		expect(r.data.compendium).toEqual([]);
	});
});

describe('cdse block', () => {
	it('returns the social-doctrine paragraphs citing this one', async () => {
		const f = fakeFetch({ 'cdse/cited-by-ccc.json': { '2559': [17, 20] } });
		const r = await assembleBlocks(2559, ['cdse'], f);
		expect(r.data.cdse).toEqual([
			{ paragraph: 17, url: '/doctrine-sociale/17' },
			{ paragraph: 20, url: '/doctrine-sociale/20' }
		]);
	});
});

describe('denzinger block', () => {
	it('uses refs.json, which is keyed by CCC paragraph', async () => {
		const f = fakeFetch({
			'enchiridion/refs.json': { '1': [160, 170] },
			'enchiridion/index.json': {
				'160': { unit_slug: 'symbole-de-foi' },
				'170': { unit_slug: 'symbole-de-foi' }
			}
		});
		const r = await assembleBlocks(1, ['denzinger'], f);
		expect(r.data.denzinger).toEqual([
			{ number: 160, unit_slug: 'symbole-de-foi', url: '/enchiridion/symbole-de-foi' },
			{ number: 170, unit_slug: 'symbole-de-foi', url: '/enchiridion/symbole-de-foi' }
		]);
	});

	it('omits the URL for a number missing from the index', async () => {
		const f = fakeFetch({
			'enchiridion/refs.json': { '1': [9999] },
			'enchiridion/index.json': {}
		});
		const r = await assembleBlocks(1, ['denzinger'], f);
		expect(r.data.denzinger).toEqual([{ number: 9999, unit_slug: null, url: null }]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/api-blocks-corpora.test.ts`
Expected: FAIL, "include block not yet implemented: compendium"

- [ ] **Step 3: Write the three block modules**

Create `src/lib/server/api/blocks/compendium.ts`:

```ts
import { loadCompendiumCitedBy } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

export interface ApiCompendiumRef {
	question: number;
	url: string;
}

/** Compendium questions that draw on this CCC paragraph. */
export async function compendiumBlock(n: number, fetcher: Fetch): Promise<ApiCompendiumRef[]> {
	const index = await loadCompendiumCitedBy(fetcher);
	const questions = (index as unknown as Record<string, number[]>)[String(n)] ?? [];
	return questions.map((q) => ({ question: q, url: `/compendium/${q}` }));
}
```

Create `src/lib/server/api/blocks/cdse.ts`:

```ts
import { loadCdseCitedByCcc } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

export interface ApiCdseRef {
	paragraph: number;
	url: string;
}

/** Compendium de la doctrine sociale paragraphs that cite this CCC paragraph. */
export async function cdseBlock(n: number, fetcher: Fetch): Promise<ApiCdseRef[]> {
	const index = await loadCdseCitedByCcc(fetcher);
	const paragraphs = index[String(n)] ?? [];
	return paragraphs.map((p) => ({ paragraph: p, url: `/doctrine-sociale/${p}` }));
}
```

Create `src/lib/server/api/blocks/denzinger.ts`:

```ts
import { loadDenzingerRefs, loadDenzingerIndex } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

export interface ApiDenzingerRef {
	number: number;
	unit_slug: string | null;
	url: string | null;
}

/**
 * Enchiridion Symbolorum entries this CCC paragraph cites.
 *
 * `refs.json` is keyed by CCC paragraph; `cited-by.json` is the inverse,
 * keyed by Denzinger number. Using the wrong one silently returns plausible
 * but incorrect numbers, so this is deliberate.
 */
export async function denzingerBlock(n: number, fetcher: Fetch): Promise<ApiDenzingerRef[]> {
	const [refs, index] = await Promise.all([loadDenzingerRefs(fetcher), loadDenzingerIndex(fetcher)]);
	const numbers = refs[String(n)] ?? [];
	return numbers.map((num) => {
		const slug = index[String(num)]?.unit_slug ?? null;
		return {
			number: num,
			unit_slug: slug,
			url: slug ? `/enchiridion/${slug}` : null
		};
	});
}
```

- [ ] **Step 4: Register the three blocks**

Modify `src/lib/server/api/blocks/index.ts`. Add the imports:

```ts
import { compendiumBlock } from './compendium';
import { cdseBlock } from './cdse';
import { denzingerBlock } from './denzinger';
```

Replace the three `notImplemented` entries:

```ts
	compendium: compendiumBlock,
	cdse: cdseBlock,
	denzinger: denzingerBlock,
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/api-blocks-corpora.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 6: Confirm the URL prefixes against the corpus registry**

Run: `grep -n "urlPrefix" src/lib/corpora.ts | head -30`
Expected: `compendium`, `doctrine-sociale` (for the `cdse` id) and `enchiridion` (for the `denzinger` id) appear as written above. If any prefix differs, fix the block module to match the registry · `src/lib/corpora.ts` is the single source of truth for public URL prefixes.

- [ ] **Step 7: Commit**

```bash
npm run format && npm run lint && npm run check && npm run test
git add src/lib/server/api/blocks tests/unit/api-blocks-corpora.test.ts
git commit -m "feat(api): compendium, cdse and denzinger include blocks"
```

---

### Task 6: The fenced `ai` block

Generated commentary must never be mistaken for the Catechism. This block is excluded from `include=all`, absent by default, and self-labelling.

**Files:**

- Create: `src/lib/server/api/blocks/ai.ts`
- Modify: `src/lib/server/api/blocks/index.ts`
- Test: `tests/unit/api-blocks-ai.test.ts`

**Interfaces:**

- Consumes: `BLOCKS` registry.
- Produces: `aiBlock(n: number, fetcher: Fetch): Promise<ApiAiExplanation | null>` where `ApiAiExplanation = { generated: true; notice: string; markdown: string }`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/api-blocks-ai.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { assembleBlocks } from '$lib/server/api/blocks';
import { parseInclude } from '$lib/server/api/include';

function fakeFetch(routes: Record<string, unknown>): typeof fetch {
	return (async (input: RequestInfo | URL) => {
		const url = String(input);
		for (const [frag, payload] of Object.entries(routes)) {
			if (url.includes(frag)) {
				return { ok: true, status: 200, json: async () => payload, text: async () => '' };
			}
		}
		return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
	}) as unknown as typeof fetch;
}

describe('ai block', () => {
	it('labels the payload as generated and carries a notice', async () => {
		const f = fakeFetch({ '/cec/ai/1.json': { md: 'Ce paragraphe enseigne…' } });
		const r = await assembleBlocks(1, ['ai'], f);
		expect(r.data.ai).toEqual({
			generated: true,
			notice:
				'Commentaire généré automatiquement. Ce texte n’appartient pas au Catéchisme et n’a aucune autorité magistérielle.',
			markdown: 'Ce paragraphe enseigne…'
		});
	});

	it('returns null when no explanation exists', async () => {
		const r = await assembleBlocks(1, ['ai'], fakeFetch({}));
		expect(r.data.ai).toBeNull();
		expect(r.partial).toEqual([]);
	});

	it('is never produced by include=all', () => {
		const parsed = parseInclude('all');
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(parsed.blocks).not.toContain('ai');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/api-blocks-ai.test.ts`
Expected: FAIL, "include block not yet implemented: ai"

- [ ] **Step 3: Write the implementation**

Create `src/lib/server/api/blocks/ai.ts`:

```ts
import { loadCecAiExplanation } from '$lib/data/loaders';
import type { Fetch } from '$lib/data/loaders';

export interface ApiAiExplanation {
	/** Always true. Present so a consumer cannot mistake this for source text. */
	generated: true;
	notice: string;
	markdown: string;
}

const NOTICE =
	'Commentaire généré automatiquement. Ce texte n’appartient pas au Catéchisme et n’a aucune autorité magistérielle.';

/**
 * Generated commentary on a paragraph. Deliberately excluded from
 * `include=all` and absent by default: a consuming tool must opt in by name,
 * and every payload says what it is.
 */
export async function aiBlock(n: number, fetcher: Fetch): Promise<ApiAiExplanation | null> {
	const md = await loadCecAiExplanation(n, fetcher);
	if (!md) return null;
	return { generated: true, notice: NOTICE, markdown: md };
}
```

- [ ] **Step 4: Register the block**

Modify `src/lib/server/api/blocks/index.ts`. Add the import:

```ts
import { aiBlock } from './ai';
```

Replace the last `notImplemented` entry:

```ts
	ai: aiBlock
```

Then delete the now-unused `notImplemented` helper function from the file · every block is registered.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/api-blocks-ai.test.ts && npm run check`
Expected: PASS, 3 tests, and no unused-symbol error from `npm run check`.

- [ ] **Step 6: Commit**

```bash
npm run format && npm run lint && npm run check && npm run test
git add src/lib/server/api/blocks tests/unit/api-blocks-ai.test.ts
git commit -m "feat(api): fenced ai commentary include block"
```

---

### Task 7: The batch paragraph route

**Files:**

- Create: `src/lib/server/api/batch.ts`
- Create: `src/routes/api/cec/+server.ts`
- Test: `tests/unit/api-batch.test.ts`

**Interfaces:**

- Consumes: `parseInclude`, `assembleBlocks`, `apiJson`, `apiError`.
- Produces: `parseNumbers(numbers: string | null, range: string | null): { ok: true; numbers: number[] } | { ok: false; message: string; code: ApiErrorCode }`, and `const MAX_ITEMS = 50`, `const MAX_BLOCK_FETCHES = 100`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/api-batch.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseNumbers, MAX_ITEMS } from '$lib/server/api/batch';

describe('parseNumbers', () => {
	it('parses an explicit comma-separated list', () => {
		expect(parseNumbers('1,2,3', null)).toEqual({ ok: true, numbers: [1, 2, 3] });
	});

	it('deduplicates and sorts', () => {
		expect(parseNumbers('3,1,3', null)).toEqual({ ok: true, numbers: [1, 3] });
	});

	it('parses an inclusive range', () => {
		expect(parseNumbers(null, '10-13')).toEqual({ ok: true, numbers: [10, 11, 12, 13] });
	});

	it('rejects a range whose end precedes its start', () => {
		const r = parseNumbers(null, '13-10');
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('paragraph_out_of_range');
	});

	it('rejects a number outside 1..2865', () => {
		const r = parseNumbers('0', null);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('paragraph_out_of_range');
	});

	it('rejects a non-numeric entry', () => {
		const r = parseNumbers('1,deux', null);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('paragraph_out_of_range');
	});

	it('rejects more than MAX_ITEMS paragraphs', () => {
		const r = parseNumbers(null, `1-${MAX_ITEMS + 1}`);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('too_many_blocks');
	});

	it('requires either numbers or range', () => {
		const r = parseNumbers(null, null);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('paragraph_out_of_range');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/api-batch.test.ts`
Expected: FAIL, "Failed to resolve import \"$lib/server/api/batch\""

- [ ] **Step 3: Write the parser**

Create `src/lib/server/api/batch.ts`:

```ts
import type { ApiErrorCode } from './http';

export const FIRST = 1;
export const LAST = 2865;
export const MAX_ITEMS = 50;
/** numbers.length × resolved block count, so a wide include on a wide range is refused. */
export const MAX_BLOCK_FETCHES = 100;

export type NumbersResult =
	| { ok: true; numbers: number[] }
	| { ok: false; message: string; code: ApiErrorCode };

function outOfRange(detail: string): NumbersResult {
	return {
		ok: false,
		code: 'paragraph_out_of_range',
		message: `${detail} Le Catéchisme va de ${FIRST} à ${LAST}.`
	};
}

export function parseNumbers(numbers: string | null, range: string | null): NumbersResult {
	let list: number[];

	if (range && range.trim() !== '') {
		const m = range.trim().match(/^(\d+)-(\d+)$/);
		if (!m) return outOfRange(`Plage invalide : « ${range} ». Format attendu : 10-25.`);
		const from = Number(m[1]);
		const to = Number(m[2]);
		if (from > to) return outOfRange(`Plage inversée : « ${range} ».`);
		if (from < FIRST || to > LAST) return outOfRange(`Plage hors limites : « ${range} ».`);
		list = [];
		for (let i = from; i <= to; i++) list.push(i);
	} else if (numbers && numbers.trim() !== '') {
		const parts = numbers
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		list = [];
		for (const p of parts) {
			if (!/^\d+$/.test(p)) return outOfRange(`Numéro invalide : « ${p} ».`);
			const v = Number(p);
			if (v < FIRST || v > LAST) return outOfRange(`Numéro hors limites : ${v}.`);
			list.push(v);
		}
	} else {
		return outOfRange('Indiquez numbers=1,2,3 ou range=10-25.');
	}

	const unique = [...new Set(list)].sort((a, b) => a - b);

	if (unique.length > MAX_ITEMS) {
		return {
			ok: false,
			code: 'too_many_blocks',
			message: `Au plus ${MAX_ITEMS} paragraphes par requête (${unique.length} demandés). Découpez la demande.`
		};
	}

	return { ok: true, numbers: unique };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/api-batch.test.ts`
Expected: PASS, 8 tests

- [ ] **Step 5: Write the route**

Create `src/routes/api/cec/+server.ts`:

```ts
import { loadParagraph, loadParagraphContext } from '$lib/data/loaders';
import { stripHtml } from '$lib/utils/html';
import { apiError, apiJson } from '$lib/server/api/http';
import { parseInclude } from '$lib/server/api/include';
import { assembleBlocks } from '$lib/server/api/blocks';
import { parseNumbers, MAX_BLOCK_FETCHES } from '$lib/server/api/batch';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, url }) => {
	const parsed = parseNumbers(url.searchParams.get('numbers'), url.searchParams.get('range'));
	if (!parsed.ok) return apiError(parsed.message, parsed.code);

	const inc = parseInclude(url.searchParams.get('include'));
	if (!inc.ok) return apiError(inc.message, inc.code);

	const fetches = parsed.numbers.length * inc.blocks.length;
	if (fetches > MAX_BLOCK_FETCHES) {
		return apiError(
			`Demande trop large : ${parsed.numbers.length} paragraphes × ${inc.blocks.length} blocs = ${fetches} lectures (maximum ${MAX_BLOCK_FETCHES}). Réduisez la plage ou le nombre de blocs.`,
			'too_many_blocks'
		);
	}

	const items = await Promise.all(
		parsed.numbers.map(async (n) => {
			const [paragraph, context, blocks] = await Promise.all([
				loadParagraph(n, fetch),
				loadParagraphContext(n, fetch),
				assembleBlocks(n, inc.blocks, fetch)
			]);
			return {
				number: paragraph.number,
				corpus: paragraph.corpus,
				text_html: paragraph.text_html,
				text: stripHtml(paragraph.text_html),
				...(paragraph.superseded_text_html
					? {
							superseded_text_html: paragraph.superseded_text_html,
							superseded_text: stripHtml(paragraph.superseded_text_html)
						}
					: {}),
				cross_refs: paragraph.cross_refs,
				bible_refs: paragraph.bible_refs,
				citations: paragraph.citations,
				magisterial_refs: paragraph.magisterial_refs,
				breadcrumb: context ?? null,
				permalink: `${url.origin}/cec/${n}`,
				...blocks.data,
				...(blocks.partial.length > 0 ? { partial: blocks.partial } : {})
			};
		})
	);

	return apiJson({ count: items.length, items });
};
```

Note the per-item shape omits `prev`/`next`: they are meaningless in a batch and the caller already knows the sequence it asked for.

- [ ] **Step 6: Add the e2e coverage**

Append to `tests/e2e/api-contract.test.ts`:

```ts
test('the batch route returns one item per requested paragraph', async ({ request }) => {
	const res = await request.get('/api/cec?numbers=1,2,3');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.count).toBe(3);
	expect(body.items.map((i: { number: number }) => i.number)).toEqual([1, 2, 3]);
});

test('the batch route refuses a wide range with a wide include', async ({ request }) => {
	const res = await request.get('/api/cec?range=1-50&include=all');
	expect(res.status()).toBe(400);
	const body = await res.json();
	expect(body.code).toBe('too_many_blocks');
});
```

- [ ] **Step 7: Run the suites**

Run: `npm run test && npm run test:e2e -- tests/e2e/api-contract.test.ts`
Expected: all PASS. In particular the single-paragraph key-set test must still pass · adding `/api/cec/+server.ts` must not shadow `/api/cec/[number=int]/+server.ts`.

- [ ] **Step 8: Commit**

```bash
npm run format && npm run lint && npm run check
git add src/lib/server/api/batch.ts src/routes/api/cec/+server.ts \
  tests/unit/api-batch.test.ts tests/e2e/api-contract.test.ts
git commit -m "feat(api): batch paragraph route with numbers and range"
```

---

### Task 8: The liturgy occasion index and `/api/liturgie/{date}`

The CEC liturgy data is sharded **by paragraph**, so there is no way to go from a date to its clusters without scanning all 29 shards. This task adds the one new build artifact in the design.

**Two facts established by reading the builder, both load-bearing:**

1. `CecLiturgySource.feast` is a `CalendrierFeast | CalendrierFixedFeast`, **not** a `CecLiturgyOccasion`. The occasion is derived inside `buildCecLiturgyIndex` at `scripts/prepare/cecLiturgyIndex.ts:95-110`. The new builder must derive it identically, so this task extracts that derivation into a shared helper rather than duplicating it.
2. **A slug is not unique.** The builder's own identity key is `` `${cycle ?? ''}:${feast.slug}` `` because `troisieme-dimanche-de-lavent` exists in years A, B and C with different clusters. A map keyed by slug alone would collide and serve the wrong year's paragraphs. The index is therefore keyed `` `${cycle ?? ''}:${slug}` ``, and `dates-index.json` rows carry the `yearKey` needed to build that key (verified: `2026-12-13` is `{slug: 'troisieme-dimanche-de-lavent', corpus: 'year', yearKey: 'b'}`).

**Files:**

- Modify: `scripts/prepare/cecLiturgyIndex.ts`
- Modify: `scripts/prepare/calendrier.ts:14` and `:582-587`
- Modify: `src/lib/data/loaders.ts`
- Create: `src/routes/api/liturgie/[date]/+server.ts`
- Test: `tests/unit/cecLiturgyByOccasion.test.ts`
- Test: `tests/e2e/api-liturgie.test.ts`

**Interfaces:**

- Consumes: `apiJson`, `apiError` from `src/lib/server/api/http.ts`; `loadCalendrierDatesIndex`.
- Produces:
  - `occasionKey(cycle: string | undefined, slug: string): string` in `scripts/prepare/cecLiturgyIndex.ts`, exported so the route can rebuild the same key.
  - `toCecLiturgyOccasion(source: CecLiturgySource): CecLiturgyOccasion` in the same file.
  - `buildCecLiturgyByOccasion(sources: CecLiturgySource[]): Record<string, CecLiturgyOccasion>`
  - `loadCecLiturgyByOccasion(fetcher?: Fetch): Promise<Record<string, CecLiturgyOccasion>>` in `src/lib/data/loaders.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/cecLiturgyByOccasion.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
	buildCecLiturgyByOccasion,
	occasionKey
} from '../../scripts/prepare/cecLiturgyIndex.ts';

const source = (slug: string, cycle: 'a' | 'b' | 'c' | undefined, paragraphs: number[]) => ({
	feast: {
		slug,
		title: `Titre ${slug}`,
		season: 'avent',
		liturgicalColor: 'rose',
		clusters: [{ theme: 'la joie', paragraphs }]
	},
	cycle
});

describe('occasionKey', () => {
	it('joins cycle and slug', () => {
		expect(occasionKey('b', 'avent-3')).toBe('b:avent-3');
	});

	it('uses an empty cycle segment when there is none', () => {
		expect(occasionKey(undefined, 'noel')).toBe(':noel');
	});
});

describe('buildCecLiturgyByOccasion', () => {
	it('keeps the three cycles of one slug apart', () => {
		const out = buildCecLiturgyByOccasion([
			source('avent-3', 'a', [30]),
			source('avent-3', 'b', [163]),
			source('avent-3', 'c', [301])
		] as never);
		expect(Object.keys(out).sort()).toEqual(['a:avent-3', 'b:avent-3', 'c:avent-3']);
		expect(out['b:avent-3']!.clusters[0]!.paragraphs).toEqual([163]);
	});

	it('keys a cycle-less feast with an empty cycle segment', () => {
		const out = buildCecLiturgyByOccasion([source('noel', undefined, [525])] as never);
		expect(Object.keys(out)).toEqual([':noel']);
	});

	it('deduplicates paragraphs inside a cluster, as the shard builder does', () => {
		const out = buildCecLiturgyByOccasion([source('avent-3', 'a', [30, 30, 163])] as never);
		expect(out['a:avent-3']!.clusters[0]!.paragraphs).toEqual([30, 163]);
	});

	it('skips an occasion whose clusters cite no paragraph', () => {
		const out = buildCecLiturgyByOccasion([source('vide', 'a', [])] as never);
		expect(out).toEqual({});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/cecLiturgyByOccasion.test.ts`
Expected: FAIL, "buildCecLiturgyByOccasion is not exported"

- [ ] **Step 3: Extract the occasion derivation**

Modify `scripts/prepare/cecLiturgyIndex.ts`. The body of `buildCecLiturgyIndex` currently builds `occasion` inline at lines 95-110 and computes `identity` at line 111. Extract both, so the two builders cannot drift:

```ts
/**
 * Identity of a liturgical day. A slug alone is not unique: the same Sunday
 * appears in cycles a, b and c with different clusters, so the cycle is part
 * of the key.
 */
export function occasionKey(cycle: string | undefined, slug: string): string {
	return `${cycle ?? ''}:${slug}`;
}

/** Derive the occasion record a source feast maps to. */
export function toCecLiturgyOccasion(source: CecLiturgySource): CecLiturgyOccasion {
	const { feast, cycle, readingsKey, readings } = source;
	const fixed = isFixed(feast);
	return {
		slug: feast.slug,
		title: feast.title,
		season: feast.season,
		color: feast.liturgicalColor,
		...(cycle ? { cycle } : {}),
		...(fixed ? { date: feast.date, monthIndex: feast.month_index } : {}),
		// A cluster may list the same paragraph twice (a range overlapping a
		// loose number in the same "CEC ..." line) · dedupe here so the
		// frontend can key on the number.
		clusters: feast.clusters.map((c) => ({
			theme: c.theme,
			paragraphs: [...new Set(c.paragraphs)]
		})),
		...(readingsKey ? { readingsKey } : {}),
		...(readings && readings.length > 0 ? { readings } : {})
	};
}
```

Then rewrite the head of the loop in `buildCecLiturgyIndex` to use them, leaving
the rest of that function exactly as it is:

```ts
	for (const source of sources) {
		const { feast, cycle } = source;
		const occasion = toCecLiturgyOccasion(source);
		const identity = occasionKey(cycle, feast.slug);
```

Delete the now-duplicated inline `occasion` object literal and the old
`identity` line. The `fixed` local is no longer used in the loop · remove it
too, or `npm run lint` will flag it.

- [ ] **Step 4: Add the occasion-keyed builder**

Append to `scripts/prepare/cecLiturgyIndex.ts`:

```ts
/**
 * Occasion-keyed view of the same data. The bucketed index above is keyed by
 * paragraph, which serves the study panel but makes a date lookup impossible
 * without scanning every shard · `/api/liturgie/{date}` needs this direction.
 */
export function buildCecLiturgyByOccasion(
	sources: CecLiturgySource[]
): Record<string, CecLiturgyOccasion> {
	const out: Record<string, CecLiturgyOccasion> = {};
	for (const source of sources) {
		const occasion = toCecLiturgyOccasion(source);
		if (!occasion.clusters.some((c) => c.paragraphs.length > 0)) continue;
		out[occasionKey(source.cycle, source.feast.slug)] = occasion;
	}
	return out;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/cecLiturgyByOccasion.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 6: Verify the refactor did not change the shards**

The extraction in Step 3 must be behaviour-preserving. Prove it:

```bash
cp -r static/data/calendrier/cec /tmp/cec-shards-before
npx tsx scripts/prepare-data.ts
diff -r /tmp/cec-shards-before static/data/calendrier/cec --exclude=by-occasion.json
```

Expected: no differences. Any diff means the extracted `toCecLiturgyOccasion`
does not match the original inline literal · fix it before continuing.

- [ ] **Step 7: Emit the file at build time**

Modify `scripts/prepare/calendrier.ts`. Change the import on line 14:

```ts
import {
	buildCecLiturgyIndex,
	buildCecLiturgyByOccasion,
	type CecLiturgySource
} from './cecLiturgyIndex.ts';
```

Then, immediately after the existing shard-writing loop (currently lines 585-587), add:

```ts
	writeFileSync(
		join(liturgyDir, 'by-occasion.json'),
		JSON.stringify(buildCecLiturgyByOccasion(liturgySources))
	);
```

- [ ] **Step 8: Add the loader**

Modify `src/lib/data/loaders.ts`. Next to `loadCecLiturgy` (around line 752), add:

```ts
let cecLiturgyByOccasionPromise: Promise<Record<string, CecLiturgyOccasion>> | null = null;

export function loadCecLiturgyByOccasion(
	fetcher: Fetch = fetch
): Promise<Record<string, CecLiturgyOccasion>> {
	if (!cecLiturgyByOccasionPromise) {
		cecLiturgyByOccasionPromise = fetchJson<Record<string, CecLiturgyOccasion>>(
			'/data/calendrier/cec/by-occasion.json',
			fetcher
		).catch((e) => {
			cecLiturgyByOccasionPromise = null;
			throw e;
		});
	}
	return cecLiturgyByOccasionPromise;
}
```

Check the exact name and signature of the `fetchJson` helper already in that
file and match it · `loadDenzingerIndex` at line 843 is a working example.

- [ ] **Step 9: Regenerate and inspect the data**

Run: `npx tsx scripts/prepare-data.ts`
Then: `node -e "const d=require('./static/data/calendrier/cec/by-occasion.json'); const k=Object.keys(d); console.log(k.length, k.slice(0,3))"`
Expected: several hundred keys, each of the form `a:slug`, `b:slug`, `c:slug` or `:slug`.

- [ ] **Step 10: Write the route**

Create `src/routes/api/liturgie/[date]/+server.ts`:

```ts
import { loadCalendrierDatesIndex, loadCecLiturgyByOccasion } from '$lib/data/loaders';
import { apiError, apiJson } from '$lib/server/api/http';
import type { RequestHandler } from './$types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Must match `occasionKey` in scripts/prepare/cecLiturgyIndex.ts. */
function occasionKey(cycle: string | undefined, slug: string): string {
	return `${cycle ?? ''}:${slug}`;
}

/** Seconds until the next midnight in Europe/Paris, clamped to 60..3600. */
function secondsUntilParisMidnight(now: Date): number {
	const paris = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
	const midnight = new Date(paris);
	midnight.setHours(24, 0, 0, 0);
	const seconds = Math.ceil((midnight.getTime() - paris.getTime()) / 1000);
	return Math.max(60, Math.min(3600, seconds));
}

function todayInParis(now: Date): string {
	// en-CA formats as YYYY-MM-DD, which is exactly the index key format.
	return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
}

export const GET: RequestHandler = async ({ params, fetch }) => {
	const raw = params.date;
	const isToday = raw === 'today';
	const date = isToday ? todayInParis(new Date()) : raw;

	if (!ISO_DATE.test(date)) {
		return apiError(
			`Date invalide : « ${raw} ». Format attendu : AAAA-MM-JJ, ou « today ».`,
			'bad_date'
		);
	}

	const index = await loadCalendrierDatesIndex(fetch);
	const row = index.rows.find((r) => r.date === date);
	if (!row) {
		return apiError(
			`Aucune célébration au calendrier pour le ${date}. Le calendrier couvre ${index.rangeStart} à ${index.rangeEnd}.`,
			'bad_date',
			404
		);
	}

	const byOccasion = await loadCecLiturgyByOccasion(fetch);
	// A day of the three-year cycle carries `yearKey`; a fixed feast or a
	// date-proper day carries none, and was indexed with an empty segment.
	const occasion =
		byOccasion[occasionKey(row.yearKey, row.slug)] ?? byOccasion[occasionKey(undefined, row.slug)] ?? null;

	const body = {
		date,
		slug: row.slug,
		corpus: row.corpus,
		cycle: row.yearKey ?? null,
		liturgical_color: row.liturgicalColor ?? null,
		celebration: occasion
			? {
					title: occasion.title,
					season: occasion.season,
					color: occasion.color,
					...(occasion.cycle ? { cycle: occasion.cycle } : {})
				}
			: null,
		// CEC paragraphs are proposed for meditation alongside the day's
		// readings · they are not read at Mass. Keep this wording.
		meditation: occasion
			? occasion.clusters.map((c) => ({ theme: c.theme, paragraphs: c.paragraphs }))
			: []
	};

	// "today" must expire at the date rollover; a fixed date is immutable.
	return apiJson(body, isToday ? secondsUntilParisMidnight(new Date()) : 3600);
};
```

- [ ] **Step 11: Add e2e coverage**

Create `tests/e2e/api-liturgie.test.ts`:

```ts
import { test, expect } from '@playwright/test';

test('a fixed date returns the celebration and its meditation clusters', async ({ request }) => {
	// 2026-12-13 is the third Sunday of Advent, year B, and cites CEC paragraphs.
	const res = await request.get('/api/liturgie/2026-12-13');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.date).toBe('2026-12-13');
	expect(body.slug).toBe('troisieme-dimanche-de-lavent');
	expect(body.cycle).toBe('b');
	expect(body.meditation.length).toBeGreaterThan(0);
});

test('the same slug in a different year returns different paragraphs', async ({ request }) => {
	const b = await (await request.get('/api/liturgie/2026-12-13')).json();
	const dates = ['2024-12-15', '2025-12-14', '2027-12-12'];
	const others = [];
	for (const d of dates) {
		const r = await request.get(`/api/liturgie/${d}`);
		if (r.status() !== 200) continue;
		const body = await r.json();
		if (body.slug === b.slug && body.cycle !== b.cycle) others.push(body);
	}
	expect(others.length).toBeGreaterThan(0);
	// The cycle guard exists precisely so these differ.
	expect(JSON.stringify(others[0].meditation)).not.toBe(JSON.stringify(b.meditation));
});

test('today resolves and is cached only until the date rollover', async ({ request }) => {
	const res = await request.get('/api/liturgie/today');
	expect(res.status()).toBe(200);
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
```

- [ ] **Step 12: Commit**

```bash
npm run format && npm run lint && npm run check && npm run test && npm run test:e2e
git add scripts/prepare/cecLiturgyIndex.ts scripts/prepare/calendrier.ts \
  src/lib/data/loaders.ts src/routes/api/liturgie \
  tests/unit/cecLiturgyByOccasion.test.ts tests/e2e/api-liturgie.test.ts
git commit -m "feat(api): liturgie by date, keyed by cycle and slug"
```

`static/data/` is generated at `prebuild`. Check whether the new file is
tracked or ignored with
`git check-ignore -v static/data/calendrier/cec/by-occasion.json` and add it to
the commit only if it is tracked, matching how the existing shards are handled.

---

### Task 9: `/api/bible/{book}/{chapter}/{verse}`

**Files:**

- Create: `src/routes/api/bible/[book]/[chapter]/+server.ts`
- Create: `src/routes/api/bible/[book]/[chapter]/[verse]/+server.ts`
- Create: `src/lib/server/api/bibleLookup.ts`
- Test: `tests/unit/api-bible-lookup.test.ts`

**Interfaces:**

- Consumes: `loadBibleVerseIndex` (returns `Record<string, Record<string, Record<string, number[]>>>`, keyed USFX book code then chapter then verse), `bookBySlug` and `bookByUsfx` from `$lib/utils/bibleBookSlug`.
- Produces: `lookupBible(bookParam: string, chapter: string, verse: string | null, index: BibleVerseIndex): { ok: true; body: BibleLookupBody } | { ok: false; message: string; code: ApiErrorCode }` and `interface BibleLookupBody { book: string; book_slug: string; book_name: string; chapter: number; verse: number | null; paragraphs: number[]; verses?: Record<string, number[]> }`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/api-bible-lookup.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { lookupBible } from '$lib/server/api/bibleLookup';

const INDEX = {
	'1CO': { '1': { '2': [401, 752, 1695], '18': [268, 401] } },
	JHN: { '3': { '16': [219, 444, 458] } }
};

describe('lookupBible', () => {
	it('resolves a book slug, chapter and verse to paragraphs', () => {
		const r = lookupBible('jean', '3', '16', INDEX);
		expect(r).toEqual({
			ok: true,
			body: {
				book: 'JHN',
				book_slug: 'jean',
				book_name: 'Jean',
				chapter: 3,
				verse: 16,
				paragraphs: [219, 444, 458]
			}
		});
	});

	it('accepts the USFX code as well as the slug', () => {
		const r = lookupBible('JHN', '3', '16', INDEX);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.body.paragraphs).toEqual([219, 444, 458]);
	});

	it('returns the whole chapter when no verse is given', () => {
		const r = lookupBible('1-corinthiens', '1', null, INDEX);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.body.verse).toBeNull();
		expect(r.body.verses).toEqual({ '2': [401, 752, 1695], '18': [268, 401] });
		// Union of every verse in the chapter, deduplicated and sorted.
		expect(r.body.paragraphs).toEqual([268, 401, 752, 1695]);
	});

	it('rejects an unknown book', () => {
		const r = lookupBible('evangile-de-zz', '1', '1', INDEX);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('unknown_book');
	});

	it('returns an empty result rather than an error for an uncited verse', () => {
		const r = lookupBible('jean', '3', '17', INDEX);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.body.paragraphs).toEqual([]);
	});

	it('rejects a non-numeric chapter', () => {
		const r = lookupBible('jean', 'trois', null, INDEX);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.code).toBe('unknown_book');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/api-bible-lookup.test.ts`
Expected: FAIL, "Failed to resolve import \"$lib/server/api/bibleLookup\""

- [ ] **Step 3: Write the lookup**

Create `src/lib/server/api/bibleLookup.ts`:

```ts
import { bookBySlug, bookByUsfx } from '$lib/utils/bibleBookSlug';
import type { BibleVerseIndex } from '$lib/data/types';
import type { ApiErrorCode } from './http';

export interface BibleLookupBody {
	book: string;
	book_slug: string;
	book_name: string;
	chapter: number;
	verse: number | null;
	/** CCC paragraphs citing the verse, or the union across the chapter. */
	paragraphs: number[];
	/** Present only for a whole-chapter lookup: verse number to paragraphs. */
	verses?: Record<string, number[]>;
}

export type BibleLookupResult =
	| { ok: true; body: BibleLookupBody }
	| { ok: false; message: string; code: ApiErrorCode };

export function lookupBible(
	bookParam: string,
	chapter: string,
	verse: string | null,
	index: BibleVerseIndex
): BibleLookupResult {
	// Accept the French slug (/bible/jean/3/16) or the USFX code (/bible/JHN/3/16).
	const book = bookBySlug(bookParam) ?? bookByUsfx(bookParam.toUpperCase());
	if (!book) {
		return {
			ok: false,
			code: 'unknown_book',
			message: `Livre biblique inconnu : « ${bookParam} ». Utilisez le slug français (par exemple « jean ») ou le code à trois lettres (par exemple « JHN »).`
		};
	}

	if (!/^\d+$/.test(chapter)) {
		return {
			ok: false,
			code: 'unknown_book',
			message: `Chapitre invalide : « ${chapter} ». Un numéro est attendu.`
		};
	}
	if (verse !== null && !/^\d+$/.test(verse)) {
		return {
			ok: false,
			code: 'unknown_book',
			message: `Verset invalide : « ${verse} ». Un numéro est attendu.`
		};
	}

	const chapters = index[book.usfx] ?? {};
	const verses = chapters[chapter] ?? {};

	if (verse === null) {
		const union = [...new Set(Object.values(verses).flat())].sort((a, b) => a - b);
		return {
			ok: true,
			body: {
				book: book.usfx,
				book_slug: book.slug,
				book_name: book.frenchName,
				chapter: Number(chapter),
				verse: null,
				paragraphs: union,
				verses
			}
		};
	}

	return {
		ok: true,
		body: {
			book: book.usfx,
			book_slug: book.slug,
			book_name: book.frenchName,
			chapter: Number(chapter),
			verse: Number(verse),
			paragraphs: verses[verse] ?? []
		}
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/api-bible-lookup.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Write the two routes**

Create `src/routes/api/bible/[book]/[chapter]/+server.ts`:

```ts
import { loadBibleVerseIndex } from '$lib/data/loaders';
import { apiError, apiJson } from '$lib/server/api/http';
import { lookupBible } from '$lib/server/api/bibleLookup';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const index = await loadBibleVerseIndex(fetch);
	const r = lookupBible(params.book, params.chapter, null, index);
	if (!r.ok) return apiError(r.message, r.code, 404);
	return apiJson(r.body);
};
```

Create `src/routes/api/bible/[book]/[chapter]/[verse]/+server.ts`:

```ts
import { loadBibleVerseIndex } from '$lib/data/loaders';
import { apiError, apiJson } from '$lib/server/api/http';
import { lookupBible } from '$lib/server/api/bibleLookup';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const index = await loadBibleVerseIndex(fetch);
	const r = lookupBible(params.book, params.chapter, params.verse, index);
	if (!r.ok) return apiError(r.message, r.code, 404);
	return apiJson(r.body);
};
```

- [ ] **Step 6: Add e2e coverage**

Create `tests/e2e/api-bible.test.ts`:

```ts
import { test, expect } from '@playwright/test';

test('a verse lookup returns the citing CCC paragraphs', async ({ request }) => {
	const res = await request.get('/api/bible/jean/3/16');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.book_slug).toBe('jean');
	expect(body.chapter).toBe(3);
	expect(body.verse).toBe(16);
	expect(Array.isArray(body.paragraphs)).toBe(true);
});

test('a chapter lookup returns the per-verse breakdown', async ({ request }) => {
	const res = await request.get('/api/bible/jean/3');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.verse).toBeNull();
	expect(typeof body.verses).toBe('object');
});

test('an unknown book returns a coded 404', async ({ request }) => {
	const res = await request.get('/api/bible/zzz/1/1');
	expect(res.status()).toBe(404);
	expect((await res.json()).code).toBe('unknown_book');
});
```

- [ ] **Step 7: Commit**

```bash
npm run format && npm run lint && npm run check && npm run test && npm run test:e2e
git add src/lib/server/api/bibleLookup.ts src/routes/api/bible \
  tests/unit/api-bible-lookup.test.ts tests/e2e/api-bible.test.ts
git commit -m "feat(api): bible verse and chapter lookup routes"
```

---

### Task 10: `/api/themes` and `/api/themes/{slug}`

**Files:**

- Create: `src/lib/server/api/themesIndex.ts`
- Create: `src/routes/api/themes/+server.ts`
- Create: `src/routes/api/themes/[slug]/+server.ts`
- Test: `tests/unit/api-themes.test.ts`

**Interfaces:**

- Consumes: `loadParagraphThemes` (returns `Record<string, ParagraphThemeRef[]>`, keyed by paragraph number as a string).
- Produces:
  - `buildThemeVocabulary(index: Record<string, ParagraphThemeRef[]>): { name: string; slug: string; count: number; glossary_url: string }[]` · sorted by name using `localeCompare` with `'fr'`.
  - `paragraphsForTheme(index: Record<string, ParagraphThemeRef[]>, slug: string): number[] | null` · `null` when the slug is unknown.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/api-themes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildThemeVocabulary, paragraphsForTheme } from '$lib/server/api/themesIndex';

const INDEX = {
	'26': [
		{ name: 'Foi', slug: 'foi' },
		{ name: 'Église', slug: 'eglise' }
	],
	'27': [{ name: 'Foi', slug: 'foi' }],
	'30': [{ name: 'Amour', slug: 'amour' }]
};

describe('buildThemeVocabulary', () => {
	it('counts paragraphs per theme', () => {
		const v = buildThemeVocabulary(INDEX);
		expect(v.find((t) => t.slug === 'foi')).toEqual({
			name: 'Foi',
			slug: 'foi',
			count: 2,
			glossary_url: '/glossaire/foi'
		});
	});

	it('sorts by French collation, so accents do not sort last', () => {
		const v = buildThemeVocabulary(INDEX);
		expect(v.map((t) => t.slug)).toEqual(['amour', 'eglise', 'foi']);
	});

	it('returns an empty vocabulary for an empty index', () => {
		expect(buildThemeVocabulary({})).toEqual([]);
	});
});

describe('paragraphsForTheme', () => {
	it('returns the sorted paragraph list for a known slug', () => {
		expect(paragraphsForTheme(INDEX, 'foi')).toEqual([26, 27]);
	});

	it('returns null for an unknown slug', () => {
		expect(paragraphsForTheme(INDEX, 'inexistant')).toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/api-themes.test.ts`
Expected: FAIL, "Failed to resolve import \"$lib/server/api/themesIndex\""

- [ ] **Step 3: Write the implementation**

Create `src/lib/server/api/themesIndex.ts`:

```ts
import type { ParagraphThemeRef } from '$lib/data/types';

export interface ApiThemeSummary {
	name: string;
	slug: string;
	count: number;
	glossary_url: string;
}

type ThemeIndex = Record<string, ParagraphThemeRef[]>;

/** The whole thematic vocabulary with a paragraph count per tag. */
export function buildThemeVocabulary(index: ThemeIndex): ApiThemeSummary[] {
	const byslug = new Map<string, { name: string; count: number }>();
	for (const refs of Object.values(index)) {
		for (const ref of refs) {
			const existing = byslug.get(ref.slug);
			if (existing) existing.count += 1;
			else byslug.set(ref.slug, { name: ref.name, count: 1 });
		}
	}
	return [...byslug.entries()]
		.map(([slug, { name, count }]) => ({
			name,
			slug,
			count,
			glossary_url: `/glossaire/${slug}`
		}))
		.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/** Paragraphs carrying a theme, or null when the slug is not in the vocabulary. */
export function paragraphsForTheme(index: ThemeIndex, slug: string): number[] | null {
	const out: number[] = [];
	for (const [paragraph, refs] of Object.entries(index)) {
		if (refs.some((r) => r.slug === slug)) out.push(Number(paragraph));
	}
	if (out.length === 0) return null;
	return out.sort((a, b) => a - b);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/api-themes.test.ts`
Expected: PASS, 5 tests

- [ ] **Step 5: Write the routes**

Create `src/routes/api/themes/+server.ts`:

```ts
import { loadParagraphThemes } from '$lib/data/loaders';
import { apiJson } from '$lib/server/api/http';
import { buildThemeVocabulary } from '$lib/server/api/themesIndex';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	const index = await loadParagraphThemes(fetch);
	const themes = buildThemeVocabulary(index);
	return apiJson({ count: themes.length, themes });
};
```

Create `src/routes/api/themes/[slug]/+server.ts`:

```ts
import { loadParagraphThemes } from '$lib/data/loaders';
import { apiError, apiJson } from '$lib/server/api/http';
import { buildThemeVocabulary, paragraphsForTheme } from '$lib/server/api/themesIndex';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const index = await loadParagraphThemes(fetch);
	const paragraphs = paragraphsForTheme(index, params.slug);
	if (!paragraphs) {
		return apiError(
			`Thème inconnu : « ${params.slug} ». La liste complète est disponible sur /api/themes.`,
			'unknown_slug',
			404
		);
	}
	const summary = buildThemeVocabulary(index).find((t) => t.slug === params.slug);
	return apiJson({
		slug: params.slug,
		name: summary?.name ?? params.slug,
		// Themes and glossary entries share one slug namespace.
		glossary_url: `/glossaire/${params.slug}`,
		count: paragraphs.length,
		paragraphs
	});
};
```

- [ ] **Step 6: Add e2e coverage**

Create `tests/e2e/api-themes.test.ts`:

```ts
import { test, expect } from '@playwright/test';

test('the vocabulary lists themes with counts', async ({ request }) => {
	const res = await request.get('/api/themes');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.count).toBeGreaterThan(0);
	expect(body.themes[0]).toHaveProperty('slug');
	expect(body.themes[0]).toHaveProperty('count');
});

test('a theme returns its paragraphs', async ({ request }) => {
	const list = await (await request.get('/api/themes')).json();
	const slug = list.themes[0].slug;
	const res = await request.get(`/api/themes/${slug}`);
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.slug).toBe(slug);
	expect(body.paragraphs.length).toBeGreaterThan(0);
});

test('an unknown theme returns a coded 404', async ({ request }) => {
	const res = await request.get('/api/themes/ce-theme-nexiste-pas');
	expect(res.status()).toBe(404);
	expect((await res.json()).code).toBe('unknown_slug');
});
```

- [ ] **Step 7: Commit**

```bash
npm run format && npm run lint && npm run check && npm run test && npm run test:e2e
git add src/lib/server/api/themesIndex.ts src/routes/api/themes \
  tests/unit/api-themes.test.ts tests/e2e/api-themes.test.ts
git commit -m "feat(api): theme vocabulary and per-theme paragraph routes"
```

---

### Task 11: `/api/structure` and the glossary routes

**Files:**

- Create: `src/routes/api/structure/+server.ts`
- Create: `src/routes/api/glossary/+server.ts`
- Create: `src/routes/api/glossary/[slug]/+server.ts`
- Create: `src/lib/server/api/structureDepth.ts`
- Test: `tests/unit/api-structure.test.ts`

**Interfaces:**

- Consumes: `loadStructureToc` (returns `unknown`, so cast at the boundary), `loadGlossary` (returns `GlossaryBundle` with `entries`, `clusters`, `featured`), `loadGlossaryIndex`.
- Produces: `trimStructure(toc: unknown, depth: number): unknown` · depth 1 keeps parts, 2 adds sections, 3 adds chapters, 0 or absent means the whole tree.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/api-structure.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { trimStructure } from '$lib/server/api/structureDepth';

const TOC = {
	corpus: 'ccc',
	parts: [
		{
			slug: 'prologue',
			title: 'Prologue',
			range: { from: 1, to: 25 },
			sections: [
				{
					slug: 's1',
					title: 'Section 1',
					chapters: [{ slug: 'c1', title: 'Chapitre 1', articles: [{ slug: 'a1' }] }]
				}
			]
		}
	]
};

describe('trimStructure', () => {
	it('depth 1 keeps parts without their sections', () => {
		const out = trimStructure(TOC, 1) as { parts: Record<string, unknown>[] };
		expect(out.parts[0]!.slug).toBe('prologue');
		expect(out.parts[0]!.sections).toBeUndefined();
	});

	it('depth 2 keeps sections without their chapters', () => {
		const out = trimStructure(TOC, 2) as {
			parts: { sections: Record<string, unknown>[] }[];
		};
		expect(out.parts[0]!.sections[0]!.slug).toBe('s1');
		expect(out.parts[0]!.sections[0]!.chapters).toBeUndefined();
	});

	it('depth 3 keeps chapters without their articles', () => {
		const out = trimStructure(TOC, 3) as {
			parts: { sections: { chapters: Record<string, unknown>[] }[] }[];
		};
		expect(out.parts[0]!.sections[0]!.chapters[0]!.slug).toBe('c1');
		expect(out.parts[0]!.sections[0]!.chapters[0]!.articles).toBeUndefined();
	});

	it('depth 0 returns the tree untouched', () => {
		expect(trimStructure(TOC, 0)).toEqual(TOC);
	});

	it('does not mutate the input', () => {
		const before = JSON.stringify(TOC);
		trimStructure(TOC, 1);
		expect(JSON.stringify(TOC)).toBe(before);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/api-structure.test.ts`
Expected: FAIL, "Failed to resolve import \"$lib/server/api/structureDepth\""

- [ ] **Step 3: Write the implementation**

Create `src/lib/server/api/structureDepth.ts`:

```ts
type Node = Record<string, unknown>;

const LEVELS = ['parts', 'sections', 'chapters', 'articles'] as const;

/**
 * Trim the table-of-contents tree to `depth` levels. Depth 1 is parts only,
 * 2 adds sections, 3 adds chapters. Depth 0 (or anything past the deepest
 * level) returns the tree untouched. Never mutates the input.
 */
export function trimStructure(toc: unknown, depth: number): unknown {
	if (depth <= 0) return toc;
	if (toc === null || typeof toc !== 'object') return toc;

	const clone: Node = { ...(toc as Node) };
	trimLevel(clone, 0, depth);
	return clone;
}

function trimLevel(node: Node, levelIndex: number, depth: number): void {
	if (levelIndex >= LEVELS.length) return;
	const key = LEVELS[levelIndex]!;
	const children = node[key];
	if (!Array.isArray(children)) return;

	if (levelIndex + 1 >= depth) {
		// This level is the last one kept · strip each child's own children.
		node[key] = children.map((c) => {
			if (c === null || typeof c !== 'object') return c;
			const copy: Node = { ...(c as Node) };
			for (const deeper of LEVELS.slice(levelIndex + 1)) delete copy[deeper];
			return copy;
		});
		return;
	}

	node[key] = children.map((c) => {
		if (c === null || typeof c !== 'object') return c;
		const copy: Node = { ...(c as Node) };
		trimLevel(copy, levelIndex + 1, depth);
		return copy;
	});
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/api-structure.test.ts`
Expected: PASS, 5 tests

- [ ] **Step 5: Write the structure route**

Create `src/routes/api/structure/+server.ts`:

```ts
import { loadStructureToc } from '$lib/data/loaders';
import { apiJson } from '$lib/server/api/http';
import { trimStructure } from '$lib/server/api/structureDepth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, url }) => {
	const raw = url.searchParams.get('depth');
	// An unparseable depth is treated as "no limit" rather than an error · the
	// parameter is a convenience, not a contract the client can get wrong.
	const depth = raw && /^\d+$/.test(raw) ? Number(raw) : 0;
	const toc = await loadStructureToc(fetch);
	return apiJson(trimStructure(toc, depth));
};
```

- [ ] **Step 6: Write the glossary routes**

Create `src/routes/api/glossary/+server.ts`.

`GlossaryEntry` is defined at `src/lib/data/types.ts:391-403` as
`{ slug, term, latin?, definition?, directRefs, subEntries, seeAlso, clusters, totalRefs, refsCovered, standalone }`.
The listing returns identity, grouping and reference counts only · the full
bundle is 756 KB, and a client fetches a single entry for its definition.

```ts
import { loadGlossary } from '$lib/data/loaders';
import { apiJson } from '$lib/server/api/http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	const bundle = await loadGlossary(fetch);
	return apiJson({
		count: bundle.entries.length,
		clusters: bundle.clusters,
		featured: bundle.featured,
		entries: bundle.entries.map((e) => ({
			slug: e.slug,
			term: e.term,
			clusters: e.clusters,
			total_refs: e.totalRefs,
			url: `/glossaire/${e.slug}`
		}))
	});
};
```

Create `src/routes/api/glossary/[slug]/+server.ts`:

```ts
import { loadGlossary } from '$lib/data/loaders';
import { apiError, apiJson } from '$lib/server/api/http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const bundle = await loadGlossary(fetch);
	const entry = bundle.entries.find((e) => e.slug === params.slug);
	if (!entry) {
		return apiError(
			`Entrée de glossaire inconnue : « ${params.slug} ». La liste complète est disponible sur /api/glossary.`,
			'unknown_slug',
			404
		);
	}
	return apiJson({ ...entry, url: `/glossaire/${params.slug}` });
};
```

- [ ] **Step 7: Add e2e coverage**

Create `tests/e2e/api-structure-glossary.test.ts`:

```ts
import { test, expect } from '@playwright/test';

test('the structure tree is returned and can be trimmed', async ({ request }) => {
	const full = await (await request.get('/api/structure')).json();
	expect(Array.isArray(full.parts)).toBe(true);

	const shallow = await (await request.get('/api/structure?depth=1')).json();
	expect(shallow.parts.length).toBe(full.parts.length);
	expect(shallow.parts[0].sections).toBeUndefined();
});

test('the glossary lists entries and resolves one by slug', async ({ request }) => {
	const list = await (await request.get('/api/glossary')).json();
	expect(list.count).toBeGreaterThan(0);
	const slug = list.entries[0].slug;

	const res = await request.get(`/api/glossary/${slug}`);
	expect(res.status()).toBe(200);
	expect((await res.json()).url).toBe(`/glossaire/${slug}`);
});

test('an unknown glossary slug returns a coded 404', async ({ request }) => {
	const res = await request.get('/api/glossary/ce-terme-nexiste-pas');
	expect(res.status()).toBe(404);
	expect((await res.json()).code).toBe('unknown_slug');
});
```

- [ ] **Step 8: Commit**

```bash
npm run format && npm run lint && npm run check && npm run test && npm run test:e2e
git add src/lib/server/api/structureDepth.ts src/routes/api/structure \
  src/routes/api/glossary tests/unit/api-structure.test.ts \
  tests/e2e/api-structure-glossary.test.ts
git commit -m "feat(api): structure tree and glossary routes"
```

---

### Task 12: The OpenAPI source of truth and the drift guard

**Files:**

- Create: `src/lib/server/api/spec.ts`
- Create: `src/routes/api/openapi.json/+server.ts`
- Test: `tests/unit/api-spec.test.ts`

**Interfaces:**

- Consumes: `ALL_BLOCKS` from `src/lib/server/api/include.ts`.
- Produces:
  - `interface ApiRoute { path: string; summary: string; params: ApiParam[]; codes: ApiErrorCode[]; example: string }`
  - `const API_ROUTES: ApiRoute[]`
  - `buildOpenApi(origin: string): Record<string, unknown>`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/api-spec.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { API_ROUTES, buildOpenApi } from '$lib/server/api/spec';
import { ALL_BLOCKS } from '$lib/server/api/include';

/** Every directory under src/routes/api that contains a +server.ts. */
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
			const seg = name.startsWith('[')
				? `{${name.slice(1, -1).split('=')[0]}}`
				: name;
			out.push(...actualRoutes(full, `${prefix}/${seg}`));
		}
	}
	return out;
}

describe('API spec coverage', () => {
	const declared = new Set(API_ROUTES.map((r) => r.path));
	// openapi.json is a route directory whose name contains a dot; it documents
	// itself, so it is expected in both sets.
	const actual = new Set(actualRoutes('src/routes/api'));

	it('declares every route that exists', () => {
		const undocumented = [...actual].filter((p) => !declared.has(p));
		expect(undocumented).toEqual([]);
	});

	it('declares no route that does not exist', () => {
		const phantom = [...declared].filter((p) => !actual.has(p));
		expect(phantom).toEqual([]);
	});

	it('gives every route a summary and an example', () => {
		for (const r of API_ROUTES) {
			expect(r.summary.length).toBeGreaterThan(0);
			expect(r.example.startsWith('/api/')).toBe(true);
		}
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

	it('documents every include block by name', () => {
		const doc = JSON.stringify(buildOpenApi('https://example.test'));
		for (const b of ALL_BLOCKS) expect(doc).toContain(b);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/api-spec.test.ts`
Expected: FAIL, "Failed to resolve import \"$lib/server/api/spec\""

- [ ] **Step 3: Write the spec module**

Create `src/lib/server/api/spec.ts`. Declare one `ApiRoute` per route built in Tasks 1 to 11. The `path` values must be exactly:

```
/api/cec
/api/cec/{number}
/api/search
/api/bible/{book}/{chapter}
/api/bible/{book}/{chapter}/{verse}
/api/liturgie/{date}
/api/themes
/api/themes/{slug}
/api/structure
/api/glossary
/api/glossary/{slug}
/api/openapi.json
```

```ts
import type { ApiErrorCode } from './http';
import { ALL_BLOCKS, DEFAULT_ALL, MAX_EXPLICIT_BLOCKS } from './include';

export interface ApiParam {
	name: string;
	in: 'path' | 'query';
	required: boolean;
	description: string;
}

export interface ApiRoute {
	path: string;
	summary: string;
	params: ApiParam[];
	codes: ApiErrorCode[];
	/** A working URL a reader can paste into a browser. */
	example: string;
}

const INCLUDE_PARAM: ApiParam = {
	name: 'include',
	in: 'query',
	required: false,
	description: `Blocs d'étude à joindre, séparés par des virgules. Valeurs : ${ALL_BLOCKS.join(', ')}. « all » développe les ${DEFAULT_ALL.length} blocs hors « ai ». Au plus ${MAX_EXPLICIT_BLOCKS} blocs nommés explicitement.`
};

export const API_ROUTES: ApiRoute[] = [
	{
		path: '/api/cec/{number}',
		summary: "Un paragraphe du Catéchisme, de 1 à 2865, avec son contexte et ses renvois.",
		params: [
			{ name: 'number', in: 'path', required: true, description: 'Numéro de paragraphe, 1 à 2865.' },
			INCLUDE_PARAM
		],
		codes: ['paragraph_out_of_range', 'unknown_include', 'too_many_blocks'],
		example: '/api/cec/2559?include=themes,sources'
	},
	{
		path: '/api/cec',
		summary: 'Plusieurs paragraphes en une requête, par liste ou par plage.',
		params: [
			{ name: 'numbers', in: 'query', required: false, description: 'Liste, par exemple 1,2,3.' },
			{ name: 'range', in: 'query', required: false, description: 'Plage inclusive, par exemple 10-25.' },
			INCLUDE_PARAM
		],
		codes: ['paragraph_out_of_range', 'unknown_include', 'too_many_blocks'],
		example: '/api/cec?range=1-5'
	},
	{
		path: '/api/search',
		summary: 'Recherche plein texte sur le Catéchisme, le Compendium et la doctrine sociale.',
		params: [
			{ name: 'q', in: 'query', required: true, description: 'Requête, 2 caractères au minimum.' }
		],
		codes: ['query_too_short'],
		example: '/api/search?q=eucharistie'
	},
	{
		path: '/api/bible/{book}/{chapter}',
		summary: 'Paragraphes du Catéchisme citant un chapitre biblique, détaillés par verset.',
		params: [
			{ name: 'book', in: 'path', required: true, description: 'Slug français (jean) ou code USFX (JHN).' },
			{ name: 'chapter', in: 'path', required: true, description: 'Numéro de chapitre.' }
		],
		codes: ['unknown_book'],
		example: '/api/bible/jean/3'
	},
	{
		path: '/api/bible/{book}/{chapter}/{verse}',
		summary: 'Paragraphes du Catéchisme citant un verset précis.',
		params: [
			{ name: 'book', in: 'path', required: true, description: 'Slug français (jean) ou code USFX (JHN).' },
			{ name: 'chapter', in: 'path', required: true, description: 'Numéro de chapitre.' },
			{ name: 'verse', in: 'path', required: true, description: 'Numéro de verset.' }
		],
		codes: ['unknown_book'],
		example: '/api/bible/jean/3/16'
	},
	{
		path: '/api/liturgie/{date}',
		summary:
			"Célébration du jour et paragraphes du Catéchisme proposés à la méditation avec les lectures.",
		params: [
			{ name: 'date', in: 'path', required: true, description: 'Date AAAA-MM-JJ, ou « today ».' }
		],
		codes: ['bad_date'],
		example: '/api/liturgie/today'
	},
	{
		path: '/api/themes',
		summary: "Vocabulaire thématique complet, avec le nombre de paragraphes par thème.",
		params: [],
		codes: [],
		example: '/api/themes'
	},
	{
		path: '/api/themes/{slug}',
		summary: 'Paragraphes portant un thème donné.',
		params: [
			{ name: 'slug', in: 'path', required: true, description: 'Slug du thème, partagé avec le glossaire.' }
		],
		codes: ['unknown_slug'],
		example: '/api/themes/priere'
	},
	{
		path: '/api/structure',
		summary: 'Arborescence complète du Catéchisme : parties, sections, chapitres, articles.',
		params: [
			{ name: 'depth', in: 'query', required: false, description: '1 parties, 2 sections, 3 chapitres. Absent : tout.' }
		],
		codes: [],
		example: '/api/structure?depth=2'
	},
	{
		path: '/api/glossary',
		summary: 'Liste des entrées du glossaire, groupées par grappe thématique.',
		params: [],
		codes: [],
		example: '/api/glossary'
	},
	{
		path: '/api/glossary/{slug}',
		summary: 'Une entrée du glossaire.',
		params: [
			{ name: 'slug', in: 'path', required: true, description: 'Slug de l’entrée, partagé avec les thèmes.' }
		],
		codes: ['unknown_slug'],
		example: '/api/glossary/priere'
	},
	{
		path: '/api/openapi.json',
		summary: 'Ce document OpenAPI.',
		params: [],
		codes: [],
		example: '/api/openapi.json'
	}
];

const ERROR_SCHEMA = {
	type: 'object',
	required: ['error', 'code'],
	properties: {
		error: { type: 'string', description: 'Message lisible, en français.' },
		code: { type: 'string', description: 'Code stable, à tester par le client.' }
	}
};

export function buildOpenApi(origin: string): Record<string, unknown> {
	const paths: Record<string, unknown> = {};
	for (const route of API_ROUTES) {
		const responses: Record<string, unknown> = {
			'200': { description: 'Succès' }
		};
		if (route.codes.length > 0) {
			responses['400'] = {
				description: `Requête invalide. Codes possibles : ${route.codes.join(', ')}.`,
				content: { 'application/json': { schema: ERROR_SCHEMA } }
			};
			responses['404'] = {
				description: 'Ressource introuvable.',
				content: { 'application/json': { schema: ERROR_SCHEMA } }
			};
		}
		paths[route.path] = {
			get: {
				summary: route.summary,
				parameters: route.params.map((p) => ({
					name: p.name,
					in: p.in,
					required: p.required,
					description: p.description,
					schema: { type: 'string' }
				})),
				responses
			}
		};
	}

	return {
		openapi: '3.1.0',
		info: {
			title: "API du Catéchisme de l'Église catholique",
			version: '1.0.0',
			description:
				"API publique en lecture seule, sans clé ni authentification. Les champs documentés sont stables : de nouveaux champs peuvent s'ajouter, aucun n'est retiré ni renommé."
		},
		servers: [{ url: origin }],
		paths
	};
}
```

- [ ] **Step 4: Write the route**

Create `src/routes/api/openapi.json/+server.ts`:

```ts
import { apiJson } from '$lib/server/api/http';
import { buildOpenApi } from '$lib/server/api/spec';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => apiJson(buildOpenApi(url.origin));
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/api-spec.test.ts`
Expected: PASS, 5 tests. If "declares every route that exists" fails, a route built in an earlier task is missing from `API_ROUTES` · add it rather than weakening the test.

- [ ] **Step 6: Commit**

```bash
npm run format && npm run lint && npm run check && npm run test
git add src/lib/server/api/spec.ts src/routes/api/openapi.json tests/unit/api-spec.test.ts
git commit -m "feat(api): OpenAPI document with a bidirectional drift guard"
```

---

### Task 13: Rewrite the `/api` documentation page

**Files:**

- Modify: `src/routes/api/+page.svelte`
- Modify: `src/routes/llms.txt/+server.ts`
- Test: `tests/e2e/api-docs.test.ts`

**Interfaces:**

- Consumes: `API_ROUTES` from `src/lib/server/api/spec.ts`.
- Produces: nothing consumed by later tasks.

Note: `src/lib/server/api/spec.ts` sits under `$lib/server`, which SvelteKit forbids importing into client-side code. Load `API_ROUTES` in a `+page.server.ts` and pass it to the page as data.

- [ ] **Step 1: Write the failing test**

Create `tests/e2e/api-docs.test.ts`:

```ts
import { test, expect } from '@playwright/test';

test('the docs page lists every documented route', async ({ page, request }) => {
	const spec = await (await request.get('/api/openapi.json')).json();
	await page.goto('/api');
	for (const path of Object.keys(spec.paths)) {
		await expect(page.getByText(path, { exact: false }).first()).toBeVisible();
	}
});

test('the docs page points at the OpenAPI document and the raw data', async ({ page }) => {
	await page.goto('/api');
	await expect(page.getByRole('link', { name: /openapi\.json/ })).toBeVisible();
	await expect(page.getByRole('link', { name: /cited-by\.json/ })).toBeVisible();
});

test('llms.txt advertises the OpenAPI document', async ({ request }) => {
	const body = await (await request.get('/llms.txt')).text();
	expect(body).toContain('/api/openapi.json');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e -- tests/e2e/api-docs.test.ts`
Expected: FAIL, the new routes are absent from the page.

- [ ] **Step 3: Add the page loader**

Create `src/routes/api/+page.server.ts`:

```ts
import { API_ROUTES } from '$lib/server/api/spec';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ routes: API_ROUTES });
```

- [ ] **Step 4: Render the route table from the spec**

Modify `src/routes/api/+page.svelte`. Keep the existing `ProseLayout`, the `svelte:head`, the two worked examples for `/api/cec/{number}` and `/api/search`, and the whole `<style>` block. Replace the script block with:

```svelte
<script lang="ts">
	import ProseLayout from '$lib/components/ui/ProseLayout.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>
```

Then, after the introductory paragraph and before the existing "Paragraphe par
numéro" section, insert the generated reference table:

```svelte
	<h2>Points d'accès</h2>

	<table>
		<thead>
			<tr><th>Route</th><th>Description</th><th>Exemple</th></tr>
		</thead>
		<tbody>
			{#each data.routes as route (route.path)}
				<tr>
					<td><code>GET {route.path}</code></td>
					<td>{route.summary}</td>
					<td><a href={route.example}><code>{route.example}</code></a></td>
				</tr>
			{/each}
		</tbody>
	</table>

	<p>
		Le document <a href="/api/openapi.json"><code>/api/openapi.json</code></a> décrit
		l'ensemble au format OpenAPI 3.1, utilisable par un générateur de client ou par un
		agent.
	</p>
```

Add these two sections near the end, before the existing "Usage" heading:

```svelte
	<h2>Blocs d'étude</h2>

	<p>
		<code>/api/cec/[number]</code> et <code>/api/cec</code> acceptent un paramètre
		<code>include</code> qui joint les données du panneau d'étude à la réponse :
		<code>cited_by</code>, <code>themes</code>, <code>sources</code>,
		<code>liturgy</code>, <code>compendium</code>, <code>en_bref</code>,
		<code>bible</code>, <code>cdse</code>, <code>denzinger</code>. La valeur
		<code>all</code> les joint tous.
	</p>

	<pre><code>GET /api/cec/2559?include=themes,liturgy</code></pre>

	<p>
		Chaque bloc apparaît comme une clé de premier niveau. Un bloc qui échoue vaut
		<code>null</code> et son nom apparaît dans <code>partial</code> : le texte du
		paragraphe reste servi.
	</p>

	<p>
		Le bloc <code>ai</code> se demande explicitement et n'est jamais inclus par
		<code>all</code>. Il sert un commentaire généré automatiquement, marqué
		<code>"generated": true</code>, qui n'appartient pas au Catéchisme et n'a aucune
		autorité magistérielle.
	</p>

	<h2>Données brutes</h2>

	<p>
		Les fichiers JSON qui alimentent le site sont servis tels quels et lisibles depuis
		un autre domaine. Par exemple
		<a href="/data/cec/cited-by.json"><code>/data/cec/cited-by.json</code></a> contient
		la relation complète des renvois inverses, paragraphe par paragraphe.
	</p>
```

Finally, update the "Usage" section's closing sentence to state the versioning
promise: no documented field is removed or renamed; new fields may appear.

- [ ] **Step 5: Advertise the spec in llms.txt**

Modify `src/routes/llms.txt/+server.ts`. Find the section listing site resources
and add a line in the same format as its neighbours:

```
/api/openapi.json : description OpenAPI 3.1 de l'API publique (lecture seule, sans clé)
```

Match the surrounding formatting exactly rather than inventing a new style ·
read the file first.

- [ ] **Step 6: Run the tests**

Run: `npm run test:e2e -- tests/e2e/api-docs.test.ts`
Expected: PASS, 3 tests

- [ ] **Step 7: Full verification**

Run: `npm run format && npm run lint && npm run check && npm run test && npm run test:e2e`
Expected: everything PASS, including the Task 1 contract guard.

- [ ] **Step 8: Commit**

```bash
git add src/routes/api/+page.svelte src/routes/api/+page.server.ts \
  src/routes/llms.txt/+server.ts tests/e2e/api-docs.test.ts
git commit -m "docs(api): route table generated from the spec, include and raw-data sections"
```

---

## Self-Review

**Spec coverage.** Every section of the design maps to a task: CORS, error codes and versioning enforcement to Task 1; the `include` mechanism to Tasks 2 and 3; the ten blocks to Tasks 3 to 6; the batch route to Task 7; the new `by-occasion.json` artifact and the liturgy route to Task 8; the bible, themes, structure and glossary entry points to Tasks 9 to 11; OpenAPI and the drift guard to Task 12; the docs page, the raw-data note replacing `/api/graph`, and the `llms.txt` line to Task 13. The `search` route's `corpus`/`limit`/`offset` parameters from the spec's "Extended, additive" table are **not** implemented by any task · see Known Gap below.

**Type consistency.** `BlockName` is defined once in Task 2 and imported everywhere. `BlockFn` is `(n: number, fetcher: Fetch) => Promise<unknown>` in Task 3 and every block in Tasks 4 to 6 matches it. `ApiErrorCode` is defined in Task 1 and every task's error paths draw from that union. `assembleBlocks` keeps one signature from Task 3 through Task 7.

**Known Gap · deliberate.** The spec lists `corpus`, `limit` and `offset` on `/api/search`. No task implements them: they are pagination and filtering over an existing working route, orthogonal to exposing the study data, and adding them would widen Task 1 without serving the goal. Left out with the reasoning stated rather than smuggled into an unrelated task. `/api/search` still gains CORS and error codes in Task 1, so it is not untouched.

**One conditional step remains:** Task 8 Step 8 asks the implementer to match the existing `fetchJson` helper's signature, naming `loadDenzingerIndex` at `src/lib/data/loaders.ts:843` as the working example. Everything else is fixed code.
