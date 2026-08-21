<script lang="ts">
	let { studyMode = $bindable(true), citedCount }: { studyMode?: boolean; citedCount: number } =
		$props();
</script>

{#if citedCount > 0}
	<div class="mb-6 flex justify-center">
		<div class="mode-pill" role="group" aria-label="Basculer les annotations du Catéchisme">
			<button
				type="button"
				class="pill-option"
				class:is-active={!studyMode}
				onclick={() => (studyMode = false)}
			>
				Lecture
			</button>
			<button
				type="button"
				class="pill-option"
				class:is-active={studyMode}
				onclick={() => (studyMode = true)}
			>
				Étude
			</button>
		</div>
	</div>
{/if}

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
</style>
