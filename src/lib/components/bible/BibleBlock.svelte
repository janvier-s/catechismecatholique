<script lang="ts">
	import type { NclBlock } from '$lib/data/types';
	import { prefs } from '$lib/stores/prefs';

	let { block }: { block: NclBlock } = $props();
</script>

{#if block.kind === 'prose'}
	<p class="bible-prose">
		{#each block.verses as rv, vi (rv.v)}{#if !$prefs.hideVerseNumbers}<sup
					class="vn"
					class:vn-subtle={$prefs.verseNumberColor === 'subtle'}>{rv.v}</sup
				>{:else}{vi > 0 ? ' ' : ''}{/if}{@html rv.html}
		{/each}
	</p>
{:else}
	<div
		class="bible-poetry-line"
		class:stanza-break={block.stanzaBreak}
		style="--level: {block.level}"
	>
		{#each block.verses as rv, vi (rv.v)}{#if !$prefs.hideVerseNumbers}<sup
					class="vn"
					class:vn-subtle={$prefs.verseNumberColor === 'subtle'}>{rv.v}</sup
				>{:else}{vi > 0 ? ' ' : ''}{/if}{@html rv.html}
		{/each}
	</div>
{/if}

<style>
	.bible-prose {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.7);
		margin-bottom: 1rem;
	}
	.bible-poetry-line {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.7);
		margin-left: calc((var(--level, 1) - 1) * 1.5rem);
	}
	.bible-poetry-line.stanza-break {
		margin-top: 1rem;
	}
	.vn {
		font-family: var(--font-ui);
		font-size: 0.65em;
		font-weight: 200;
		color: var(--color-accent);
		margin-right: 0.15em;
	}
	.vn.vn-subtle {
		color: var(--color-subtle);
	}
	.bible-prose :global(.dn),
	.bible-poetry-line :global(.dn) {
		font-variant: small-caps;
		letter-spacing: 0.02em;
	}
	.bible-prose :global(.add),
	.bible-poetry-line :global(.add) {
		font-style: italic;
	}
	.bible-prose :global(.selah),
	.bible-poetry-line :global(.selah) {
		font-style: italic;
		color: var(--color-muted);
	}
	.bible-prose :global(.qt),
	.bible-poetry-line :global(.qt) {
		font-variant: small-caps;
		letter-spacing: 0.02em;
	}
	.bible-prose :global(.it),
	.bible-poetry-line :global(.it) {
		font-style: italic;
	}
</style>
