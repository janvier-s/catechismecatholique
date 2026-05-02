import { writable } from 'svelte/store';

export type PanelTab = 'bible' | 'cross-refs' | 'cited-by' | 'sources' | 'en-bref';

export interface PanelContext {
	paragraph: number;
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
