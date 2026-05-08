<script lang="ts">
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import { fly } from 'svelte/transition';
	import { studyPanel, openPanel, closePanel, type PanelTab } from '$lib/stores/studyPanel';
	import {
		loadParagraph,
		loadCitedBy,
		loadParagraphContext,
		loadChapter,
		loadCompendiumCitedBy
	} from '$lib/data/loaders';
	import type { Paragraph } from '$lib/data/types';
	import PanelShell from './PanelShell.svelte';
	import TabBibleRefs from './TabBibleRefs.svelte';
	import TabCrossRefs from './TabCrossRefs.svelte';
	import TabCitedBy from './TabCitedBy.svelte';
	import TabEnBref from './TabEnBref.svelte';
	import TabSources from './TabSources.svelte';
	import TabBibleVerse from './TabBibleVerse.svelte';
	import TabConcordance from './TabConcordance.svelte';
	import TabCompendium from './TabCompendium.svelte';
	import TabStrip from './TabStrip.svelte';
	import { BOOKS } from '$lib/utils/bibleBookSlug';

	// When the panel is open and the user navigates to a paragraph route
	// (/cec/{n} or /cec/{n}-{m}), update the panel's context to follow.
	// Read the URL reactively, but pull store state with `get` so this effect
	// only re-runs on URL changes — otherwise updating the store inside this
	// effect would loop and clobber explicit context changes from elsewhere.
	$effect(() => {
		const path = page.url.pathname;
		const s = get(studyPanel);
		if (!s.open) return;
		const m = path.match(/^\/cec\/(\d+)(?:-\d+)?$/);
		if (!m) return;
		const n = parseInt(m[1]!, 10);
		if (!Number.isFinite(n)) return;
		if (s.context?.kind === 'paragraph' && s.context.paragraph === n) return;
		openPanel({ kind: 'paragraph', paragraph: n }, s.activeTab ?? 'cross-refs');
	});

	type TabDef = { id: PanelTab; label: string };
	const ALL_TABS: TabDef[] = [
		{ id: 'bible', label: 'Bible' },
		{ id: 'cross-refs', label: 'Renvois' },
		{ id: 'cited-by', label: 'Cités par' },
		{ id: 'sources', label: 'Sources' },
		{ id: 'en-bref', label: 'En Bref' },
		{ id: 'concordance', label: 'Concordance' },
		{ id: 'compendium', label: 'Compendium' }
	];

	let paragraph: Paragraph | null = $state(null);
	let citedByList: number[] = $state([]);
	let hasEnBref: boolean = $state(false);
	let compendiumCiters: number[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx || !$studyPanel.open) {
			paragraph = null;
			citedByList = [];
			hasEnBref = false;
			compendiumCiters = [];
			return;
		}
		// Bible-verse mode has no paragraph context; TabBibleVerse loads its own data.
		if (ctx.kind === 'verse') {
			paragraph = null;
			citedByList = [];
			hasEnBref = false;
			compendiumCiters = [];
			return;
		}
		const paragraphNum = ctx.paragraph;
		(async () => {
			const [p, citedBy, pc, compendiumCB] = await Promise.all([
				loadParagraph(paragraphNum),
				loadCitedBy(),
				loadParagraphContext(paragraphNum),
				loadCompendiumCitedBy()
			]);
			paragraph = p;
			citedByList = citedBy[paragraphNum] ?? [];
			compendiumCiters = compendiumCB[paragraphNum] ?? [];

			// hasEnBref: the paragraph's chapter has at least one en_bref block
			if (pc?.chapter) {
				try {
					const chapter = await loadChapter(pc.chapter.slug);
					hasEnBref = (chapter.en_brefs?.length ?? 0) > 0;
				} catch {
					hasEnBref = false;
				}
			} else {
				hasEnBref = false;
			}
		})();
	});

	// Visible tabs depend on what data is available for the current paragraph.
	const visibleTabs: TabDef[] = $derived.by(() => {
		const out: TabDef[] = [];
		// Bible-verse mode: only one tab is meaningful.
		const ctx = $studyPanel.context;
		if (ctx?.kind === 'verse') {
			return [{ id: 'bible-verse', label: 'CEC' }];
		}
		if (!paragraph) return ALL_TABS;
		const hasBible = paragraph.bible_refs.length > 0;
		const hasCrossRefs = paragraph.cross_refs.length > 0;
		const sourcesCount = paragraph.magisterial_refs.filter(
			(r) => r.type === 'magisterial' || r.type === 'patristic' || r.type === 'liturgical'
		).length;
		// Cités par hidden if the citers are exactly the same set as cross_refs
		const citerSet = new Set(citedByList.map(String));
		const crossSet = new Set(paragraph.cross_refs);
		const sameAsRenvois =
			citerSet.size === crossSet.size && [...citerSet].every((x) => crossSet.has(x));
		const hasCitedBy = citedByList.length > 0 && !sameAsRenvois;

		if (hasBible) out.push({ id: 'bible', label: 'Bible' });
		if (hasCrossRefs) out.push({ id: 'cross-refs', label: 'Renvois' });
		if (hasCitedBy) out.push({ id: 'cited-by', label: 'Cités par' });
		if (sourcesCount > 0) out.push({ id: 'sources', label: 'Sources' });
		if (hasEnBref) out.push({ id: 'en-bref', label: 'En Bref' });
		// Always show Concordance for paragraph contexts; the tab body handles empty state.
		out.push({ id: 'concordance', label: 'Concordance' });
		if (compendiumCiters.length > 0) out.push({ id: 'compendium', label: 'Compendium' });
		return out;
	});

	// If the active tab is no longer visible, snap to the first visible one.
	$effect(() => {
		if (!$studyPanel.open) return;
		if (visibleTabs.length === 0) return;
		const active = $studyPanel.activeTab;
		if (!active || !visibleTabs.some((t) => t.id === active)) {
			studyPanel.update((s) => ({ ...s, activeTab: visibleTabs[0]!.id }));
		}
	});

	$effect(() => {
		if (!$studyPanel.open) return;
		const onKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closePanel();
		};
		document.addEventListener('keydown', onKeydown);
		return () => document.removeEventListener('keydown', onKeydown);
	});

	// Mobile sheet only: lock body scroll, focus the close button on open,
	// trap Tab inside the sheet, and restore focus to whatever element opened
	// it. Desktop sticky-rail keeps its current "in flow" focus behaviour.
	let sheetEl: HTMLElement | undefined = $state();
	let lastTrigger: HTMLElement | null = null;
	$effect(() => {
		if (!$studyPanel.open) return;
		if (typeof document === 'undefined') return;

		const isMobile = window.matchMedia('(max-width: 1023.98px)').matches;
		if (!isMobile) return;

		lastTrigger = document.activeElement as HTMLElement | null;
		const html = document.documentElement;
		const prevOverflow = html.style.overflow;
		html.style.overflow = 'hidden';

		queueMicrotask(() => {
			const closeBtn = sheetEl?.querySelector<HTMLElement>('button[aria-label="Fermer"]');
			closeBtn?.focus();
		});

		const onTabTrap = (e: KeyboardEvent) => {
			if (e.key !== 'Tab' || !sheetEl) return;
			const focusables = Array.from(
				sheetEl.querySelectorAll<HTMLElement>(
					'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
				)
			);
			if (focusables.length === 0) return;
			const first = focusables[0]!;
			const last = focusables[focusables.length - 1]!;
			const active = document.activeElement;
			if (e.shiftKey && active === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && active === last) {
				e.preventDefault();
				first.focus();
			}
		};
		document.addEventListener('keydown', onTabTrap);

		return () => {
			html.style.overflow = prevOverflow;
			document.removeEventListener('keydown', onTabTrap);
			lastTrigger?.focus?.();
			lastTrigger = null;
		};
	});
