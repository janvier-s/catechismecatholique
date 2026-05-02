<script lang="ts">
	import { sidebarOpen } from '$lib/stores/sidebar';
</script>

<button
	type="button"
	onclick={() => sidebarOpen.update((v) => !v)}
	class="w-9 h-9 rounded-md bg-accent/10 hover:bg-accent/20 flex items-center justify-center"
	aria-label="Basculer la barre latérale"
	aria-pressed={$sidebarOpen}
>
	{#if $sidebarOpen}◧{:else}☰{/if}
</button>
