import { redirect, type Handle } from '@sveltejs/kit';

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
	return resolve(event);
};
