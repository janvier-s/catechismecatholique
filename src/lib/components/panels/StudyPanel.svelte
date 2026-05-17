<script lang="ts">
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	// Custom mobile slide-up: translateY from 100% to 0 so the sheet always
	// slides from fully below the viewport, regardless of intrinsic height.
	function slideUp(_node: HTMLElement, { duration = 280 } = {}) {
		return {
			duration,
			easing: cubicOut,
			css: (t: number) => `transform: translateY(${(1 - t) * 100}%);`
		};
	}
	import { studyPanel, openPanel, closePanel, type PanelTab } from '$lib/stores/studyPanel';
	import {
		loadParagraph,
		loadCitedBy,
		loadParagraphContext,
		loadChapter,
		loadCompendiumCitedBy,
		loadParagraphThemes,
		loadConcordanceParagraphManifest,
		loadCdseCitedByCcc
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
	import TabCdseCiters from './TabCdseCiters.svelte';
	import TabIA from './TabIA.svelte';
	import TabTrentNotes from './TabTrentNotes.svelte';
	import TabDenzingerRefs from './TabDenzingerRefs.svelte';
	import TabThemes from './TabThemes.svelte';
	import TabStrip from './TabStrip.svelte';
	import { BOOKS } from '$lib/utils/bibleBookSlug';

	// When the panel is open and the user navigates to a paragraph route
	// (/cec/{n} or /cec/{n}-{m}), update the panel's context to follow.
	// Read the URL reactively, but pull store state with `get` so this effect
	// only re-runs on URL changes · otherwise updating the store inside this
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
	type Group = { id: string; label: string; children: TabDef[]; iconHtml?: string };

	const IA_ICON_HTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>`;

	let paragraph: Paragraph | null = $state(null);
	let citedByList: number[] = $state([]);
	let hasEnBref: boolean = $state(false);
	let compendiumCiters: number[] = $state([]);
	let cdseCiters: number[] = $state([]);
	let hasThemes: boolean = $state(false);
	let hasConcordance: boolean = $state(false);
	let dataReady: boolean = $state(false);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx || !$studyPanel.open) {
			paragraph = null;
			citedByList = [];
			hasEnBref = false;
			compendiumCiters = [];
			cdseCiters = [];
			hasThemes = false;
			hasConcordance = false;
			dataReady = false;
			return;
		}
		// Modes that have no CCC paragraph context.
		if (ctx.kind === 'verse' || ctx.kind === 'trent-paragraph' || ctx.kind === 'denzinger-entry') {
			paragraph = null;
			citedByList = [];
			hasEnBref = false;
			compendiumCiters = [];
			cdseCiters = [];
			hasThemes = false;
			hasConcordance = false;
			dataReady = true;
			return;
		}
		const paragraphNum = ctx.paragraph;
		dataReady = false;
		(async () => {
			const [p, citedBy, pc, compendiumCB, themesMap, concManifest, cdseCB] = await Promise.all([
				loadParagraph(paragraphNum),
				loadCitedBy(),
				loadParagraphContext(paragraphNum),
				loadCompendiumCitedBy(),
				loadParagraphThemes(),
				loadConcordanceParagraphManifest(),
				loadCdseCitedByCcc()
			]);
			paragraph = p;
			citedByList = citedBy[paragraphNum] ?? [];
			compendiumCiters = compendiumCB[paragraphNum] ?? [];
			cdseCiters = cdseCB[String(paragraphNum)] ?? [];
			hasThemes = (themesMap[String(paragraphNum)]?.length ?? 0) > 0;
			hasConcordance = concManifest.has(paragraphNum);

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
			dataReady = true;
		})();
	});

	// Visible tab groups depend on what data is available for the current
	// paragraph. Each group renders as a single entry in the tab strip; groups
	// with multiple children show a sub-toggle inside the panel body to switch
	// between them. Pairs that conceptually share a topic are grouped so the
	// strip stays compact even when many tabs have data.
	const visibleGroups: Group[] = $derived.by(() => {
		const ctx = $studyPanel.context;
		if (ctx?.kind === 'verse') {
			return [{ id: 'bible-verse', label: 'CEC', children: [{ id: 'bible-verse', label: 'CEC' }] }];
		}
		if (ctx?.kind === 'trent-paragraph') {
			if (ctx.footnotes.length > 0) {
				return [
					{ id: 'trent-notes', label: 'Notes', children: [{ id: 'trent-notes', label: 'Notes' }] }
				];
			}
			return [];
		}
		if (ctx?.kind === 'denzinger-entry') {
			return [
				{
					id: 'denzinger-cross-refs',
					label: 'Renvois',
					children: [{ id: 'denzinger-cross-refs', label: 'Renvois' }]
				},
				{
					id: 'denzinger-cited-by',
					label: 'Cités dans',
					children: [{ id: 'denzinger-cited-by', label: 'Cités dans' }]
				}
			];
		}
		if (ctx?.kind !== 'paragraph') return [];

		// While data is loading, render the full optimistic strip so the active
		// tab is never snapped away (En Bref, Compendium etc. stay selected across
		// paragraph navigation). Once `dataReady` flips, gates filter out empties.
		const optimistic = !dataReady;
		const hasBible = optimistic || (paragraph?.bible_refs.length ?? 0) > 0;
		const hasCrossRefs = optimistic || (paragraph?.cross_refs.length ?? 0) > 0;
		const sourcesCount = paragraph
			? paragraph.magisterial_refs.filter(
					(r) => r.type === 'magisterial' || r.type === 'patristic' || r.type === 'liturgical'
				).length
			: 0;
		const hasSources = optimistic || sourcesCount > 0;
		// Cités dans hidden if the citers are exactly the same set as cross_refs
		const citerSet = new Set(citedByList.map(String));
		const crossSet = new Set(paragraph?.cross_refs ?? []);
		const sameAsRenvois =
			citerSet.size === crossSet.size && [...citerSet].every((x) => crossSet.has(x));
		const hasCitedBy = optimistic || (citedByList.length > 0 && !sameAsRenvois);
		const hasCompendium = optimistic || compendiumCiters.length > 0;
		const hasCdseCiters = optimistic || cdseCiters.length > 0;
		const hasThemesG = optimistic || hasThemes;
		const hasConcordanceG = optimistic || hasConcordance;
		const hasEnBrefG = optimistic || hasEnBref;

		const groups: Group[] = [];

		// Renvois group: CCC-internal navigation (cross-refs, cited-by, themes)
		const ccc: TabDef[] = [];
		if (hasCrossRefs) ccc.push({ id: 'cross-refs', label: 'Renvois' });
		if (hasCitedBy) ccc.push({ id: 'cited-by', label: 'Cités dans' });
		if (hasThemesG) ccc.push({ id: 'themes', label: 'Thèmes' });
		if (ccc.length === 1) groups.push({ id: 'g-ccc', label: ccc[0]!.label, children: ccc });
		else if (ccc.length > 1) groups.push({ id: 'g-ccc', label: 'Renvois', children: ccc });

		// Sources group: magisterial/patristic/liturgical references + doctrine sociale
		const cit: TabDef[] = [];
		if (hasSources) cit.push({ id: 'sources', label: 'Sources' });
		if (hasCdseCiters) cit.push({ id: 'cdse-citers', label: 'Doctrine sociale' });
		if (cit.length === 1) groups.push({ id: 'g-citations', label: cit[0]!.label, children: cit });
		else if (cit.length > 1) groups.push({ id: 'g-citations', label: 'Sources', children: cit });

		// Compendium always gets its own top-level tab so it's directly discoverable.
		if (hasCompendium)
			groups.push({
				id: 'g-compendium',
				label: 'Compendium',
				children: [{ id: 'compendium', label: 'Compendium' }]
			});

		// Bible group: this paragraph's verse refs + concordance on related verses
		const bib: TabDef[] = [];
		if (hasBible) bib.push({ id: 'bible', label: 'Bible' });
		if (hasConcordanceG) bib.push({ id: 'concordance', label: 'Concordance' });
		if (bib.length === 1) groups.push({ id: 'g-bible', label: bib[0]!.label, children: bib });
		else if (bib.length > 1) groups.push({ id: 'g-bible', label: 'Bible', children: bib });

		if (hasEnBrefG)
			groups.push({
				id: 'g-en-bref',
				label: 'En Bref',
				children: [{ id: 'en-bref', label: 'En Bref' }]
			});
		groups.push({
			id: 'g-ia',
			label: 'IA',
			children: [{ id: 'ia', label: 'IA' }],
			iconHtml: IA_ICON_HTML
		});

		return groups;
	});

	// Per-group memory of which sub-tab was last selected, so that switching
	// away from a group and back returns to the same view.
	let lastSub: Record<string, PanelTab> = $state({});

	// Which group currently owns the active leaf tab?
	const activeGroup: Group | null = $derived.by(() => {
		const a = $studyPanel.activeTab;
		if (!a) return null;
		return visibleGroups.find((g) => g.children.some((c) => c.id === a)) ?? null;
	});

	const stripTabs: (TabDef & { iconHtml?: string })[] = $derived(
		visibleGroups.map((g) => ({ id: g.id as PanelTab, label: g.label, iconHtml: g.iconHtml }))
	);

	function selectGroup(gid: string): void {
		const g = visibleGroups.find((x) => x.id === gid);
		if (!g) return;
		const remembered = lastSub[gid];
		const target =
			remembered && g.children.some((c) => c.id === remembered) ? remembered : g.children[0]!.id;
		studyPanel.update((s) => ({ ...s, activeTab: target }));
	}

	function selectSubTab(t: PanelTab): void {
		const g = activeGroup;
		if (g) lastSub[g.id] = t;
		studyPanel.update((s) => ({ ...s, activeTab: t }));
	}

	// If the active tab is no longer visible, snap to the first visible one.
	$effect(() => {
		if (!$studyPanel.open) return;
		if (visibleGroups.length === 0) return;
		const active = $studyPanel.activeTab;
		const stillVisible =
			active && visibleGroups.some((g) => g.children.some((c) => c.id === active));
		if (!stillVisible) {
			studyPanel.update((s) => ({ ...s, activeTab: visibleGroups[0]!.children[0]!.id }));
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

		// Push a history entry so the device back gesture closes the sheet
		// instead of leaving the page. Pair with a popstate listener that
		// closes the panel when the entry is popped.
		let pushedHistory = false;
		try {
			history.pushState({ studyPanel: true }, '');
			pushedHistory = true;
		} catch {
			pushedHistory = false;
		}
		let closedByBack = false;
		const onPopState = () => {
			if (get(studyPanel).open) {
				closedByBack = true;
				closePanel();
			}
		};
		window.addEventListener('popstate', onPopState);

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
			window.removeEventListener('popstate', onPopState);
			// If close was triggered by the X button or backdrop (not back
			// gesture), pop the synthetic entry so the back stack stays clean.
			if (pushedHistory && !closedByBack && history.state?.studyPanel) {
				try {
					history.back();
				} catch {
					// ignore
				}
			}
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
		transition:slideUp={{ duration: 280 }}
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
				{:else if $studyPanel.context?.kind === 'trent-paragraph'}
					{@const ctxM = $studyPanel.context}
					<span class="text-accent font-semibold tabular-nums">
						§ {ctxM.paragraph}
					</span>
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
		{#if visibleGroups.length === 0}
			<div class="flex-1 flex items-center justify-center p-6 text-sm text-muted italic">
				Aucune note d'étude pour ce paragraphe.
			</div>
		{:else}
			<TabStrip
				tabs={stripTabs}
				active={(activeGroup?.id ?? null) as PanelTab | null}
				onSelect={(id) => selectGroup(id)}
			/>
			<div
				class="sub-toggle"
				class:sub-toggle--visible={activeGroup && activeGroup.children.length > 1}
				role="tablist"
				aria-label="Sous-onglets"
			>
				{#each activeGroup && activeGroup.children.length > 1 ? activeGroup.children : [] as c (c.id)}
					<button
						type="button"
						role="tab"
						aria-selected={$studyPanel.activeTab === c.id}
						class="sub-toggle-btn"
						class:sub-toggle-active={$studyPanel.activeTab === c.id}
						onclick={() => selectSubTab(c.id)}
					>
						{c.label}
					</button>
				{/each}
			</div>
			<div class="flex-1 overflow-y-auto p-4 styled-scroll">
				{#key $studyPanel.activeTab}
					<div in:fade={{ duration: 120 }}>
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
						{:else if $studyPanel.activeTab === 'themes' && $studyPanel.context?.kind === 'paragraph'}
							<TabThemes />
						{:else if $studyPanel.activeTab === 'concordance'}
							<TabConcordance />
						{:else if $studyPanel.activeTab === 'bible-verse'}
							<TabBibleVerse />
						{:else if $studyPanel.activeTab === 'compendium'}
							<TabCompendium />
						{:else if $studyPanel.activeTab === 'cdse-citers'}
							<TabCdseCiters />
						{:else if $studyPanel.activeTab === 'ia' && $studyPanel.context?.kind === 'paragraph'}
							<TabIA paragraphNumber={$studyPanel.context.paragraph} />
						{:else if $studyPanel.activeTab === 'trent-notes' && $studyPanel.context?.kind === 'trent-paragraph'}
							<TabTrentNotes />
						{:else if ($studyPanel.activeTab === 'denzinger-cross-refs' || $studyPanel.activeTab === 'denzinger-cited-by') && $studyPanel.context?.kind === 'denzinger-entry'}
							<TabDenzingerRefs
								n={$studyPanel.context.n}
								mode={$studyPanel.activeTab === 'denzinger-cross-refs' ? 'cross-refs' : 'cited-by'}
							/>
						{/if}
					</div>
				{/key}
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
				{:else if ctx?.kind === 'trent-paragraph'}
					<span class="text-accent font-semibold tabular-nums">
						§ {ctx.paragraph}
					</span>
				{/if}
			{/snippet}

			{#if visibleGroups.length === 0}
				<div class="flex-1 flex items-center justify-center p-6 text-sm text-muted italic">
					Aucune note d'étude pour ce paragraphe.
				</div>
			{:else}
				<TabStrip
					tabs={stripTabs}
					active={(activeGroup?.id ?? null) as PanelTab | null}
					onSelect={(id) => selectGroup(id)}
				/>
				<div
					class="sub-toggle"
					class:sub-toggle--visible={activeGroup && activeGroup.children.length > 1}
					role="tablist"
					aria-label="Sous-onglets"
				>
					{#each activeGroup && activeGroup.children.length > 1 ? activeGroup.children : [] as c (c.id)}
						<button
							type="button"
							role="tab"
							aria-selected={$studyPanel.activeTab === c.id}
							class="sub-toggle-btn"
							class:sub-toggle-active={$studyPanel.activeTab === c.id}
							onclick={() => selectSubTab(c.id)}
						>
							{c.label}
						</button>
					{/each}
				</div>
				<div class="flex-1 overflow-y-auto p-4 styled-scroll">
					{#key $studyPanel.activeTab}
						<div in:fade={{ duration: 120 }}>
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
							{:else if $studyPanel.activeTab === 'themes' && $studyPanel.context?.kind === 'paragraph'}
								<TabThemes />
							{:else if $studyPanel.activeTab === 'concordance'}
								<TabConcordance />
							{:else if $studyPanel.activeTab === 'bible-verse'}
								<TabBibleVerse />
							{:else if $studyPanel.activeTab === 'compendium'}
								<TabCompendium />
							{:else if $studyPanel.activeTab === 'cdse-citers'}
								<TabCdseCiters />
							{:else if $studyPanel.activeTab === 'ia' && $studyPanel.context?.kind === 'paragraph'}
								<TabIA paragraphNumber={$studyPanel.context.paragraph} />
							{:else if $studyPanel.activeTab === 'trent-notes' && $studyPanel.context?.kind === 'trent-paragraph'}
								<TabTrentNotes />
							{:else if ($studyPanel.activeTab === 'denzinger-cross-refs' || $studyPanel.activeTab === 'denzinger-cited-by') && $studyPanel.context?.kind === 'denzinger-entry'}
								<TabDenzingerRefs
									n={$studyPanel.context.n}
									mode={$studyPanel.activeTab === 'denzinger-cross-refs'
										? 'cross-refs'
										: 'cited-by'}
								/>
							{/if}
						</div>
					{/key}
				</div>
			{/if}
		</PanelShell>
	</div>
{/if}

<style>
	.sub-toggle {
		display: flex;
		gap: 4px;
		padding: 0 10px;
		border-bottom: 1px solid var(--color-border);
		background: color-mix(in srgb, var(--color-panel) 92%, var(--color-fg) 8%);
		font-family: var(--font-ui);
		font-size: 11px;
		overflow: hidden;
		max-height: 0;
		transition:
			max-height 150ms ease,
			padding 150ms ease;
	}
	.sub-toggle--visible {
		max-height: 60px;
		padding: 6px 10px;
	}
	.sub-toggle-btn {
		flex: 1 0 auto;
		padding: 4px 10px;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		transition:
			background-color 120ms ease,
			color 120ms ease,
			border-color 120ms ease;
	}
	.sub-toggle-btn:hover {
		color: var(--color-accent);
		border-color: var(--color-accent);
	}
	.sub-toggle-active {
		background: var(--color-accent);
		color: #fff;
		border-color: var(--color-accent);
	}
	.sub-toggle-active:hover {
		color: #fff;
	}
</style>
