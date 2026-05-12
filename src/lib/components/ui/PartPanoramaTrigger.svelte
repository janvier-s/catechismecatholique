<script lang="ts">
	import { getContext } from 'svelte';
	const ctx = getContext<
		| {
				open: () => void;
				partTitle?: string;
				partNumber?: number;
				isPrologue?: boolean;
		  }
		| undefined
	>('part-panorama');
	const tooltip = $derived.by(() => {
		if (!ctx?.partTitle) return 'Panorama de cette partie';
		if (ctx.isPrologue) return `Panorama du Prologue : « ${ctx.partTitle} »`;
		const label = ctx.partNumber ? `la Partie ${ctx.partNumber}` : 'cette partie';
		return `Panorama de ${label} : « ${ctx.partTitle} »`;
	});
</script>

{#if ctx && !ctx.isPrologue}
	<button
		type="button"
		class="trigger"
		aria-haspopup="dialog"
		aria-label={tooltip}
		title={tooltip}
		onclick={() => ctx.open()}
	>
		<svg width="15" height="15" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
			<path
				d="M228.92,49.69a8,8,0,0,0-6.86-1.45L160.93,63.52,99.58,32.84a8,8,0,0,0-5.52-.6l-64,16A8,8,0,0,0,24,56V200a8,8,0,0,0,9.94,7.76l61.13-15.28,61.35,30.68A8.15,8.15,0,0,0,160,224a8,8,0,0,0,1.94-.24l64-16A8,8,0,0,0,232,200V56A8,8,0,0,0,228.92,49.69ZM104,52.94l48,24V203.06l-48-24ZM40,62.25l48-12v127.5l-48,12Zm176,131.5-48,12V78.25l48-12Z"
			/>
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
