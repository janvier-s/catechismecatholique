import { writable } from 'svelte/store';

export type PanelTab =
	| 'bible'
	| 'cross-refs'
	| 'cited-by'
	| 'sources'
	| 'en-bref'
	| 'concordance'
	| 'bible-verse';

// PanelContext is a discriminated union: 'paragraph' contexts come from CCC
// paragraph clicks (and carry the paragraph number plus an optional bible_refs
// idx for the Bible tab to scroll to). 'verse' contexts come from clicking a
// Bible verse marker — only the bible-verse tab is meaningful in that mode.
export type PanelContext =
	| { kind: 'paragraph'; paragraph: number; bibleRefIdx?: number }
	| { kind: 'verse'; verseUsfx: string; verseChapter: number; verseVerse: number };

export interface PanelState {
	open: boolean;
	activeTab: PanelTab | null;
	context: PanelContext | null;
}

const initial: PanelState = { open: false, activeTab: null, context: null };
export const studyPanel = writable<PanelState>(initial);

export function openPanel(context: PanelContext, tab: PanelTab = 'bible'): void {
	studyPanel.set({ open: true, activeTab: tab, context });
}

export function closePanel(): void {
	studyPanel.update((s) => ({ ...s, open: false }));
}
