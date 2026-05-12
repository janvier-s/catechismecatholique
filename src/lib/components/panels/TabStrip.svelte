<script lang="ts">
	import type { PanelTab } from '$lib/stores/studyPanel';

	type Tab = { id: PanelTab; label: string; iconHtml?: string };
	let {
		tabs,
		active,
		onSelect
	}: { tabs: Tab[]; active: PanelTab | null; onSelect: (id: PanelTab) => void } = $props();

	let scrollEl: HTMLDivElement | undefined = $state();
	let canLeft = $state(false);
	let canRight = $state(false);

	function update() {
		if (!scrollEl) return;
		const { scrollLeft, scrollWidth, clientWidth } = scrollEl;
		const hasOverflow = scrollWidth > clientWidth + 1;
		canLeft = hasOverflow && scrollLeft > 1;
		canRight = hasOverflow && scrollLeft + clientWidth < scrollWidth - 1;
	}

	function nudge(dir: -1 | 1) {
		if (!scrollEl) return;
		const delta = dir * Math.round(scrollEl.clientWidth * 0.6);
		// `scrollBy({ behavior: 'smooth' })` is flaky on iOS Safari — sometimes
		// no-ops when triggered from a click handler. Assign scrollLeft
		// directly as a hard fallback, then schedule a smooth re-snap.
		const target = scrollEl.scrollLeft + delta;
		scrollEl.scrollLeft = target;
		// Try the smooth behaviour too in case the browser supports it; the
		// hard assignment above already moved us if smooth bailed.
		try {
			scrollEl.scrollTo({ left: target, behavior: 'smooth' });
		} catch {
			/* ignore: older Safari throws on options bag */
		}
		// In case Safari ignored the scroll, refresh the chevron state on
		// the next frame so the buttons disappear when we've reached the end.
		requestAnimationFrame(update);
	}

	$effect(() => {
		if (!scrollEl) return;
		update();
		const el = scrollEl;
		el.addEventListener('scroll', update, { passive: true });
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => {
			el.removeEventListener('scroll', update);
			ro.disconnect();
		};
	});

	// When the active tab changes, scroll it into view if it's clipped.
	$effect(() => {
		void active;
		void tabs;
		queueMicrotask(() => {
			if (!scrollEl) return;
			const idx = tabs.findIndex((t) => t.id === active);
			if (idx < 0) return;
			const btn = scrollEl.children[idx] as HTMLElement | undefined;
			btn?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
		});
	});
</script>

<div class="strip">
	<button
		type="button"
		class="chev chev-l"
		class:chev-shown={canLeft}
		aria-label="Onglets précédents"
		tabindex={canLeft ? 0 : -1}
		onclick={() => nudge(-1)}
	>
		‹
	</button>
	<div bind:this={scrollEl} class="track">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				class="tab"
				class:tab-active={active === tab.id}
				onclick={() => onSelect(tab.id)}
			>
				<span>{tab.label}</span>
				{#if tab.iconHtml}
					<span class="tab-icon" aria-hidden="true">{@html tab.iconHtml}</span>
				{/if}
			</button>
		{/each}
	</div>
	<button
		type="button"
		class="chev chev-r"
		class:chev-shown={canRight}
		aria-label="Onglets suivants"
		tabindex={canRight ? 0 : -1}
		onclick={() => nudge(1)}
	>
		›
	</button>
</div>

<style>
	.strip {
		position: relative;
		display: flex;
		align-items: stretch;
		border-bottom: 1px solid var(--color-border);
		font-family: var(--font-ui);
		font-size: 12px;
	}
	.track {
		flex: 1;
		display: flex;
		overflow-x: auto;
		scroll-behavior: smooth;
		scrollbar-width: none;
		touch-action: pan-x;
	}
	.track::-webkit-scrollbar {
		display: none;
	}
	.tab {
		flex: 1 0 auto;
		padding: 8px 12px;
		white-space: nowrap;
		color: inherit;
		background: transparent;
		border: 0;
		cursor: pointer;
		transition: background-color 120ms ease;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
	}
	.tab:hover {
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
	}
	.tab-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.tab-icon :global(svg) {
		width: 14px;
		height: 14px;
	}
	.tab-active {
		background: var(--color-accent);
		color: #fff;
	}
	.tab-active:hover {
		background: var(--color-accent);
	}

	/* Chevrons sit on top of the track edges, full tab height, with a solid
	   panel-colour background. They're hidden (display:none) until the track
	   actually has overflow in that direction, so they don't sit on top of
	   the rightmost tab when there's nothing to scroll to. */
	.chev {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 28px;
		display: none;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		line-height: 1;
		color: var(--color-fg);
		background: var(--color-panel);
		border: 0;
		cursor: pointer;
		z-index: 2;
		/* A 1px border on the inner edge keeps the chev visually distinct
		   from the tabs scrolling underneath. */
	}
	.chev-l {
		left: 0;
		border-right: 1px solid var(--color-border);
	}
	.chev-r {
		right: 0;
		border-left: 1px solid var(--color-border);
	}
	.chev-shown {
		display: flex;
	}
	.chev:hover {
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 8%, var(--color-panel));
	}
</style>
