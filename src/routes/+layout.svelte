<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import TopBar from '$lib/components/ui/TopBar.svelte';
	import Sidebar from '$lib/components/ui/Sidebar.svelte';
	import StudyPanel from '$lib/components/panels/StudyPanel.svelte';

	let { children } = $props();

	const showSidebar = $derived(
		page.url.pathname.startsWith('/ccc') || page.url.pathname.startsWith('/bible')
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<TopBar />
<div class="flex">
	{#if showSidebar}
		<Sidebar />
	{/if}
	<div class="flex-1 min-w-0">
		{@render children()}
	</div>
	<StudyPanel />
</div>
