<script lang="ts">
	import type { EnBrefBlock, Paragraph } from '$lib/data/types';
	import ParagraphRenderer from './ParagraphRenderer.svelte';
	let {
		enBref,
		paragraphs = []
	}: { enBref: EnBrefBlock; paragraphs?: Paragraph[] } = $props();
</script>

<aside
	class="mt-16 rounded-lg border-l-4 border-accent bg-panel/60 p-6"
	aria-labelledby="en-bref-title"
>
	<p
		id="en-bref-title"
		class="font-ui text-xs uppercase tracking-[0.2em] text-accent font-bold mb-4"
	>
		En Bref
	</p>
	{#if paragraphs.length > 0}
		{#each paragraphs as p (p.number)}
			<div class="flex gap-4 mb-4 last:mb-0">
				<a
					href="/ccc/{p.number}"
					class="flex-none w-12 text-right pt-1 font-ui font-semibold text-accent tabular-nums hover:underline"
					aria-label="Lien vers le paragraphe {p.number}"
				>
					{p.number}
				</a>
				<div class="flex-1 text-sm">
					<ParagraphRenderer html={p.text_html} />
				</div>
			</div>
		{/each}
	{:else}
		<p class="text-sm text-muted">Paragraphes : {enBref.paragraphs.join(', ')}</p>
	{/if}
</aside>
