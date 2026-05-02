<script lang="ts">
	let { html }: { html: string } = $props();
</script>

<div class="prose-paragraph leading-relaxed text-lg">
	{@html html}
</div>

<style>
	.prose-paragraph :global(sup.srcRef) {
		color: var(--color-accent);
		font-size: 0.7em;
		margin-left: 0.1em;
		cursor: help;
	}
	.prose-paragraph :global(sup.srcRef.cccRef::before) {
		content: '§';
	}
</style>
