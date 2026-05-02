<script lang="ts">
	import type { Paragraph } from '$lib/data/types';
	import ParagraphRenderer from './ParagraphRenderer.svelte';
	let { paragraphs }: { paragraphs: Paragraph[] } = $props();
</script>

<aside
	id="en-bref-{paragraphs[0]?.number ?? 'block'}"
	class="en-bref my-12 rounded-lg p-6 scroll-mt-24"
	aria-labelledby="en-bref-label-{paragraphs[0]?.number ?? 'block'}"
>
	<p
		id="en-bref-label-{paragraphs[0]?.number ?? 'block'}"
		class="font-ui text-xs uppercase tracking-[0.2em] text-muted font-bold mb-4"
	>
		En Bref
	</p>
	{#each paragraphs as p (p.number)}
		<div class="flex gap-4 mb-3 last:mb-0">
			<a
				href="/ccc/{p.number}"
				class="flex-none w-12 text-right pt-1 font-ui font-semibold text-accent tabular-nums hover:underline text-sm"
				aria-label="Lien vers le paragraphe {p.number}"
			>
				{p.number}
			</a>
			<div class="flex-1 text-[0.95em]">
				<ParagraphRenderer html={p.text_html} />
			</div>
		</div>
	{/each}
</aside>

<style>
	.en-bref {
		background: color-mix(in srgb, var(--color-fg) 7%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-fg) 10%, transparent);
	}
</style>
