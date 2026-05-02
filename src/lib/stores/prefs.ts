import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'auto' | 'light' | 'sepia' | 'dark' | 'oled';
export const THEMES: Theme[] = ['auto', 'light', 'sepia', 'dark', 'oled'];
export const THEME_LABELS: Record<Theme, string> = {
	auto: 'Auto',
	light: 'Clair',
	sepia: 'Sépia',
	dark: 'Sombre',
	oled: 'OLED'
};

const KEY = 'lecatechisme.theme';

function readInitial(): Theme {
	if (!browser) return 'auto';
	const stored = localStorage.getItem(KEY) as Theme | null;
	if (stored && THEMES.includes(stored)) return stored;
	return 'auto';
}

export const theme = writable<Theme>(readInitial());

if (browser) {
	theme.subscribe((t) => {
		document.documentElement.setAttribute('data-theme', t);
		localStorage.setItem(KEY, t);
	});
}
