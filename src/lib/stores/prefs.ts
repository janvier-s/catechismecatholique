import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';
const KEY = 'lecatechisme.theme';

function readInitial(): Theme {
	if (!browser) return 'light';
	const stored = localStorage.getItem(KEY) as Theme | null;
	if (stored === 'light' || stored === 'dark') return stored;
	return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const theme = writable<Theme>(readInitial());

if (browser) {
	theme.subscribe((t) => {
		document.documentElement.setAttribute('data-theme', t);
		localStorage.setItem(KEY, t);
	});
}
