/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Service worker · offline reading for the catechism + bible.
//
// Strategies:
// - build assets: cached on install, served cache-first. Their filenames are
//   content-hashed, so a cached copy is by definition the right one.
// - static files (static/) + prerendered HTML: cached on install but served
//   network-first. Their URLs are stable across deploys, so cache-first pins
//   whatever happened to be cached and a fix can never reach the browser.
//   /theme-init.js is the sharp edge here: it runs before first paint, and a
//   stale copy silently re-introduces the theme/layout flash it exists to
//   prevent — which is exactly what it did. Offline still works: these are
//   pre-cached on install and refreshed on every successful fetch.
// - /data/cec/* and /data/bible/* and /fonts/*: cache-first, lazy. These
//   shards are immutable across deploys; serving the cached copy is correct
//   even when a new version exists, until the SW reactivates and clears.
// - dynamic HTML routes: network-first, fall back to cache, fall back to
//   the cached homepage. Lets the reader keep reading offline even if the
//   exact page wasn't pre-cached.

import { build, files, version, prerendered } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = `app-${version}`;
// Bumped to v2: the Compendium data + /cec rename invalidated the previous
// data shape. Tie to the build version so future schema changes bust the
// cache automatically without requiring a manual bump here.
const DATA_CACHE = `data-${version}`;
const FONT_CACHE = 'fonts-v1';

// Everything known up front · pre-cached on install so the app works offline.
// Deduped: `files` and `prerendered` can overlap (e.g. both list "/"), and
// Cache.addAll() throws InvalidStateError on duplicate requests.
const APP_SHELL = [...new Set([...build, ...files, ...prerendered])];
// Content-hashed build output · a cached copy can never be wrong.
const IMMUTABLE = new Set(build);
// Stable-URL assets · must be revalidated, see the strategy note above.
const REVALIDATE = new Set([...files, ...prerendered]);

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_VERSION);
			await cache.addAll(APP_SHELL);
			// Activate immediately so the next navigation uses this version.
			await self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			// Drop old app-shell versions; keep data and font caches across
			// deploys (their entries are content-addressed by URL and stable).
			const keep = new Set([CACHE_VERSION, DATA_CACHE, FONT_CACHE]);
			const names = await caches.keys();
			await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;

	const url = new URL(req.url);

	// Only handle same-origin requests; let the network handle the rest
	// (e.g. Cloudflare Web Analytics beacons, external links).
	if (url.origin !== self.location.origin) return;

	// /api/search is dynamic; don't intercept (Cloudflare edge cache handles it).
	if (url.pathname.startsWith('/api/')) return;

	// /data/* · immutable text, cache-first.
	if (url.pathname.startsWith('/data/')) {
		event.respondWith(cacheFirst(req, DATA_CACHE));
		return;
	}

	// /fonts/* · versioned long-cache assets.
	if (url.pathname.startsWith('/fonts/')) {
		event.respondWith(cacheFirst(req, FONT_CACHE));
		return;
	}

	// Content-hashed build output · cache-first.
	if (IMMUTABLE.has(url.pathname)) {
		event.respondWith(cacheFirst(req, CACHE_VERSION));
		return;
	}

	// Static files + prerendered HTML · network-first so an updated copy is
	// picked up on the next load rather than being pinned until the SW version
	// changes. Falls back to the cached copy when offline.
	if (REVALIDATE.has(url.pathname)) {
		event.respondWith(networkFirst(req, CACHE_VERSION));
		return;
	}

	// HTML / other GETs · network-first, cache as backup, fall back to "/".
	if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
		event.respondWith(networkFirstWithFallback(req));
		return;
	}

	// Anything else · pass through.
});

async function cacheFirst(req: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(req);
	if (cached) return cached;
	// Fonts (and any other static file) are pre-cached into CACHE_VERSION by
	// install, but are served out of FONT_CACHE — so without this second look
	// every font missed on the first load after an install and went to the
	// network, which with font-display:optional is exactly what makes text
	// paint in the fallback face. Promote the hit into the target cache so the
	// cross-lookup only ever happens once per asset.
	if (cacheName !== CACHE_VERSION) {
		const shell = await caches.open(CACHE_VERSION);
		const preCached = await shell.match(req);
		if (preCached) {
			void cache.put(req, preCached.clone());
			return preCached;
		}
	}
	const res = await fetch(req);
	if (res.ok) cache.put(req, res.clone());
	return res;
}

/**
 * Network-first for a single asset. Distinct from networkFirstWithFallback:
 * that one falls back to the cached homepage, which is right for a navigation
 * but would hand back HTML for a missing script or icon.
 */
async function networkFirst(req: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	try {
		const res = await fetch(req);
		if (res.ok) cache.put(req, res.clone());
		return res;
	} catch {
		const cached = await cache.match(req);
		if (cached) return cached;
		throw new Error(`offline and not cached: ${req.url}`);
	}
}

async function networkFirstWithFallback(req: Request): Promise<Response> {
	const cache = await caches.open(CACHE_VERSION);
	try {
		const res = await fetch(req);
		if (res.ok) cache.put(req, res.clone());
		return res;
	} catch {
		const cached = await cache.match(req);
		if (cached) return cached;
		const home = await cache.match('/');
		if (home) return home;
		return new Response('Hors connexion', { status: 503, statusText: 'Service Unavailable' });
	}
}
