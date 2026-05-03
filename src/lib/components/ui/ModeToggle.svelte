<script lang="ts">
	import ReadingPrefs from './ReadingPrefs.svelte';

	let open = $state(false);

	function onDocClick(e: MouseEvent) {
		if (!(e.target instanceof Element)) return;
		if (!e.target.closest('[data-prefs-menu]')) open = false;
	}

	$effect(() => {
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	});
</script>

<div class="relative" data-prefs-menu>
	<button
		type="button"
		class="ml-2 w-9 h-9 rounded-md bg-accent/10 hover:bg-accent/20 flex items-center justify-center text-foreground hover:text-accent"
		onclick={() => (open = !open)}
		aria-label="Options de lecture"
		aria-haspopup="dialog"
		aria-expanded={open}
	>
		<svg
			width="16"
			height="14"
			viewBox="0 0 16 14"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			aria-hidden="true"
		>
			<line x1="1" y1="2" x2="15" y2="2" />
			<line x1="1" y1="7" x2="15" y2="7" />
			<line x1="1" y1="12" x2="15" y2="12" />
			<circle cx="5" cy="2" r="2" fill="currentColor" stroke="none" />
			<circle cx="11" cy="7" r="2" fill="currentColor" stroke="none" />
			<circle cx="7" cy="12" r="2" fill="currentColor" stroke="none" />
		</svg>
	</button>

	{#if open}
		<div
			role="dialog"
			aria-label="Options de lecture"
			class="absolute right-0 mt-2 w-80 rounded-md border border-border bg-panel shadow-lg z-40 px-4 pt-1 pb-5 max-h-[calc(100vh-100px)] overflow-y-auto"
		>
			<ReadingPrefs />
		</div>
	{/if}
</div>
