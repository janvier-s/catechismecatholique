<script lang="ts">
	/**
	 * On/off row for a single setting · the counterpart to PillGroup.
	 *
	 * The rule in the reading-options panel: PillGroup when the reader is
	 * choosing between named alternatives (Serré / Standard / Aéré), a switch
	 * when they are showing or hiding one thing. Rendering show/hide as a
	 * two-option pill dressed an on/off up as a choice, and six of them in a
	 * column read as wallpaper.
	 *
	 * Bound positively, always: `checked` means the thing is visible. Callers
	 * holding an inverted `hide*` flag negate at the call site, so the panel
	 * reads as what is on rather than what is suppressed.
	 */
	let {
		label,
		checked,
		onchange,
		title
	}: {
		label: string;
		checked: boolean;
		onchange: (v: boolean) => void;
		title?: string;
	} = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	class="switch-row"
	onclick={() => onchange(!checked)}
	{title}
>
	<span class="switch-label">{label}</span>
	<span class="switch-track" class:is-on={checked}>
		<span class="switch-thumb"></span>
	</span>
</button>

<style>
	.switch-row {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.3rem 0;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
	}
	.switch-label {
		font-size: 13px;
		color: var(--color-muted);
		line-height: 1.3;
	}
	.switch-row:hover .switch-label {
		color: var(--color-fg);
	}
	.switch-track {
		flex: none;
		position: relative;
		width: 32px;
		height: 18px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--color-fg) 18%, transparent);
		background: color-mix(in srgb, var(--color-fg) 8%, transparent);
		transition:
			background 150ms ease,
			border-color 150ms ease;
	}
	.switch-track.is-on {
		background: color-mix(in srgb, var(--color-accent) 45%, transparent);
		border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
	}
	.switch-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 12px;
		height: 12px;
		border-radius: 999px;
		background: var(--color-muted);
		transition:
			transform 150ms ease,
			background 150ms ease;
	}
	.switch-track.is-on .switch-thumb {
		transform: translateX(14px);
		background: var(--color-accent);
	}
	.switch-row:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
		border-radius: 4px;
	}
	@media (prefers-reduced-motion: reduce) {
		.switch-track,
		.switch-thumb {
			transition: none;
		}
	}
</style>
