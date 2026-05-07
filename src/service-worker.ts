/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Service worker — offline reading for the catechism + bible.
//
// Strategies:
// - app shell + prerendered HTML + build assets: cached on install, served
//   cache-first (versioned URLs, so safe to evict by version)
// - /data/ccc/* and /data/bible/* and /fonts/*: cache-first, lazy. These
//   shards are immutable across deploys; serving the cached copy is correct
//   even when a new version exists, until the SW reactivates and clears.
// - dynamic HTML routes: network-first, fall back to cache, fall back to
//   the cached homepage. Lets the reader keep reading offline even if the
//   exact page wasn't pre-cached.

import { build, files, version, prerendered } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = `app-${version}`;
const DATA_CACHE = 'data-v1';
const FONT_CACHE = 'fonts-v1';

// Build-versioned assets + static files + prerendered HTML — known up front.
const APP_SHELL = [...build, ...files, ...prerendered];

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

	// /data/* — immutable text, cache-first.
	if (url.pathname.startsWith('/data/')) {
		event.respondWith(cacheFirst(req, DATA_CACHE));
		return;
	}

	// /fonts/* — versioned long-cache assets.
	if (url.pathname.startsWith('/fonts/')) {
		event.respondWith(cacheFirst(req, FONT_CACHE));
		return;
	}

	// App shell + prerendered HTML — try cache first, fall back to network.
	if (APP_SHELL.includes(url.pathname)) {
		event.respondWith(cacheFirst(req, CACHE_VERSION));
		return;
	}

	// HTML / other GETs — network-first, cache as backup, fall back to "/".
	if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
		event.respondWith(networkFirstWithFallback(req));
		return;
	}

	// Anything else — pass through.
});

async function cacheFirst(req: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(req);
	if (cached) return cached;
	const res = await fetch(req);
	if (res.ok) cache.put(req, res.clone());
	return res;
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
