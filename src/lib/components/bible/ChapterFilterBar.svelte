<script lang="ts">
	let {
		dimNonCited = $bindable(false),
		citedCount
	}: { dimNonCited?: boolean; citedCount: number } = $props();
</script>

<div class="mb-4 flex items-center gap-3 font-ui text-xs text-muted">
	<label class="flex cursor-pointer items-center gap-2 hover:text-accent">
		<input
			type="checkbox"
			bind:checked={dimNonCited}
			class="accent-accent"
			disabled={citedCount === 0}
		/>
		Atténuer les versets sans référence au Catéchisme
	</label>
	{#if citedCount === 0}
		<span class="italic">Aucun verset de ce chapitre n'est cité par le Catéchisme.</span>
	{/if}
</div>
