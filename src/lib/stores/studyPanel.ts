import { writable } from 'svelte/store';

export type PanelTab = 'bible' | 'cross-refs' | 'cited-by' | 'sources' | 'en-bref' | 'bible-verse';

export interface PanelContext {
	paragraph: number;
	// Set when the panel was opened from a Bible verse marker. When present,
	// the only meaningful tab is 'bible-verse'.
	verseUsfx?: string;
	verseChapter?: number;
	verseVerse?: number;
	// data-idx of the bible_refs entry the user clicked, so the Bible tab can
	// scroll to and highlight that specific reference among the paragraph's refs.
	bibleRefIdx?: number;
}

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
