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
export type BibleLayout = 'verse' | 'paragraph';
export type VerseNumberColor = 'accent' | 'subtle';

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
	bibleLayout: BibleLayout;
	hideVerseNumbers: boolean;
	hideBibleHeadings: boolean; // major/section headings, both reading modes
	bibleStudyMode: boolean; // Bible reader: show Catechism citation annotations
	hideChapterNav: boolean; // Bible reader: the sticky chapter navigation row
	showVulgatePsalms: boolean; // Psalms: show the Vulgate number beside the Hebrew one
	bionicReading: boolean; // bold each word's leading fraction, all corpora
	bionicFixation: number; // 1-5, how much of each word is bolded
	bionicSaccade: number; // 0-4, bold only every (n+1)-th word
	infiniteScroll: boolean; // Bible reader: load the next chapter as you scroll
	verseNumberColor: VerseNumberColor;
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
	crossRefsLayout: 'side',
	bibleLayout: 'verse',
	hideVerseNumbers: false,
	hideBibleHeadings: true,
	bibleStudyMode: true,
	hideChapterNav: false,
	showVulgatePsalms: false,
	bionicReading: false,
	bionicFixation: 3,
	bionicSaccade: 0,
	infiniteScroll: false,
	verseNumberColor: 'subtle'
};

const KEY = 'catechismecatholique.prefs';
const PANEL_KEY = 'catechismecatholique.panelWidth';
/** Resolved --font-body stack, mirrored for static/theme-init.js. */
const FONT_STACK_KEY = 'catechismecatholique.fontStack';
// A third of the viewport, so the panel scales with the screen instead of
// sitting at a fixed 420px that ate half a laptop and a sliver of a 4K display.
// `max()` holds the 280px floor the resize util enforces (768px × ⅓ = 256px).
// Only the default is an expression — a dragged width is always saved in px.
const DEFAULT_PANEL_WIDTH = 'max(280px, 33.3333vw)';

function readInitial(): ReadingPrefs {
	if (!browser) return { ...DEFAULTS };
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) {
			// Migrate legacy theme key, if present.
			const legacyTheme = localStorage.getItem('catechismecatholique.theme') as Theme | null;
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
		// Keep the mobile browser chrome in step with the theme. Read back the
		// computed --color-bg (the attribute above has already invalidated style,
		// so this returns the new theme's value) rather than restating the palette
		// here · static/theme-init.js does the same on first paint.
		const themeColor = getComputedStyle(root).getPropertyValue('--color-bg').trim();
		if (themeColor) {
			document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
		}
		root.dataset.columnWidth = $p.columnWidth;
		root.dataset.crossRefsLayout = $p.crossRefsLayout;
		root.dataset.hideAllNotes = String($p.hideAllNotes);
		root.dataset.hideCrossRefs = String($p.hideCrossRefs);
		root.dataset.hideBibleMarkers = String($p.hideBibleMarkers);
		root.dataset.hideBibleInline = String($p.hideBibleInline);
		root.dataset.hideSourceFootnotes = String($p.hideSourceFootnotes);
		root.dataset.inlineAsMarkers = String($p.inlineAsMarkers);
		root.dataset.justified = String($p.justifiedText);
		root.dataset.bionic = String($p.bionicReading);
		root.style.setProperty('--reader-font-size', `${$p.fontSize}px`);
		root.style.setProperty('--reader-line-height', String($p.lineHeight));
		const font = getFontById($p.fontFamily);
		if (font) {
			root.style.setProperty('--font-body', font.stack);
			// Persist the resolved stack so static/theme-init.js can apply it
			// before first paint without needing a copy of the font registry.
			localStorage.setItem(FONT_STACK_KEY, font.stack);
		}
	});
	panelWidth.subscribe((w) => {
		localStorage.setItem(PANEL_KEY, w);
	});
}

export function updatePref<K extends keyof ReadingPrefs>(key: K, value: ReadingPrefs[K]): void {
	prefs.update((p) => ({ ...p, [key]: value }));
}
