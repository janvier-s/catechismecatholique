<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadCitedBy } from '$lib/data/loaders';

	let citers: number[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) return;
		(async () => {
			const all = await loadCitedBy();
			citers = all[ctx.paragraph] ?? [];
		})();
	});
</script>

<div class="font-ui text-sm">
	{#if citers.length === 0}
		<p class="text-muted italic">Aucun paragraphe ne cite ce paragraphe.</p>
	{:else}
		<p class="text-muted text-xs mb-2">{citers.length} paragraphe(s) :</p>
		<ul class="flex flex-wrap gap-2">
			{#each citers as c (c)}
				<li>
					<a href="/ccc/{c}" class="text-accent hover:underline">§ {c}</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
