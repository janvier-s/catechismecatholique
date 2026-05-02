<script lang="ts">
	import { get } from 'svelte/store';
	import type { Paragraph } from '$lib/data/types';
	import ParagraphRenderer from './ParagraphRenderer.svelte';
	import CitationBlock from './CitationBlock.svelte';
	import { studyPanel, openPanel } from '$lib/stores/studyPanel';
	let { paragraph }: { paragraph: Paragraph } = $props();

	function onNumberClick() {
		const s = get(studyPanel);
		openPanel({ paragraph: paragraph.number }, s.activeTab ?? 'cross-refs');
	}
</script>

<article class="mb-8">
	<div class="flex gap-4">
		<a
			href="/ccc/{paragraph.number}"
			onclick={onNumberClick}
			class="flex-none w-12 text-right pt-1 font-ui font-semibold text-accent tabular-nums hover:underline"
			aria-label="Lien vers le paragraphe {paragraph.number}"
		>
			{paragraph.number}
		</a>
		<div class="flex-1 text-lg">
			<ParagraphRenderer
				html={paragraph.text_html}
				bibleRefs={paragraph.magisterial_refs}
				paragraphNumber={paragraph.number}
			/>
			{#each paragraph.citations as cite, i (i)}
				<CitationBlock html={cite.text_html} />
			{/each}
		</div>
	</div>
</article>
