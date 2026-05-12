/**
 * og:image resolution · single source of truth for "which cover does
 * this URL share on social". Consumed by +layout.svelte (default
 * emission for every page) and MetaTags (for the JSON-LD `image`
 * field on landings that supply a schema).
 *
 * Priority:
 *   1. Explicit override (`override` argument) · used when a page
 *      really needs a different image than the corpus default
 *   2. Cover of the corpus that owns the path (every reader page
 *      inherits its Bibliothèque cover)
 *   3. Featured-work cover (CEC and Bible · not in CORPORA but in
 *      FEATURED)
 *   4. Site default OG card (/img/og-image.png · 1200×630)
 *
 * Returns the relative path (leading slash) plus the natural geometry
 * of the resolved image so consumers can emit accurate og:image:width
 * and og:image:height.
 */
import { corpusForPath, FEATURED } from './corpora';

export interface OgImage {
	path: string;
	width: number;
	height: number;
}

const SITE_DEFAULT: OgImage = {
	path: '/img/og-image.png',
	width: 1200,
	height: 630
};

const COVER_GEOMETRY = { width: 800, height: 800 } as const;

export function resolveOgImage(pathname: string, override?: string): OgImage {
	if (override) {
		// Assume an explicit override points at a square cover plate
		// unless it literally is the site default landscape card.
		if (override === SITE_DEFAULT.path) return SITE_DEFAULT;
		return { path: override, ...COVER_GEOMETRY };
	}
	const corpus = corpusForPath(pathname);
	if (corpus) return { path: corpus.cover, ...COVER_GEOMETRY };
	const featured = FEATURED.find(
		(f) => pathname === f.urlPrefix || pathname.startsWith(f.urlPrefix + '/')
	);
	if (featured) return { path: featured.cover, ...COVER_GEOMETRY };
	return SITE_DEFAULT;
}
