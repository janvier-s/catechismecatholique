<script lang="ts">
	import { get } from 'svelte/store';
	import { loadParagraph } from '$lib/data/loaders';
	import type { Paragraph } from '$lib/data/types';
	import { studyPanel, openPanel } from '$lib/stores/studyPanel';
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

	function onEntryNumberClick(n: number) {
		const s = get(studyPanel);
		openPanel({ paragraph: n }, s.activeTab ?? 'cross-refs');
	}
</script>

{#if numbers.length === 0}
	<p class="text-muted italic font-ui text-sm">{emptyMessage}</p>
{:else}
	<div class="space-y-5">
		{#each paragraphs as p (p.number)}
			<div>
				<a
					href="/ccc/{p.number}"
					onclick={() => onEntryNumberClick(p.number)}
					class="block mb-1 text-sm font-semibold text-accent tabular-nums hover:underline font-ui"
				>
					CEC {p.number}
				</a>
				<div class="font-body text-[15px] leading-relaxed">
					<ParagraphRenderer html={p.text_html} paragraphNumber={p.number} />
				</div>
			</div>
		{/each}
	</div>
{/if}
