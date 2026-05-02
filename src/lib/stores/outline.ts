import { writable } from 'svelte/store';

// Stores remain stores even in runes mode — `$store` auto-subscription works.
export const activeHeadingId = writable<string | null>(null);
