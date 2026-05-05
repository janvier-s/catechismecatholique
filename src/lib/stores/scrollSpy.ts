import { writable } from 'svelte/store';

/**
 * Currently-visible heading id on a long article page. Article pages set this
 * via an IntersectionObserver as the reader scrolls; the Sidebar reads it to
 * highlight the matching nested entry.
 *
 * Null when no article page is mounted or before the first heading enters
 * view.
 */
export const activeHeading = writable<string | null>(null);
