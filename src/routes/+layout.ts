import type { LayoutLoad } from './$types';
import { needsCecStructure } from '$lib/sidebarRoute';
import { loadStructureToc, loadEnBrefsIndex, type EnBrefIndexEntry } from '$lib/data/loaders';

/**
 * Server-render the CCC sidebar tree.
 *
 * The Sidebar used to fetch this itself from an `$effect`, which meant the rail
 * painted empty and filled in ~490ms later — the fetch itself takes 4ms; the
 * wait was hydration. Loading it here puts the tree in the first byte instead.
 *
 * `structure-toc.json` rather than `structure.json`: it's the same tree minus
 * the per-level `paragraphs[]` arrays, 20 KB gzip instead of 42, and every
 * paragraph bound the sidebar needs is available from the `range` field. Only
 * fetched on routes that actually show the rail.
 */
export const load: LayoutLoad = async ({ url, fetch }) => {
	if (!needsCecStructure(url.pathname)) return { cecStructure: null, cecEnBrefs: null };
	// The En Bref rows used to wait on the per-chapter detail file, which the
	// Sidebar only fetches after hydration — so they popped in late. The index
	// carries every block's paragraph list in 2.4 KB gzip, enough to place them
	// server-side; the chapter detail still layers in the Paragraphe wrappers.
	const [structure, enBrefs] = await Promise.all([
		loadStructureToc(fetch).catch(() => null),
		loadEnBrefsIndex(fetch).catch(() => null)
	]);
	// A failed fetch must not take the whole page down · the Sidebar falls back
	// to fetching client-side, exactly as it did before.
	return {
		cecStructure: structure as { parts: unknown[] } | null,
		cecEnBrefs: enBrefs as EnBrefIndexEntry[] | null
	};
};
