import { writable } from 'svelte/store';

/**
 * Whether /recherche's current result includes an actual Bible passage
 * rendered in paragraph mode (an excerpt, not the flat/italic fallback) ·
 * lets ReadingPrefs offer the verse-number settings there too, since those
 * are the only Bible text settings that visibly do anything on that page.
 */
export const bibleResultVisible = writable(false);
