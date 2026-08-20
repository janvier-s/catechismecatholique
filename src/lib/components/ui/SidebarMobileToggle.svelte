<script lang="ts">
	import { sidebarMobileOpen } from '$lib/stores/sidebar';
	import { afterNavigate } from '$app/navigation';

	// Auto-hides while scrolling down (out of the way of the text), reappears
	// on scroll up or near the top · always present but distracting otherwise,
	// since it has nowhere else to live on a phone-width reading column.
	let hidden = $state(false);
	// Anchor point from the last direction decision, not the previous raw
	// event's position. Momentum/inertia scrolling (and a smooth scrollTo, as
	// in the e2e test) fires many events as it settles, with small — and
	// sometimes slightly negative — deltas between consecutive frames even
	// while the overall gesture is still "scrolling down". Comparing every
	// event to its immediate predecessor made that settle jitter flip
	// `hidden` back and forth; comparing to the anchor instead means jitter
	// smaller than the threshold is simply ignored, and the anchor only
	// moves when a real decision is made.
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

{#if !$sidebarMobileOpen}
	<button
		type="button"
		onclick={() => sidebarMobileOpen.set(true)}
		class="toggle flex lg:hidden fixed top-[calc(var(--topbar-height,58px)+12px)] left-3 z-[var(--z-topbar)] h-9 px-3 rounded-md border border-border bg-panel hover:bg-accent/10 hover:border-accent items-center gap-2 text-muted hover:text-accent shadow-sm font-ui text-xs font-semibold tracking-wide uppercase"
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
