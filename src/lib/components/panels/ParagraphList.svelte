<script lang="ts">
	import { loadParagraph } from '$lib/data/loaders';
	import type { Paragraph } from '$lib/data/types';
	import ParagraphRenderer from '../ccc/ParagraphRenderer.svelte';

	let {
		numbers,
		emptyMessage = 'Aucun paragraphe.'
	}: { numbers: number[]; emptyMessage?: string } = $props();

	let paragraphs: Paragraph[] = $state([]);

	$effect(() => {
		(async () => {
			paragraphs = await Promise.all(numbers.map((n) => loadParagraph(n)));
		})();
	});
</script>

{#if numbers.length === 0}
	<p class="text-muted italic font-ui text-sm">{emptyMessage}</p>
{:else}
	<div class="space-y-4">
		{#each paragraphs as p (p.number)}
			<div class="flex gap-3">
				<a
					href="/ccc/{p.number}"
					class="flex-none w-10 text-right pt-0.5 text-xs font-semibold text-accent tabular-nums hover:underline font-ui"
				>
					{p.number}
				</a>
				<div class="flex-1 text-[13px] leading-relaxed">
					<ParagraphRenderer html={p.text_html} paragraphNumber={p.number} />
				</div>
			</div>
		{/each}
	</div>
{/if}
