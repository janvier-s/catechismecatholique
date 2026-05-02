<script lang="ts">
	let { html }: { html: string } = $props();
	let containerEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (!containerEl) return;
		// Re-run when html changes
		void html;
		const sups = containerEl.querySelectorAll<HTMLElement>('sup.srcRef.cccRef');
		for (const sup of sups) {
			// Strip the leading § from the source text — we'll re-add it via CSS only on lead refs.
			sup.textContent = (sup.textContent ?? '').replace(/^§/, '');
			const prev = sup.previousSibling;
			const isContinuation = prev instanceof Element && prev.matches('sup.srcRef.cccRef');
			if (isContinuation) {
				sup.before(document.createTextNode(', '));
			} else {
				sup.classList.add('lead');
			}
		}
	});
</script>

<div bind:this={containerEl} class="prose-paragraph leading-relaxed text-lg">
	{@html html}
</div>

<style>
	.prose-paragraph :global(sup.srcRef) {
		color: var(--color-accent);
		font-size: 0.7em;
		margin-left: 0.1em;
		cursor: help;
	}
	.prose-paragraph :global(sup.srcRef.cccRef.lead::before) {
		content: '§';
	}
</style>
