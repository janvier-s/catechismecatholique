<script lang="ts">
	import { studyPanel, closePanel, type PanelTab } from '$lib/stores/studyPanel';
	import { fly } from 'svelte/transition';
	import TabBibleRefs from './TabBibleRefs.svelte';
	import TabCrossRefs from './TabCrossRefs.svelte';
	import TabCitedBy from './TabCitedBy.svelte';
	import TabEnBref from './TabEnBref.svelte';

	const TABS: { id: PanelTab; label: string }[] = [
		{ id: 'bible', label: 'Bible' },
		{ id: 'cross-refs', label: 'Renvois' },
		{ id: 'cited-by', label: 'Cités par' },
		{ id: 'sources', label: 'Sources' },
		{ id: 'en-bref', label: 'En Bref' }
	];

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
		class="fixed inset-0 z-40 bg-black/30"
		onclick={closePanel}
		role="presentation"
	></div>
	<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
	<aside
		class="fixed top-0 right-0 h-full w-[420px] max-w-[92vw] bg-panel border-l border-border shadow-xl z-50 flex flex-col"
		role="dialog"
		aria-modal="false"
		aria-label="Panneau d'étude"
		transition:fly={{ x: 420, duration: 200 }}
	>
		<header class="flex items-center justify-between p-3 border-b border-border font-ui">
			<div class="text-sm text-muted">
				{#if $studyPanel.context}
					§ {$studyPanel.context.paragraph}
				{/if}
			</div>
			<button
				type="button"
				class="w-8 h-8 rounded hover:bg-accent/10"
				aria-label="Fermer"
				onclick={closePanel}
			>
				✕
			</button>
		</header>
		<div class="flex border-b border-border font-ui text-xs">
			{#each TABS as tab (tab.id)}
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
				<p class="text-muted italic text-sm">Sources — à venir dans G4</p>
			{:else}
				<p class="text-muted italic text-sm">Sélectionnez un onglet.</p>
			{/if}
		</div>
	</aside>
{/if}
