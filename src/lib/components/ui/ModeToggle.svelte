<script lang="ts">
	import { theme } from '$lib/stores/prefs';
	function toggle() {
		theme.update((t) => (t === 'light' ? 'dark' : 'light'));
	}
</script>

<button
	type="button"
	class="ml-2 w-9 h-9 rounded-md bg-accent/10 hover:bg-accent/20 flex items-center justify-center text-base"
	onclick={toggle}
	aria-label="Basculer le thème"
>
	{#if $theme === 'dark'}☀{:else}☾{/if}
</button>
