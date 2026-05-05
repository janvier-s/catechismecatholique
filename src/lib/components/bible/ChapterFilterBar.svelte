<script lang="ts">
	let {
		dimNonCited = $bindable(false),
		citedCount
	}: { dimNonCited?: boolean; citedCount: number } = $props();
</script>

{#if citedCount > 0}
	<div class="mb-6 flex justify-center">
		<button
			type="button"
			class="filter-switch"
			class:is-active={dimNonCited}
			aria-pressed={dimNonCited}
			onclick={() => (dimNonCited = !dimNonCited)}
		>
			<span class="track" aria-hidden="true">
				<span class="dot"></span>
			</span>
			<span class="label">Atténuer les versets sans référence au Catéchisme</span>
		</button>
	</div>
{/if}

<style>
	.filter-switch {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.25rem 0.4rem;
		background: transparent;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		color: var(--color-muted);
		transition: color 120ms ease;
	}
	.filter-switch:hover {
		color: var(--color-accent);
	}
	.filter-switch:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.track {
		position: relative;
		display: inline-block;
		width: 26px;
		height: 14px;
		flex-shrink: 0;
		border: 1px solid color-mix(in srgb, var(--color-fg) 30%, transparent);
		border-radius: 999px;
		background: transparent;
		transition:
			background 160ms ease,
			border-color 160ms ease;
	}
	.dot {
		position: absolute;
		top: 50%;
		left: 2px;
		width: 8px;
		height: 8px;
		margin-top: -4px;
		background: color-mix(in srgb, var(--color-fg) 45%, transparent);
		border-radius: 50%;
		transition:
			left 180ms cubic-bezier(0.16, 1, 0.3, 1),
			background 160ms ease;
	}

	.filter-switch:hover .track {
		border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
	}

	.is-active .track {
		background: color-mix(in srgb, var(--color-accent) 18%, transparent);
		border-color: var(--color-accent);
	}
	.is-active .dot {
		left: calc(100% - 10px);
		background: var(--color-accent);
	}
	.is-active .label {
		color: var(--color-accent);
	}
</style>
