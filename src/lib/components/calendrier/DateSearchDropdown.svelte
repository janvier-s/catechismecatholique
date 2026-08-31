<!-- src/lib/components/calendrier/DateSearchDropdown.svelte -->
<script lang="ts">
	import type { CalendrierDateRow, CalendrierDatesIndexFile } from '$lib/data/types';
	import CalendrierPicker from './CalendrierPicker.svelte';

	let {
		datesIndex,
		selectedIso = null,
		align = 'right',
		open,
		onToggle,
		onClose,
		onPick
	}: {
		datesIndex: CalendrierDatesIndexFile;
		selectedIso?: string | null;
		/** Which edge the trigger sits near - the panel extends away from that
		 *  edge so it doesn't spill off the card. TodayCard's trigger sits at
		 *  the card's left edge; PickedDateCard's sits at the right. */
		align?: 'left' | 'right';
		/** Owned by the page, not this component - TodayCard and PickedDateCard
		 *  each mount their own instance of this dropdown, and one replaces the
		 *  other the moment a date is picked. An internal `open` state would
		 *  reset to closed on that swap, undoing the very pick that triggered
		 *  it. Lifting it to the page keeps it stable across that swap. */
		open: boolean;
		onToggle: () => void;
		onClose: () => void;
		onPick: (row: CalendrierDateRow) => void;
	} = $props();

	let triggerEl: HTMLButtonElement | undefined = $state();

	// Stays open across picks once opened, same reasoning as the panel it
	// replaces: browsing several dates in a row shouldn't mean re-opening it
	// each time. Closed via outside click, Escape, or the toggle itself.
	function onDocClick(e: MouseEvent) {
		if (!open) return;
		if (!(e.target instanceof Element)) return;
		if (e.target.closest('[data-date-search]')) return;
		onClose();
	}
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			onClose();
			triggerEl?.focus();
		}
	}
	$effect(() => {
		if (!open) return;
		document.addEventListener('click', onDocClick, true);
		document.addEventListener('keydown', onKeydown);
		return () => {
			document.removeEventListener('click', onDocClick, true);
			document.removeEventListener('keydown', onKeydown);
		};
	});
</script>

<div class="date-search" data-date-search>
	<button
		type="button"
		bind:this={triggerEl}
		class="date-search-trigger"
		class:is-open={open}
		onclick={onToggle}
		aria-expanded={open}
		aria-haspopup="true"
	>
		Chercher une date
	</button>
	{#if open}
		<div
			class="date-search-panel"
			class:align-left={align === 'left'}
			role="dialog"
			aria-label="Chercher une date"
		>
			<CalendrierPicker {datesIndex} {selectedIso} {onPick} />
		</div>
	{/if}
</div>

<style>
	.date-search {
		position: relative;
	}
	.date-search-trigger {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--color-muted);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.3rem 0.6rem;
		cursor: pointer;
		transition:
			color 150ms ease,
			border-color 150ms ease;
	}
	.date-search-trigger:hover,
	.date-search-trigger.is-open {
		color: var(--color-accent);
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}
	.date-search-panel {
		position: absolute;
		top: calc(100% + 0.4rem);
		right: 0;
		z-index: 20;
		width: 320px;
		max-width: calc(100vw - 2rem);
		padding: 0.85rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-panel);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
	}
	.date-search-panel.align-left {
		right: auto;
		left: 0;
	}

	@media (max-width: 640px) {
		.date-search-panel {
			right: auto;
			left: 0;
		}
	}
</style>
