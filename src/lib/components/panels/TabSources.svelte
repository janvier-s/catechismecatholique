<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraph } from '$lib/data/loaders';
	import type { MagisterialRefRecord } from '$lib/data/types';

	let refs: MagisterialRefRecord[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) return;
		(async () => {
			const p = await loadParagraph(ctx.paragraph);
			refs = p.magisterial_refs.filter(
				(r) => r.type === 'magisterial' || r.type === 'patristic' || r.type === 'liturgical'
			);
		})();
	});
</script>

<div class="font-ui text-sm">
	{#if refs.length === 0}
		<p class="text-muted italic">Aucune source.</p>
	{:else}
		<ul class="space-y-2">
			{#each refs as ref, i (i)}
				<li class="flex gap-2">
					<span class="text-muted text-xs uppercase tracking-wider w-20 flex-none">{ref.type}</span>
					<span class="flex-1">{ref.raw}</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
