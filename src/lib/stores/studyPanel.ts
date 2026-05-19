import { writable } from 'svelte/store';

export type PanelTab =
	| 'bible'
	| 'cross-refs'
	| 'cited-by'
	| 'sources'
	| 'themes'
	| 'en-bref'
	| 'audio'
	| 'concordance'
	| 'bible-verse'
	| 'compendium'
	| 'cdse-citers'
	| 'ia'
	| 'trent-notes'
	| 'denzinger-cross-refs'
	| 'denzinger-cited-by';

export type TrentFootnote = { n: number; text: string };

// PanelContext is a discriminated union: 'paragraph' contexts come from CCC
// paragraph clicks (and carry the paragraph number plus an optional bible_refs
// idx for the Bible tab to scroll to). 'verse' contexts come from clicking a
// Bible verse marker · only the bible-verse tab is meaningful in that mode.
// 'trent-paragraph' contexts come from Trent paragraph clicks and carry the
// footnotes relevant to that paragraph.
export type PanelContext =
	| { kind: 'paragraph'; paragraph: number; bibleRefIdx?: number }
	| { kind: 'verse'; verseUsfx: string; verseChapter: number; verseVerse: number }
	| { kind: 'trent-paragraph'; paragraph: number; footnotes: TrentFootnote[] }
	| { kind: 'denzinger-entry'; n: number };

export interface PanelState {
	open: boolean;
	activeTab: PanelTab | null;
	context: PanelContext | null;
	requestPlay?: number;
}

const initial: PanelState = { open: false, activeTab: null, context: null };
export const studyPanel = writable<PanelState>(initial);

export function openPanel(context: PanelContext, tab: PanelTab = 'bible', autoPlay = false): void {
	studyPanel.update((s) => ({
		open: true,
		activeTab: tab,
		context,
		requestPlay: autoPlay ? (s.requestPlay ?? 0) + 1 : s.requestPlay
	}));
}

export function closePanel(): void {
	studyPanel.update((s) => ({ ...s, open: false }));
}
