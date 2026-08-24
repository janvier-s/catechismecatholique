<script lang="ts" generics="T">
	/**
	 * Compact segmented control matching the Lecture/Étude pill in
	 * ChapterFilterBar · used for the reading-options toggles, which
	 * previously rendered as a row of full-height bordered buttons.
	 */
	let {
		options,
		value,
		onchange,
		ariaLabel
	}: {
		options: { label: string; value: T }[];
		value: T;
		onchange: (v: T) => void;
		ariaLabel?: string;
	} = $props();
</script>

<div class="pill-group" role="group" aria-label={ariaLabel}>
	{#each options as opt (String(opt.value))}
		<button
			type="button"
			class="pill-group-option"
			class:is-active={opt.value === value}
			onclick={() => onchange(opt.value)}
		>
			{opt.label}
		</button>
	{/each}
</div>

<style>
	.pill-group {
		display: flex;
		border: 1px solid color-mix(in srgb, var(--color-fg) 18%, transparent);
		border-radius: 999px;
		padding: 2px;
		background: color-mix(in srgb, var(--color-fg) 4%, transparent);
	}
	.pill-group-option {
		flex: 1;
		min-width: 0;
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		padding: 0.3rem 0.5rem;
		border-radius: 999px;
		border: none;
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition:
			background 150ms ease,
			color 150ms ease;
	}
	.pill-group-option:hover:not(.is-active) {
		color: var(--color-fg);
	}
	.pill-group-option.is-active {
		background: color-mix(in srgb, var(--color-accent) 18%, transparent);
		color: var(--color-accent);
		font-weight: 600;
	}
	.pill-group-option:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
</style>
