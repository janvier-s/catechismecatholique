import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { DEFAULT_FONT_ID, getFontById } from '$lib/data/fonts';

export type Theme = 'auto' | 'light' | 'sepia' | 'dark' | 'oled';
export const THEMES: Theme[] = ['auto', 'light', 'sepia', 'dark', 'oled'];
export const THEME_LABELS: Record<Theme, string> = {
	auto: 'Auto',
	light: 'Clair',
	sepia: 'Sépia',
	dark: 'Sombre',
	oled: 'OLED'
};

export type ColumnWidth = 'narrow' | 'default' | 'wide';
export type CrossRefsLayout = 'inline' | 'side';

export interface ReadingPrefs {
	theme: Theme;
	fontFamily: string; // FONTS id, or DYSLEXIA_FONT.id
	fontSize: number; // px
	lineHeight: number; // 1.5 / 1.6 / 2.0
	columnWidth: ColumnWidth;
	justifiedText: boolean;
	// Notes / refs visibility (catechism-specific)
	hideAllNotes: boolean;
	hideCrossRefs: boolean;
	hideBibleMarkers: boolean; // sup-style ², ³ (the "voir" footnotes)
	hideBibleInline: boolean; // (Os 11, 1) parens
	hideSourceFootnotes: boolean;
	inlineAsMarkers: boolean;
	crossRefsLayout: CrossRefsLayout;
}

const DEFAULTS: ReadingPrefs = {
	theme: 'auto',
	fontFamily: DEFAULT_FONT_ID,
	fontSize: 17,
	lineHeight: 1.6,
	columnWidth: 'default',
	justifiedText: false,
	hideAllNotes: false,
	hideCrossRefs: false,
	hideBibleMarkers: false,
	hideBibleInline: false,
	hideSourceFootnotes: false,
	inlineAsMarkers: false,
	crossRefsLayout: 'inline'
};

const KEY = 'lecatechisme.prefs';
const PANEL_KEY = 'lecatechisme.panelWidth';
const DEFAULT_PANEL_WIDTH = '420px';

function readInitial(): ReadingPrefs {
	if (!browser) return { ...DEFAULTS };
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) {
			// Migrate legacy theme key, if present.
			const legacyTheme = localStorage.getItem('lecatechisme.theme') as Theme | null;
			return {
				...DEFAULTS,
				theme: legacyTheme && THEMES.includes(legacyTheme) ? legacyTheme : DEFAULTS.theme
			};
		}
		const parsed = JSON.parse(raw) as Partial<ReadingPrefs>;
		return { ...DEFAULTS, ...parsed };
	} catch {
		return { ...DEFAULTS };
	}
}

function readInitialPanelWidth(): string {
	if (!browser) return DEFAULT_PANEL_WIDTH;
	const stored = localStorage.getItem(PANEL_KEY);
	if (stored && /^\d+(\.\d+)?(px|vw)$/.test(stored)) return stored;
	return DEFAULT_PANEL_WIDTH;
}

export const prefs = writable<ReadingPrefs>(readInitial());
export const panelWidth = writable<string>(readInitialPanelWidth());

// Back-compat: components that imported `theme` keep working.
export const theme = derived(prefs, ($p) => $p.theme);

if (browser) {
	prefs.subscribe(($p) => {
		localStorage.setItem(KEY, JSON.stringify($p));
		const root = document.documentElement;
		root.setAttribute('data-theme', $p.theme);
		root.dataset.columnWidth = $p.columnWidth;
		root.dataset.crossRefsLayout = $p.crossRefsLayout;
		root.dataset.hideAllNotes = String($p.hideAllNotes);
		root.dataset.hideCrossRefs = String($p.hideCrossRefs);
		root.dataset.hideBibleMarkers = String($p.hideBibleMarkers);
		root.dataset.hideBibleInline = String($p.hideBibleInline);
		root.dataset.hideSourceFootnotes = String($p.hideSourceFootnotes);
		root.dataset.inlineAsMarkers = String($p.inlineAsMarkers);
		root.dataset.justified = String($p.justifiedText);
		root.style.setProperty('--reader-font-size', `${$p.fontSize}px`);
		root.style.setProperty('--reader-line-height', String($p.lineHeight));
		const font = getFontById($p.fontFamily);
		if (font) root.style.setProperty('--font-body', font.stack);
	});
	panelWidth.subscribe((w) => {
		localStorage.setItem(PANEL_KEY, w);
	});
}

export function updatePref<K extends keyof ReadingPrefs>(key: K, value: ReadingPrefs[K]): void {
	prefs.update((p) => ({ ...p, [key]: value }));
}
