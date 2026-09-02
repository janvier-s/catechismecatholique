import { redirect, type Handle } from '@sveltejs/kit';
import { CORS_HEADERS } from '$lib/server/api/http';

/**
 * Permanent redirect for legacy `/ccc[/...]` paths to the canonical `/cec`
 * tree. Search Console picked up the old slug from an early sitemap upload
 * and keeps surfacing broken links · this hook serves a 308 from the
 * Cloudflare Worker for any unmatched `/ccc*` URL.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const p = event.url.pathname;
	if (p === '/ccc' || p.startsWith('/ccc/')) {
		const target = '/cec' + p.slice(4) + event.url.search;
		throw redirect(308, target);
	}
	// The Denzinger landing was renamed to /enchiridion to reflect that
	// Enchiridion Symbolorum is the work's actual title; "Denzinger" is the
	// editor's name. Keep the old URLs alive with a permanent redirect.
	if (p === '/denzinger' || p.startsWith('/denzinger/')) {
		const target = '/enchiridion' + p.slice('/denzinger'.length) + event.url.search;
		throw redirect(308, target);
	}
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
};
