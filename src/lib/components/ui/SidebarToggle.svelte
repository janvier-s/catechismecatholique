<script lang="ts">
	import { sidebarOpen } from '$lib/stores/sidebar';
	import { afterNavigate } from '$app/navigation';

	// Same scroll-direction hide/reveal as SidebarMobileToggle, with an
	// anchor-based comparison so momentum-scroll settle jitter doesn't
	// flip `hidden` back and forth.
	let hidden = $state(false);
	let anchorY = 0;

	afterNavigate(() => {
		hidden = false;
		anchorY = 0;
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		anchorY = window.scrollY;
		const onScroll = () => {
			const y = window.scrollY;
			const delta = y - anchorY;
			if (y < 40) {
				hidden = false;
				anchorY = y;
			} else if (delta > 24) {
				hidden = true;
				anchorY = y;
			} else if (delta < -24) {
				hidden = false;
				anchorY = y;
			}
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

{#if !$sidebarOpen}
	<button
		type="button"
		onclick={() => sidebarOpen.set(true)}
		class="toggle hidden lg:flex fixed top-[62px] left-3 z-[var(--z-topbar)] h-9 px-3 rounded-md border border-border bg-panel hover:bg-accent hover:border-accent items-center gap-2 text-muted hover:text-white shadow-sm font-ui text-xs font-semibold tracking-wide uppercase"
		class:toggle-hidden={hidden}
		aria-label="Ouvrir le sommaire"
		aria-hidden={hidden ? 'true' : undefined}
		tabindex={hidden ? -1 : undefined}
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

<style>
	.toggle {
		transition:
			transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 200ms ease;
	}
	.toggle-hidden {
		transform: translateY(-150%);
		opacity: 0;
		pointer-events: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.toggle {
			transition: opacity 200ms ease;
		}
		.toggle-hidden {
			transform: none;
		}
	}
</style>
