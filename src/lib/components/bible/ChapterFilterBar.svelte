<script lang="ts">
	let {
		studyMode,
		disabled = false,
		onchange
	}: {
		studyMode: boolean;
		disabled?: boolean;
		onchange: (next: boolean) => void;
	} = $props();
</script>

<div class="mode-pill" role="group" aria-label="Basculer les annotations du Catéchisme">
	<button
		type="button"
		class="pill-option"
		class:is-active={!studyMode}
		{disabled}
		onclick={() => onchange(false)}
	>
		<span class="pill-label">Lecture</span>
		<svg
			class="pill-icon"
			viewBox="0 0 16 16"
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
		>
			<path
				d="M2 3.5h4.5A1.5 1.5 0 0 1 8 5v8a1.2 1.2 0 0 0-1.2-1.2H2zM14 3.5H9.5A1.5 1.5 0 0 0 8 5v8a1.2 1.2 0 0 1 1.2-1.2H14z"
			/>
		</svg>
	</button>
	<button
		type="button"
		class="pill-option"
		class:is-active={studyMode}
		{disabled}
		onclick={() => onchange(true)}
	>
		<span class="pill-label">Étude</span>
		<svg
			class="pill-icon"
			viewBox="0 0 16 16"
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
		>
			<circle cx="7" cy="7" r="4.5" />
			<path d="M10.5 10.5 14 14" stroke-linecap="round" />
		</svg>
	</button>
</div>

<style>
	.mode-pill {
		display: inline-flex;
		border: 1px solid color-mix(in srgb, var(--color-fg) 18%, transparent);
		border-radius: 999px;
		padding: 2px;
		background: color-mix(in srgb, var(--color-fg) 4%, transparent);
	}
	.pill-option {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 0.25rem 0.9rem;
		border-radius: 999px;
		border: none;
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		transition:
			background 150ms ease,
			color 150ms ease;
	}
	.pill-option:hover:not(.is-active) {
		color: var(--color-fg);
	}
	.pill-option.is-active {
		background: color-mix(in srgb, var(--color-accent) 18%, transparent);
		color: var(--color-accent);
		font-weight: 600;
	}
	.pill-option:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
	.pill-option:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.pill-icon {
		display: none;
		width: 15px;
		height: 15px;
	}
	/* Below 640px the nav row has no space for two words beside the chapter
	   chevrons, so the labels collapse to icons. The label is visually hidden
	   rather than removed, so the accessible name survives at every width. */
	@media (max-width: 639px) {
		.pill-label {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
		.pill-icon {
			display: block;
		}
		.pill-option {
			padding: 0.25rem 0.6rem;
		}
	}
</style>
