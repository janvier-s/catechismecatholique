<script lang="ts">
	import type { PanelTab } from '$lib/stores/studyPanel';

	type Tab = { id: PanelTab; label: string; iconHtml?: string; hasSubTabs?: boolean };
	let {
		tabs,
		active,
		onSelect
	}: { tabs: Tab[]; active: PanelTab | null; onSelect: (id: PanelTab) => void } = $props();

	let scrollEl: HTMLDivElement | undefined = $state();
	let canLeft = $state(false);
	let canRight = $state(false);
	let thumbRatio = $state(1);
	let scrollRatio = $state(0);

	function update() {
		if (!scrollEl) return;
		const { scrollLeft, scrollWidth, clientWidth } = scrollEl;
		const hasOverflow = scrollWidth > clientWidth + 1;
		canLeft = hasOverflow && scrollLeft > 1;
		canRight = hasOverflow && scrollLeft + clientWidth < scrollWidth - 1;
		thumbRatio = scrollWidth > 0 ? Math.min(1, clientWidth / scrollWidth) : 1;
		scrollRatio = scrollWidth > clientWidth ? scrollLeft / (scrollWidth - clientWidth) : 0;
	}

	function nudge(dir: -1 | 1) {
		if (!scrollEl) return;
		const delta = dir * Math.round(scrollEl.clientWidth * 0.6);
		const target = scrollEl.scrollLeft + delta;
		scrollEl.scrollLeft = target;
		try {
			scrollEl.scrollTo({ left: target, behavior: 'smooth' });
		} catch {
			/* ignore: older Safari throws on options bag */
		}
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

	// When the active tab or tab list changes, scroll the active tab into view
	// and immediately re-check chevron/scrollbar state (scrollWidth may have
	// changed when tabs were added or removed without the ResizeObserver firing).
	$effect(() => {
		void active;
		void tabs;
		queueMicrotask(() => {
			if (!scrollEl) return;
			const idx = tabs.findIndex((t) => t.id === active);
			if (idx >= 0) {
				const btn = scrollEl.children[idx] as HTMLElement | undefined;
				// Instant (no smooth) to avoid many scroll events during animation
				// that would cause repeated state updates and visual flicker.
				btn?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
			}
			update();
		});
	});
</script>

<div class="tab-wrap">
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
					<span class="tab-label">{tab.label}</span>
					{#if tab.iconHtml}
						<span class="tab-icon" aria-hidden="true">{@html tab.iconHtml}</span>
					{/if}
					{#if tab.hasSubTabs}
						<svg
							class="tab-subchev"
							aria-hidden="true"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M8.25 15 12 18.75 15.75 15" />
						</svg>
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

	<!-- Scroll position indicator. Always in DOM (no {#if}) to avoid mount/
	     unmount layout recalculations that cause tab-button flicker. Only
	     visible on hover when there is actually overflow content, and
	     positioned out of flow so it costs no vertical space when hidden. -->
	<div class="bar-zone" class:bar-has-overflow={thumbRatio < 1} aria-hidden="true">
		<div class="bar-track">
			<div class="bar-thumb" style="left: calc({scrollRatio} * 39px)"></div>
		</div>
	</div>
</div>

<style>
	.tab-wrap {
		display: flex;
		flex-direction: column;
		font-family: var(--font-ui);
		font-size: 12px;
		/* Anchor for the out-of-flow .bar-zone below. */
		position: relative;
	}

	.strip {
		position: relative;
		display: flex;
		align-items: stretch;
		border-bottom: 1px solid var(--color-border);
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
		position: relative;
		flex: 1 0 auto;
		padding: 8px 12px;
		white-space: nowrap;
		color: var(--color-fg);
		background: transparent;
		border: 0;
		cursor: pointer;
		transition:
			background-color 120ms ease,
			color 120ms ease;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
	}
	.tab:hover {
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
	}
	.tab-subchev {
		position: absolute;
		bottom: 1px;
		left: 50%;
		transform: translateX(-50%);
		width: 18px;
		height: 18px;
		opacity: 0.7;
		pointer-events: none;
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
	   panel-colour background. They use opacity rather than display:none so
	   any brief state change fades invisibly instead of flashing. */
	.chev {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		line-height: 1;
		color: var(--color-fg);
		background: var(--color-panel);
		border: 0;
		cursor: pointer;
		z-index: 2;
		opacity: 0;
		pointer-events: none;
		transition: opacity 120ms ease;
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
		opacity: 1;
		pointer-events: auto;
	}
	.chev:hover {
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 8%, var(--color-panel));
	}

	/* Narrow centered scroll indicator, just below the tab strip row. Only
	   shows on hover when there is overflow to scroll.

	   Out of flow (top: 100% of .tab-wrap, whose in-flow height is just the
	   strip) so it never reserves a band of its own: in flow it held a
	   permanent 14px gap between the tabs and the sub-tabs, even on panels
	   with nothing to scroll, where it was invisible the entire time. It stays
	   in the DOM regardless — see the note on the markup — so there's still no
	   mount/unmount layout churn. `flex-start` keeps the thumb tucked against
	   the strip's bottom border rather than floating mid-gap. */
	.bar-zone {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 1;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		height: 12px;
		pointer-events: none;
		opacity: 0;
		transition: opacity 200ms ease;
	}
	.tab-wrap:hover .bar-has-overflow {
		opacity: 1;
	}

	.bar-track {
		position: relative;
		width: 56px;
		height: 3px;
		background: color-mix(in srgb, var(--color-fg) 12%, transparent);
		border-radius: 2px;
		overflow: hidden;
	}

	.bar-thumb {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 17px;
		background: var(--color-accent);
		border-radius: 2px;
		opacity: 0.8;
	}
</style>
