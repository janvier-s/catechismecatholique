<script lang="ts">
	import { get } from 'svelte/store';
	import { loadParagraph } from '$lib/data/loaders';
	import type { Paragraph } from '$lib/data/types';
	import { studyPanel, openPanel } from '$lib/stores/studyPanel';
	import ParagraphRenderer from '../cec/ParagraphRenderer.svelte';
	import CitationBlock from '../cec/CitationBlock.svelte';

	let {
		numbers,
		emptyMessage = 'Aucun paragraphe.',
		loaded = true
	}: { numbers: number[]; emptyMessage?: string; loaded?: boolean } = $props();

	let paragraphs: Paragraph[] = $state([]);

	$effect(() => {
		(async () => {
			paragraphs = await Promise.all(numbers.map((n) => loadParagraph(n)));
		})();
	});

	function onEntryNumberClick(n: number) {
		const s = get(studyPanel);
		openPanel({ kind: 'paragraph', paragraph: n }, s.activeTab);
	}
</script>

{#if !loaded}
	<p class="text-muted italic font-ui text-sm" aria-hidden="true">&nbsp;</p>
{:else if numbers.length === 0}
	<p class="text-muted italic font-ui text-sm">{emptyMessage}</p>
{:else}
	<div class="space-y-5">
		{#each paragraphs as p (p.number)}
			<div>
				<a
					href="/cec/{p.number}"
					onclick={() => onEntryNumberClick(p.number)}
					class="block mb-1 text-sm font-semibold text-accent tabular-nums hover:underline font-ui"
				>
					CEC {p.number}
				</a>
				<div class="font-body text-[15px] leading-relaxed">
					<ParagraphRenderer
						html={p.text_html}
						bibleRefs={p.magisterial_refs}
						paragraphNumber={p.number}
						inPanel
					/>
					{#each p.citations as cite, i (i)}
						<CitationBlock html={cite.text_html} />
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}
