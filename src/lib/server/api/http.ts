/**
 * Shared HTTP shaping for the public API. Every `/api/*` route returns
 * through these helpers so the CORS, cache and error contract stays in one
 * place · see docs/superpowers/specs/2026-09-02-api-expansion-design.md.
 */

export type ApiErrorCode =
	| 'paragraph_out_of_range'
	| 'unknown_include'
	| 'too_many_blocks'
	| 'too_many_paragraphs'
	| 'bad_date'
	| 'bad_reference'
	| 'unknown_slug'
	| 'unknown_book'
	| 'query_too_short'
	| 'too_many_refs';

// Read-only public data, no credentials, no cookies · `*` is correct here and
// carries no risk. Without it the documented API is uncallable from a browser
// on any other origin.
export const CORS_HEADERS: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	// A client sending Content-Type on a GET triggers a preflight; without this
	// the preflight answer would omit the header it asked about and the request
	// would still fail.
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Max-Age': '86400'
};

const DEFAULT_MAX_AGE = 3600;
const DEFAULT_S_MAX_AGE = 86400;

/**
 * `sharedCacheSeconds` must be passed whenever a response expires for a
 * reason the edge has to respect too. Cloudflare's shared cache prefers
 * `s-maxage` over `max-age`, so leaving it at the default would let the edge
 * serve a stale body long after the browser TTL ran out · that is exactly how
 * `/api/liturgie/today` would go on serving yesterday's date.
 */
export function apiJson(
	body: unknown,
	cacheSeconds: number = DEFAULT_MAX_AGE,
	sharedCacheSeconds: number = DEFAULT_S_MAX_AGE
): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': `public, max-age=${cacheSeconds}, s-maxage=${sharedCacheSeconds}`,
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
