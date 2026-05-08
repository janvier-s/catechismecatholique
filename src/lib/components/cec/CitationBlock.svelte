<script lang="ts">
	import type { Snippet } from 'svelte';
	let { html, children }: { html?: string; children?: Snippet } = $props();
</script>

<div
	class="citation-block mt-2 mb-4 ml-4 pl-4 border-l border-muted font-body text-[15px] leading-[1.65] text-muted"
>
	{#if children}
		{@render children()}
	{:else if html}
		{@html html}
	{/if}
</div>
