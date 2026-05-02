<script lang="ts">
	type Verse = { v: number; text: string; cccCitations: number[] };
	let {
		bookSlug,
		chapter,
		verses
	}: { bookSlug: string; chapter: number; verses: Verse[] } = $props();
</script>

<ol class="space-y-2 font-body text-base leading-relaxed">
	{#each verses as v (v.v)}
		<li class="flex gap-3">
			<a
				href="/bible/{bookSlug}/{chapter}/{v.v}"
				class="flex-none w-8 text-right pt-0.5 font-ui text-sm font-semibold text-accent tabular-nums hover:underline"
			>
				{v.v}
			</a>
			<div class="flex-1">
				{v.text}
				{#if v.cccCitations.length > 0}
					<span class="ml-2 text-xs text-subtle">[{v.cccCitations.length} CEC]</span>
				{/if}
			</div>
		</li>
	{/each}
</ol>
