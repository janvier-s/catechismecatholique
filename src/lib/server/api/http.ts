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
