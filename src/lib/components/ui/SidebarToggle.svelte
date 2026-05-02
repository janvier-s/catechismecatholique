<script lang="ts">
	import { sidebarOpen } from '$lib/stores/sidebar';
</script>

{#if !$sidebarOpen}
	<button
		type="button"
		onclick={() => sidebarOpen.set(true)}
		class="hidden lg:flex fixed top-[92px] left-3 z-30 w-9 h-9 rounded-md border border-border bg-panel hover:bg-accent/10 hover:border-accent items-center justify-center text-muted hover:text-accent shadow-sm"
		aria-label="Ouvrir la barre latérale"
		title="Sommaire"
	>
		☰
	</button>
{/if}
