<script lang="ts">
	import { getContext } from 'svelte';
	const ctx = getContext<{ open: () => void } | undefined>('part-panorama');
</script>

{#if ctx}
	<button
		type="button"
		class="trigger"
		aria-haspopup="dialog"
		aria-label="Voir le panorama de cette partie"
		onclick={() => ctx.open()}
	>
		<svg
			width="14"
			height="14"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<rect x="1.5" y="1.5" width="6" height="6" rx="0.5" />
			<rect x="8.5" y="1.5" width="6" height="6" rx="0.5" />
			<rect x="1.5" y="8.5" width="6" height="6" rx="0.5" />
			<rect x="8.5" y="8.5" width="6" height="6" rx="0.5" />
		</svg>
		<span class="label">Panorama</span>
	</button>
{/if}

<style>
	.trigger {
		appearance: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		flex: 0 0 auto;
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: transparent;
		color: var(--color-fg);
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			border-color 150ms ease,
			color 150ms ease;
	}
	.trigger:hover {
		color: var(--color-accent);
		border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
	}
	@media (max-width: 640px) {
		.trigger {
			padding: 0.4rem 0.55rem;
		}
		.label {
			display: none;
		}
	}
</style>
