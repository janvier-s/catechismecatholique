<script lang="ts">
	import { sidebarMobileOpen } from '$lib/stores/sidebar';
</script>

{#if !$sidebarMobileOpen}
	<button
		type="button"
		onclick={() => sidebarMobileOpen.set(true)}
		class="flex lg:hidden fixed top-[calc(var(--topbar-height,58px)+12px)] left-3 z-[var(--z-topbar)] h-9 px-3 rounded-md border border-border bg-panel hover:bg-accent/10 hover:border-accent items-center gap-2 text-muted hover:text-accent shadow-sm font-ui text-xs font-semibold tracking-wide uppercase"
		aria-label="Ouvrir le sommaire"
	>
		<svg
			width="14"
			height="14"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			aria-hidden="true"
		>
			<line x1="2.5" y1="4" x2="13.5" y2="4" />
			<line x1="5" y1="8" x2="13.5" y2="8" />
			<line x1="7.5" y1="12" x2="13.5" y2="12" />
		</svg>
		<span>Sommaire</span>
	</button>
{/if}
