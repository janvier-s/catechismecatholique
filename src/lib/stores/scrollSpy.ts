import { writable } from 'svelte/store';

/**
 * Currently-visible heading id on a long article page, scoped to the
 * pathname it was emitted on. Article pages set this via a scroll listener
 * as the reader scrolls; the Sidebar reads it to highlight the matching
 * nested entry.
 *
 * The pathname is part of the value so a stale hash from a previous page
 * can't bleed into the next page's activeHref. Without this, navigating from
 * a chapter view (where, say, en-bref-68 was active) to a different
 * article's page would briefly produce activeHref = "/article-2#en-bref-68"
 * — making BOTH the previous article's En Bref entry AND the new article
 * highlight in the sidebar.
 *
 * Null when no article page is mounted or before the first heading enters
 * view.
 */
export interface ActiveHeading {
	pathname: string;
	id: string;
}
export const activeHeading = writable<ActiveHeading | null>(null);
