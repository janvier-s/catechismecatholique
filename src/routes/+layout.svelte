<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { get } from 'svelte/store';
	import TopBar from '$lib/components/ui/TopBar.svelte';
	import Sidebar from '$lib/components/ui/Sidebar.svelte';
	import SidebarToggle from '$lib/components/ui/SidebarToggle.svelte';
	import StudyPanel from '$lib/components/panels/StudyPanel.svelte';
	import { closePanel, studyPanel } from '$lib/stores/studyPanel';

	let { children } = $props();

	const showSidebar = $derived.by(() => {
		const p = page.url.pathname;
		// Sidebar is the catechism's structural TOC. Show only inside the
		// CCC reading surfaces; hide on the index, sommaire, bible, search,
		// about, and the bare home page.
		if (!p.startsWith('/ccc')) return false;
		if (p === '/ccc' || p === '/ccc/' || p.startsWith('/ccc/sommaire')) return false;
		return true;
	});

	// Close the StudyPanel when leaving the /ccc reading surface — it shouldn't
	// linger over /bible or other routes where its context is irrelevant.
	afterNavigate(({ from, to }) => {
		const fromOnCcc = from?.url.pathname.startsWith('/ccc') ?? false;
		const toOnCcc = to?.url.pathname.startsWith('/ccc') ?? false;
		if (fromOnCcc && !toOnCcc && get(studyPanel).open) {
			closePanel();
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<TopBar />
<div class="flex">
	{#if showSidebar}
		<Sidebar />
		<SidebarToggle />
	{/if}
	<div class="flex-1 min-w-0">
		{@render children()}
	</div>
	<StudyPanel />
</div>
