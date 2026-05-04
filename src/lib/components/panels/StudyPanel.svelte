<script lang="ts">
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import { fly } from 'svelte/transition';
	import { studyPanel, openPanel, closePanel, type PanelTab } from '$lib/stores/studyPanel';
	import { panelWidth } from '$lib/stores/prefs';
	import { createPanelResize } from '$lib/utils/panelResize';
	import {
		loadParagraph,
		loadCitedBy,
		loadParagraphContexts,
		loadChapter
	} from '$lib/data/loaders';
	import type { Paragraph } from '$lib/data/types';
	import TabBibleRefs from './TabBibleRefs.svelte';
	import TabCrossRefs from './TabCrossRefs.svelte';
	import TabCitedBy from './TabCitedBy.svelte';
	import TabEnBref from './TabEnBref.svelte';
	import TabSources from './TabSources.svelte';
	import TabBibleVerse from './TabBibleVerse.svelte';
	import { BOOKS } from '$lib/utils/bibleBookSlug';

	let panelEl: HTMLElement | undefined = $state();
	let dragging = $state(false);
	const resize = createPanelResize(undefined, (d) => (dragging = d));

	$effect(() => {
		resize.bindPanel(panelEl ?? null);
	});

	// When not dragging, sync stored width → DOM. During drag, the resize util
	// writes panelEl.style.width directly so this effect must not interfere.
	$effect(() => {
		const w = $panelWidth;
		if (!panelEl || dragging) return;
		panelEl.style.width = w;
	});

	// When the panel is open and the user navigates to a paragraph route
	// (/ccc/{n} or /ccc/{n}-{m}), update the panel's context to follow.
	// Read the URL reactively, but pull store state with `get` so this effect
	// only re-runs on URL changes — otherwise updating the store inside this
	// effect would loop and clobber explicit context changes from elsewhere.
	$effect(() => {
		const path = page.url.pathname;
		const s = get(studyPanel);
		if (!s.open) return;
		const m = path.match(/^\/ccc\/(\d+)(?:-\d+)?$/);
		if (!m) return;
		const n = parseInt(m[1]!, 10);
		if (!Number.isFinite(n)) return;
		if (s.context?.paragraph === n) return;
		openPanel({ paragraph: n }, s.activeTab ?? 'cross-refs');
	});

	type TabDef = { id: PanelTab; label: string };
	const ALL_TABS: TabDef[] = [
		{ id: 'bible', label: 'Bible' },
		{ id: 'cross-refs', label: 'Renvois' },
		{ id: 'cited-by', label: 'Cités par' },
		{ id: 'sources', label: 'Sources' },
		{ id: 'en-bref', label: 'En Bref' }
	];

	let paragraph: Paragraph | null = $state(null);
	let citedByList: number[] = $state([]);
	let hasEnBref: boolean = $state(false);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx || !$studyPanel.open) {
			paragraph = null;
			citedByList = [];
			hasEnBref = false;
			return;
		}
		// Bible-verse mode has no paragraph context; TabBibleVerse loads its own data.
		if (ctx.verseUsfx) {
			paragraph = null;
			citedByList = [];
			hasEnBref = false;
			return;
		}
		(async () => {
			const [p, citedBy, ctxs] = await Promise.all([
				loadParagraph(ctx.paragraph),
				loadCitedBy(),
				loadParagraphContexts()
			]);
			paragraph = p;
			citedByList = citedBy[ctx.paragraph] ?? [];

			// hasEnBref: the paragraph's chapter has at least one en_bref block
			const pc = ctxs[ctx.paragraph];
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
		if (ctx?.verseUsfx) {
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
</script>

<svelte:window onmousemove={resize.onMousemove} onmouseup={resize.onMouseup} />

{#if $studyPanel.open}
	<div
		class="hidden lg:flex sticky top-[80px] h-[calc(100vh-80px)] flex-none z-20"
		class:dragging
		transition:fly={{ x: 20, duration: 180 }}
	>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label="Redimensionner le panneau"
			tabindex="0"
			class="panel-resize-zone shrink-0 cursor-col-resize self-stretch outline-none"
			onmousedown={resize.onDividerMousedown}
			ontouchstart={resize.onTouchStart}
			ontouchmove={resize.onTouchMove}
			ontouchend={resize.onTouchEnd}
			onkeydown={resize.onKeydown}
		>
			<div class="panel-resize-bar">
				<div class="panel-resize-grip" aria-hidden="true">
					<span></span>
					<span></span>
				</div>
			</div>
		</div>
		<aside
			bind:this={panelEl}
			class="flex-none flex flex-col bg-panel border-l border-border h-full"
			aria-label="Panneau d'étude"
		>
			<header class="flex items-center justify-between px-3 py-2 border-b border-border font-ui">
				<div>
					{#if $studyPanel.context?.verseUsfx}
						<span class="text-accent font-semibold tabular-nums">
							{BOOKS.find((b) => b.usfx === $studyPanel.context!.verseUsfx)?.frenchName ?? ''}
							{$studyPanel.context.verseChapter},
							{$studyPanel.context.verseVerse}
						</span>
					{:else if $studyPanel.context}
						<a
							href="/ccc/{$studyPanel.context.paragraph}"
							class="text-accent font-semibold hover:underline tabular-nums"
						>
							CEC {$studyPanel.context.paragraph}
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
				<div class="flex border-b border-border font-ui text-xs">
					{#each visibleTabs as tab (tab.id)}
						<button
							type="button"
							class="flex-1 py-2 hover:bg-accent/10"
							class:bg-accent={$studyPanel.activeTab === tab.id}
							class:!text-white={$studyPanel.activeTab === tab.id}
							onclick={() => studyPanel.update((s) => ({ ...s, activeTab: tab.id }))}
						>
							{tab.label}
						</button>
					{/each}
				</div>
				<div class="flex-1 overflow-y-auto p-4 panel-scroll">
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
					{:else if $studyPanel.activeTab === 'bible-verse'}
						<TabBibleVerse />
					{/if}
				</div>
			{/if}
		</aside>
	</div>
{/if}

<style>
	/* Wide invisible hit zone with a 1px visible bar flush against the panel */
	.panel-resize-zone {
		width: 16px;
		position: relative;
		z-index: 2;
	}
	.panel-resize-bar {
		position: absolute;
		top: 0;
		bottom: 0;
		right: 0;
		width: 1px;
		background: var(--color-border);
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			width 150ms ease,
			background-color 150ms ease;
	}
	.panel-resize-zone:hover .panel-resize-bar,
	.panel-resize-zone:focus-visible .panel-resize-bar {
		width: 5px;
		background: color-mix(in srgb, var(--color-muted) 30%, transparent);
	}
	.panel-resize-zone:active .panel-resize-bar,
	.dragging .panel-resize-bar {
		width: 5px;
		background: color-mix(in srgb, var(--color-accent) 25%, transparent);
	}
	.panel-resize-grip {
		display: flex;
		gap: 3px;
		opacity: 0;
		transition: opacity 150ms ease;
	}
	.panel-resize-grip span {
		display: block;
		width: 1.5px;
		height: 24px;
		border-radius: 1px;
		background: var(--color-muted);
	}
	.panel-resize-zone:hover .panel-resize-grip,
	.panel-resize-zone:focus-visible .panel-resize-grip {
		opacity: 1;
	}
	.panel-resize-zone:active .panel-resize-grip span,
	.dragging .panel-resize-grip span {
		background: var(--color-accent);
	}

	/* Scrollbar styled like the DR site (slimmer variant) */
	.panel-scroll {
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--color-accent) 50%, transparent)
			color-mix(in srgb, var(--color-border) 40%, transparent);
	}
	.panel-scroll::-webkit-scrollbar {
		width: 7px;
		-webkit-appearance: none;
	}
	.panel-scroll::-webkit-scrollbar-track {
		background: color-mix(in srgb, var(--color-border) 40%, transparent);
	}
	.panel-scroll::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--color-accent) 50%, transparent);
		border-radius: 4px;
		border: 1px solid transparent;
		background-clip: padding-box;
		min-height: 40px;
	}
	.panel-scroll::-webkit-scrollbar-thumb:hover {
		background: color-mix(in srgb, var(--color-accent) 70%, transparent);
		background-clip: padding-box;
	}
</style>
