<script lang="ts">
	import type { Snippet } from 'svelte';
	import { panelWidth } from '$lib/stores/prefs';
	import { createPanelResize } from '$lib/utils/panelResize';

	let {
		title,
		children,
		onClose,
		ariaLabel = "Panneau d'étude"
	}: {
		title?: Snippet;
		children?: Snippet;
		onClose?: () => void;
		ariaLabel?: string;
	} = $props();

	let panelEl: HTMLElement | undefined = $state();
	let dragging = $state(false);
	const resize = createPanelResize(undefined, (d) => (dragging = d));

	$effect(() => {
		resize.bindPanel(panelEl ?? null);
	});

	// When not dragging, sync stored width → DOM. During drag, the resize util
	// writes panelEl.style.width directly so this effect must not interfere.
	$effect(() => {
		const w = $panelWidth;
		if (!panelEl || dragging) return;
		panelEl.style.width = w;
	});
</script>

<svelte:window onmousemove={resize.onMousemove} onmouseup={resize.onMouseup} />

<div class="panel-shell-wrap flex h-full" class:dragging>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		role="separator"
		aria-orientation="vertical"
		aria-label="Redimensionner le panneau"
		tabindex="0"
		class="panel-resize-zone shrink-0 cursor-col-resize self-stretch outline-none"
		onmousedown={resize.onDividerMousedown}
		ontouchstart={resize.onTouchStart}
		ontouchmove={resize.onTouchMove}
		ontouchend={resize.onTouchEnd}
		onkeydown={resize.onKeydown}
	>
		<div class="panel-resize-bar">
			<div class="panel-resize-grip" aria-hidden="true">
				<span></span>
				<span></span>
			</div>
		</div>
	</div>
	<aside
		bind:this={panelEl}
		class="flex-none flex flex-col bg-panel border-l border-border h-full"
		aria-label={ariaLabel}
	>
		<header class="flex items-center justify-between px-3 py-2 border-b border-border font-ui">
			<div class="min-w-0">
				{#if title}
					{@render title()}
				{/if}
			</div>
			{#if onClose}
				<button
					type="button"
					class="w-8 h-8 rounded hover:bg-accent/10 text-muted hover:text-accent"
					aria-label="Fermer"
					onclick={onClose}
				>
					✕
				</button>
			{/if}
		</header>
		<div class="flex-1 min-h-0 flex flex-col">
			{#if children}
				{@render children()}
			{/if}
		</div>
	</aside>
</div>

<style>
	/* Wide invisible hit zone with a 1px visible bar flush against the panel */
	.panel-resize-zone {
		width: 16px;
		position: relative;
		z-index: 2;
	}
	.panel-resize-bar {
		position: absolute;
		top: 0;
		bottom: 0;
		right: 0;
		width: 1px;
		background: var(--color-border);
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			width 150ms ease,
			background-color 150ms ease;
	}
	.panel-resize-zone:hover .panel-resize-bar,
	.panel-resize-zone:focus-visible .panel-resize-bar {
		width: 5px;
		background: color-mix(in srgb, var(--color-muted) 30%, transparent);
	}
	.panel-resize-zone:active .panel-resize-bar,
	.dragging .panel-resize-bar {
		width: 5px;
		background: color-mix(in srgb, var(--color-accent) 25%, transparent);
	}
	.panel-resize-grip {
		display: flex;
		gap: 3px;
		opacity: 0;
		transition: opacity 150ms ease;
	}
	.panel-resize-grip span {
		display: block;
		width: 1.5px;
		height: 24px;
		border-radius: 1px;
		background: var(--color-muted);
	}
	.panel-resize-zone:hover .panel-resize-grip,
	.panel-resize-zone:focus-visible .panel-resize-grip {
		opacity: 1;
	}
	.panel-resize-zone:active .panel-resize-grip span,
	.dragging .panel-resize-grip span {
		background: var(--color-accent);
	}
</style>
