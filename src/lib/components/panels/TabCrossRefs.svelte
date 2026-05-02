<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraph } from '$lib/data/loaders';

	let crossRefs: string[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) return;
		(async () => {
			const p = await loadParagraph(ctx.paragraph);
			crossRefs = p.cross_refs;
		})();
	});
</script>

<div class="font-ui text-sm">
	{#if crossRefs.length === 0}
		<p class="text-muted italic">Aucun renvoi.</p>
	{:else}
		<ul class="flex flex-wrap gap-2">
			{#each crossRefs as ref (ref)}
				<li>
					<a href="/ccc/{ref}" class="text-accent hover:underline">§ {ref}</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
