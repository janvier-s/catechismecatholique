<script lang="ts">
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import { fly } from 'svelte/transition';
	import { studyPanel, openPanel, closePanel, type PanelTab } from '$lib/stores/studyPanel';
	import {
		loadParagraph,
		loadCitedBy,
		loadParagraphContexts,
		loadChapter
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
	import { BOOKS } from '$lib/utils/bibleBookSlug';

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
		{ id: 'concordance', label: 'Concordance' }
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
		if (ctx.kind === 'verse') {
			paragraph = null;
			citedByList = [];
			hasEnBref = false;
			return;
		}
		const paragraphNum = ctx.paragraph;
		(async () => {
			const [p, citedBy, ctxs] = await Promise.all([
				loadParagraph(paragraphNum),
				loadCitedBy(),
				loadParagraphContexts()
			]);
			paragraph = p;
			citedByList = citedBy[paragraphNum] ?? [];

			// hasEnBref: the paragraph's chapter has at least one en_bref block
			const pc = ctxs[paragraphNum];
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
						href="/ccc/{ctx.paragraph}"
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
					{/if}
				</div>
			{/if}
		</PanelShell>
	</div>
{/if}
