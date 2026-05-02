<script lang="ts">
	import { theme, THEMES, THEME_LABELS, type Theme } from '$lib/stores/prefs';

	let open = $state(false);

	function pick(t: Theme) {
		theme.set(t);
		open = false;
	}

	function onDocClick(e: MouseEvent) {
		if (!(e.target instanceof Element)) return;
		if (!e.target.closest('[data-theme-menu]')) open = false;
	}

	$effect(() => {
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	});
</script>

<div class="relative" data-theme-menu>
	<button
		type="button"
		class="ml-2 w-9 h-9 rounded-md bg-accent/10 hover:bg-accent/20 flex items-center justify-center text-base"
		onclick={() => (open = !open)}
		aria-label="Choisir le thème (actuel : {THEME_LABELS[$theme]})"
		aria-haspopup="menu"
		aria-expanded={open}
	>
		{#if $theme === 'dark' || $theme === 'oled'}☀{:else if $theme === 'sepia'}❦{:else}☾{/if}
	</button>

	{#if open}
		<div
			role="menu"
			class="absolute right-0 mt-2 w-36 rounded-md border border-border bg-panel shadow-lg z-40 py-1 font-ui text-sm"
		>
			{#each THEMES as t (t)}
				<button
					type="button"
					role="menuitemradio"
					aria-checked={$theme === t}
					class="w-full text-left px-3 py-2 hover:bg-accent/10 flex items-center justify-between"
					onclick={() => pick(t)}
				>
					<span>{THEME_LABELS[t]}</span>
					{#if $theme === t}<span class="text-accent">●</span>{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
