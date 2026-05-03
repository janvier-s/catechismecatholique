<script lang="ts">
	let {
		dimNonCited = $bindable(false),
		showConcordance = $bindable(true),
		citedCount = 0,
		concordanceCount = 0
	}: {
		dimNonCited?: boolean;
		showConcordance?: boolean;
		citedCount?: number;
		concordanceCount?: number;
	} = $props();
</script>

<div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-ui text-xs text-muted">
	<label class="flex cursor-pointer items-center gap-2 hover:text-accent">
		<input
			type="checkbox"
			bind:checked={dimNonCited}
			class="accent-accent"
			disabled={citedCount === 0}
		/>
		Atténuer les versets sans référence du Catéchisme
	</label>

	<label
		class="flex cursor-pointer items-center gap-2 hover:text-accent"
		class:opacity-50={concordanceCount === 0}
	>
		<input
			type="checkbox"
			bind:checked={showConcordance}
			class="accent-accent"
			disabled={concordanceCount === 0}
		/>
		Afficher la concordance
	</label>

	{#if citedCount === 0 && concordanceCount === 0}
		<span class="italic">Aucun verset de ce chapitre n'a de référence.</span>
	{/if}
</div>