</script>

{#if $studyPanel.open}
	<!-- Mobile: bottom-sheet overlay covering most of the screen. Hidden on
	     lg+ where the resizable rail below takes over. -->
	<div
		bind:this={sheetEl}
		class="lg:hidden fixed inset-x-0 bottom-0 z-[var(--z-modal)] bg-panel border-t border-border flex flex-col"
		style="top: var(--topbar-height, 58px); max-height: calc(100dvh - var(--topbar-height, 58px));"
		role="dialog"
		aria-modal="true"
		aria-label="Panneau d'étude"
		transition:fly={{ y: 30, duration: 200 }}
	>
		<header class="flex items-center justify-between px-3 py-2 border-b border-border font-ui">
			<div class="min-w-0">
				{#if $studyPanel.context?.kind === 'verse'}
					{@const ctxM = $studyPanel.context}
					<span class="text-accent font-semibold tabular-nums">
						{BOOKS.find((b) => b.usfx === ctxM.verseUsfx)?.frenchName ?? ''}
						{ctxM.verseChapter},
						{ctxM.verseVerse}
					</span>
				{:else if $studyPanel.context?.kind === 'paragraph'}
					{@const ctxM = $studyPanel.context}
					<a
						href="/cec/{ctxM.paragraph}"
						class="text-accent font-semibold hover:underline tabular-nums"
					>
						CEC {ctxM.paragraph}
					</a>
				{/if}
			</div>
			<button
				type="button"
				class="w-8 h-8 rounded hover:bg-accent/10 text-muted hover:text-accent"
				aria-label="Fermer"
				onclick={closePanel}
			>
				✕
			</button>
		</header>
		{#if visibleTabs.length === 0}
			<div class="flex-1 flex items-center justify-center p-6 text-sm text-muted italic">
				Aucune note d'étude pour ce paragraphe.
			</div>
		{:else}
			<TabStrip
				tabs={visibleTabs}
				active={$studyPanel.activeTab}
				onSelect={(id) => studyPanel.update((s) => ({ ...s, activeTab: id }))}
			/>
			<div class="flex-1 overflow-y-auto p-4 styled-scroll">
				{#if $studyPanel.activeTab === 'bible'}
					<TabBibleRefs />
				{:else if $studyPanel.activeTab === 'cross-refs'}
					<TabCrossRefs />
				{:else if $studyPanel.activeTab === 'cited-by'}
					<TabCitedBy />
				{:else if $studyPanel.activeTab === 'en-bref'}
					<TabEnBref />
				{:else if $studyPanel.activeTab === 'sources'}
					<TabSources />
				{:else if $studyPanel.activeTab === 'concordance'}
					<TabConcordance />
				{:else if $studyPanel.activeTab === 'bible-verse'}
					<TabBibleVerse />
				{:else if $studyPanel.activeTab === 'compendium'}
					<TabCompendium />
				{/if}
			</div>
		{/if}
	</div>

	<!-- Desktop: sticky right rail with resize handle. -->
	<div
		class="hidden lg:flex sticky top-[80px] h-[calc(100vh-80px)] flex-none z-20"
		transition:fly={{ x: 20, duration: 180 }}
	>
		<PanelShell onClose={closePanel}>
			{#snippet title()}
				{@const ctx = $studyPanel.context}
				{#if ctx?.kind === 'verse'}
					<span class="text-accent font-semibold tabular-nums">
						{BOOKS.find((b) => b.usfx === ctx.verseUsfx)?.frenchName ?? ''}
						{ctx.verseChapter},
						{ctx.verseVerse}
					</span>
				{:else if ctx?.kind === 'paragraph'}
					<a
						href="/cec/{ctx.paragraph}"
						class="text-accent font-semibold hover:underline tabular-nums"
					>
						CEC {ctx.paragraph}
					</a>
				{/if}
			{/snippet}

			{#if visibleTabs.length === 0}
				<div class="flex-1 flex items-center justify-center p-6 text-sm text-muted italic">
					Aucune note d'étude pour ce paragraphe.
				</div>
			{:else}
				<TabStrip
					tabs={visibleTabs}
					active={$studyPanel.activeTab}
					onSelect={(id) => studyPanel.update((s) => ({ ...s, activeTab: id }))}
				/>
				<div class="flex-1 overflow-y-auto p-4 styled-scroll">
					{#if $studyPanel.activeTab === 'bible'}
						<TabBibleRefs />
					{:else if $studyPanel.activeTab === 'cross-refs'}
						<TabCrossRefs />
					{:else if $studyPanel.activeTab === 'cited-by'}
						<TabCitedBy />
					{:else if $studyPanel.activeTab === 'en-bref'}
						<TabEnBref />
					{:else if $studyPanel.activeTab === 'sources'}
						<TabSources />
					{:else if $studyPanel.activeTab === 'concordance'}
						<TabConcordance />
					{:else if $studyPanel.activeTab === 'bible-verse'}
						<TabBibleVerse />
					{:else if $studyPanel.activeTab === 'compendium'}
						<TabCompendium />
					{/if}
				</div>
			{/if}
		</PanelShell>
	</div>
{/if}
