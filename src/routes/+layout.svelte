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

	// Close the StudyPanel when its context becomes irrelevant: leaving the
	// /ccc reading surface, or entering a Bible concordance view (which has
	// its own resizable right pane and shouldn't render two panels at once).
	afterNavigate(({ from, to }) => {
		if (!from || !to) return;
		const fromPath = from.url.pathname;
		const toPath = to.url.pathname;

		const fromOnCcc = fromPath.startsWith('/ccc');
		const toOnCcc = toPath.startsWith('/ccc');
		const toOnConcordance = /\/bible\/[^/]+\/\d+\/concordance/.test(toPath);

		if ((fromOnCcc && !toOnCcc) || toOnConcordance) {
			if (get(studyPanel).open) closePanel();
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
