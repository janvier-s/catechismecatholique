<script lang="ts">
	import type { ConcordancePericope } from '$lib/data/types';

	let {
		pericope,
		highlighted = false
	}: { pericope: ConcordancePericope; highlighted?: boolean } = $props();
</script>

<article
	class="rounded-sm border transition-colors duration-150
		{highlighted ? 'border-accent/40 bg-accent/5' : 'border-border bg-panel'}"
>
	<div class="px-sm pt-sm pb-[6px]">
		<div class="flex items-baseline gap-2 flex-wrap">
			<span class="text-[12px] font-semibold uppercase tracking-[0.1em] text-accent">
				{pericope.verseRef}
			</span>
			{#if pericope.pericopeTitle}
				<span class="text-[12px] text-foreground/80">— {pericope.pericopeTitle}</span>
			{/if}
		</div>
		<div class="w-[24px] h-[2px] bg-accent/50 mt-[5px] rounded-full"></div>
	</div>
	<div class="px-sm pb-sm pt-[6px] flex flex-wrap gap-[4px]">
		{#each pericope.ccc as p (p)}
			<a
				href="/ccc/{p}"
				class="font-ui text-[11px] text-accent border border-accent/30 rounded-[3px] px-[6px] py-[1px] hover:bg-accent/10 transition-colors"
				>§{p}</a
			>
		{/each}
	</div>
</article>
