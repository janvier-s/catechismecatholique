<script lang="ts">
	let { html }: { html: string } = $props();
</script>

<div class="citation-block mt-2 mb-4 ml-4 pl-4 border-l border-muted text-sm text-muted">
	{@html html}
</div>
