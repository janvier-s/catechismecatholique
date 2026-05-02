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
const PANEL_KEY = 'lecatechisme.panelWidth';
const DEFAULT_PANEL_WIDTH = '420px';

function readInitial(): Theme {
	if (!browser) return 'auto';
	const stored = localStorage.getItem(KEY) as Theme | null;
	if (stored && THEMES.includes(stored)) return stored;
	return 'auto';
}

function readInitialPanelWidth(): string {
	if (!browser) return DEFAULT_PANEL_WIDTH;
	const stored = localStorage.getItem(PANEL_KEY);
	if (stored && /^\d+(\.\d+)?(px|vw)$/.test(stored)) return stored;
	return DEFAULT_PANEL_WIDTH;
}

export const theme = writable<Theme>(readInitial());
export const panelWidth = writable<string>(readInitialPanelWidth());

if (browser) {
	theme.subscribe((t) => {
		document.documentElement.setAttribute('data-theme', t);
		localStorage.setItem(KEY, t);
	});
	panelWidth.subscribe((w) => {
		localStorage.setItem(PANEL_KEY, w);
	});
}
