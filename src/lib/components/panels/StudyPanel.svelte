<script lang="ts">
	import { page } from '$app/state';
	import { studyPanel, openPanel, closePanel, type PanelTab } from '$lib/stores/studyPanel';
	import { loadParagraph, loadCitedBy, loadParagraphContexts, loadChapter } from '$lib/data/loaders';
	import type { Paragraph } from '$lib/data/types';
	import TabBibleRefs from './TabBibleRefs.svelte';
	import TabCrossRefs from './TabCrossRefs.svelte';
	import TabCitedBy from './TabCitedBy.svelte';
	import TabEnBref from './TabEnBref.svelte';
	import TabSources from './TabSources.svelte';

	// When the panel is open and the user navigates to a paragraph route
	// (/ccc/{n} or /ccc/{n}-{m}), update the panel's context to follow.
	// Clicking a renvois entry, a "cited by" link, etc. now refreshes the panel.
	$effect(() => {
		if (!$studyPanel.open) return;
		const m = page.url.pathname.match(/^\/ccc\/(\d+)(?:-\d+)?$/);
		if (!m) return;
		const n = parseInt(m[1]!, 10);
		if (!Number.isFinite(n)) return;
		if ($studyPanel.context?.paragraph === n) return;
		openPanel({ paragraph: n }, $studyPanel.activeTab ?? 'cross-refs');
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

{#if $studyPanel.open}
	<aside
		class="hidden lg:flex sticky top-[80px] h-[calc(100vh-80px)] w-[420px] flex-none flex-col bg-panel border-l border-border z-20"
		aria-label="Panneau d'étude"
	>
		<header class="flex items-center justify-between px-3 py-2 border-b border-border font-ui">
			<div class="text-sm">
				{#if $studyPanel.context}
					<span class="text-muted">Étude :</span>
					<a
						href="/ccc/{$studyPanel.context.paragraph}"
						class="text-accent font-semibold ml-1 hover:underline"
					>
						§ {$studyPanel.context.paragraph}
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
			<div class="flex-1 overflow-y-auto p-4">
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
				{/if}
			</div>
		{/if}
	</aside>
{/if}
